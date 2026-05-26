const { getModel, toFeatureVector } = require('./randomForest');

// Consecutive HIGH streak tracker per city (in-memory)
const highStreaks = {};

// ── Rule Engine ─────────────────────────────────────────────────────────────
function applyRules(current, features) {
  const reasons = [];
  let ruleLevel = 'LOW';

  const escalate = (level) => {
    if (level === 'HIGH') ruleLevel = 'HIGH';
    else if (level === 'MED' && ruleLevel !== 'HIGH') ruleLevel = 'MED';
  };

  if (current.temp > 42) {
    reasons.push(`Extreme heat: ${current.temp.toFixed(1)}°C (IMD severe threshold: 45°C)`);
    escalate('HIGH');
  } else if (current.temp > 38) {
    reasons.push(`High heat: ${current.temp.toFixed(1)}°C (IMD warning threshold: 40°C)`);
    escalate('MED');
  }

  if (features.rainfall_intensity > 40) {
    reasons.push(`Heavy rainfall: ${features.rainfall_intensity.toFixed(1)} mm/6h (IMD: >64.5mm/day = heavy)`);
    escalate('HIGH');
  } else if (features.rainfall_intensity > 15) {
    reasons.push(`Moderate rainfall: ${features.rainfall_intensity.toFixed(1)} mm/6h`);
    escalate('MED');
  }

  if (current.wind_speed > 20) {
    reasons.push(`Storm-level winds: ${current.wind_speed.toFixed(1)} m/s (>72 km/h = cyclonic storm)`);
    escalate('HIGH');
  } else if (current.wind_speed > 13) {
    reasons.push(`High winds: ${current.wind_speed.toFixed(1)} m/s (>47 km/h = strong breeze)`);
    escalate('MED');
  }

  if (current.humidity > 85 && current.temp > 35) {
    reasons.push(`Heat-humidity stress: ${current.temp.toFixed(1)}°C / ${current.humidity}% (wet-bulb danger zone)`);
    escalate('HIGH');
  }

  if (current.visibility < 1000) {
    reasons.push(`Very low visibility: ${current.visibility}m (fog/smoke/dust risk)`);
    escalate('MED');
  }

  return { ruleLevel, reasons };
}

// ── Hybrid Risk Engine ───────────────────────────────────────────────────────
function computeRisk(city, current, features) {
  // 1. Rule-based pass
  const { ruleLevel, reasons } = applyRules(current, features);

  // 2. Random Forest pass
  const model = getModel();
  const featureVector = toFeatureVector(current, features);
  const { votes, probabilities, rfScore } = model.predictProba(featureVector);
  const rfPrediction = Object.entries(votes).sort((a, b) => b[1] - a[1])[0][0];

  // 3. Combine: HIGH rule forces RF score floor to 0.65
  let finalScore = rfScore;
  if (ruleLevel === 'HIGH') finalScore = Math.max(finalScore, 0.65);
  else if (ruleLevel === 'MED') finalScore = Math.max(finalScore, 0.35);

  // 4. Map to level
  let finalLevel;
  if (finalScore >= 0.66) finalLevel = 'HIGH';
  else if (finalScore >= 0.33) finalLevel = 'MED';
  else finalLevel = 'LOW';

  // 5. Smoothing — 3 consecutive HIGHs trigger alert
  if (!highStreaks[city]) highStreaks[city] = 0;
  highStreaks[city] = finalLevel === 'HIGH' ? highStreaks[city] + 1 : 0;
  const alertTriggered = highStreaks[city] >= 3;

  // 6. Feature importances from RF
  const featureContributions = model.featureNames.map((name, i) => ({
    feature: name,
    normalizedValue: parseFloat(featureVector[i].toFixed(4)),
    importance: parseFloat(model.featureImportances[i].toFixed(4)),
  }));

  return {
    riskScore: parseFloat(finalScore.toFixed(3)),
    riskLevel: finalLevel,
    reasons,
    consecutiveHighCount: highStreaks[city],
    alertTriggered,
    engine: {
      rule: { prediction: ruleLevel },
      rf: {
        prediction: rfPrediction,
        votes,
        probabilities: {
          LOW:  parseFloat(probabilities.LOW.toFixed(3)),
          MED:  parseFloat(probabilities.MED.toFixed(3)),
          HIGH: parseFloat(probabilities.HIGH.toFixed(3)),
        },
        nTrees: model.nTrees,
        featureContributions,
        trainingAccuracy: model.trainAccuracy,
      },
      combination: 'Rule HIGH → RF floor 0.65; Rule MED → RF floor 0.35',
      finalScore: parseFloat(finalScore.toFixed(3)),
    },
  };
}

module.exports = { computeRisk };
