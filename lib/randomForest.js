/**
 * Random Forest Classifier — implemented from scratch
 * Algorithm: CART (Classification and Regression Trees)
 * Ensemble: Bootstrap aggregation (Bagging) + Random feature subsets
 * Split criterion: Gini Impurity
 */

class DecisionNode {
  constructor({ featureIdx = null, threshold = null, left = null, right = null, prediction = null, giniGain = 0 } = {}) {
    this.featureIdx = featureIdx;
    this.threshold = threshold;
    this.left = left;
    this.right = right;
    this.prediction = prediction; // non-null only at leaf
    this.giniGain = giniGain;
  }
  isLeaf() { return this.prediction !== null; }
}

class DecisionTree {
  constructor(maxDepth = 8, minSamples = 4, nFeatures = null) {
    this.maxDepth = maxDepth;
    this.minSamples = minSamples;
    this.nFeatures = nFeatures;
    this.root = null;
    this.featureImportances = null;
    this.nTotalFeatures = 0;
  }

  gini(labels) {
    const n = labels.length;
    if (n === 0) return 0;
    const counts = {};
    for (const l of labels) counts[l] = (counts[l] || 0) + 1;
    return 1 - Object.values(counts).reduce((sum, c) => sum + (c / n) ** 2, 0);
  }

  majorityClass(labels) {
    const counts = {};
    for (const l of labels) counts[l] = (counts[l] || 0) + 1;
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  }

  sampleFeatures(n) {
    const all = Array.from({ length: n }, (_, i) => i);
    const k = this.nFeatures || Math.max(1, Math.floor(Math.sqrt(n)));
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [all[i], all[j]] = [all[j], all[i]];
    }
    return all.slice(0, k);
  }

  bestSplit(X, y, featureIndices) {
    const parentGini = this.gini(y);
    let bestGain = 0, bestFi = null, bestThresh = null;
    const n = y.length;

    for (const fi of featureIndices) {
      // Collect sorted unique midpoints as candidate thresholds
      const vals = X.map(r => r[fi]).sort((a, b) => a - b);
      const seen = new Set();
      for (let i = 0; i < vals.length - 1; i++) {
        const t = (vals[i] + vals[i + 1]) / 2;
        if (seen.has(t)) continue;
        seen.add(t);

        const leftY = [], rightY = [];
        for (let j = 0; j < n; j++) {
          (X[j][fi] <= t ? leftY : rightY).push(y[j]);
        }
        if (leftY.length === 0 || rightY.length === 0) continue;

        const gain = parentGini
          - (leftY.length / n) * this.gini(leftY)
          - (rightY.length / n) * this.gini(rightY);

        if (gain > bestGain) {
          bestGain = gain;
          bestFi = fi;
          bestThresh = t;
        }
      }
    }
    return { fi: bestFi, threshold: bestThresh, gain: bestGain };
  }

  buildTree(X, y, depth, importances) {
    if (
      depth >= this.maxDepth ||
      y.length <= this.minSamples ||
      new Set(y).size === 1
    ) {
      return new DecisionNode({ prediction: this.majorityClass(y) });
    }

    const featureIndices = this.sampleFeatures(X[0].length);
    const { fi, threshold, gain } = this.bestSplit(X, y, featureIndices);

    if (fi === null || gain <= 0) {
      return new DecisionNode({ prediction: this.majorityClass(y) });
    }

    // Accumulate feature importance (weighted by # samples)
    importances[fi] += gain * y.length;

    const leftX = [], leftY = [], rightX = [], rightY = [];
    for (let i = 0; i < y.length; i++) {
      if (X[i][fi] <= threshold) { leftX.push(X[i]); leftY.push(y[i]); }
      else { rightX.push(X[i]); rightY.push(y[i]); }
    }

    return new DecisionNode({
      featureIdx: fi,
      threshold,
      giniGain: gain,
      left: this.buildTree(leftX, leftY, depth + 1, importances),
      right: this.buildTree(rightX, rightY, depth + 1, importances),
    });
  }

  fit(X, y) {
    this.nTotalFeatures = X[0].length;
    const importances = new Array(this.nTotalFeatures).fill(0);
    this.root = this.buildTree(X, y, 0, importances);
    // Normalize importances
    const total = importances.reduce((s, v) => s + v, 0) || 1;
    this.featureImportances = importances.map(v => v / total);
    return this;
  }

  predictSample(x, node = this.root) {
    if (node.isLeaf()) return node.prediction;
    return x[node.featureIdx] <= node.threshold
      ? this.predictSample(x, node.left)
      : this.predictSample(x, node.right);
  }
}

class RandomForest {
  constructor(nTrees = 100, maxDepth = 8, minSamples = 4) {
    this.nTrees = nTrees;
    this.maxDepth = maxDepth;
    this.minSamples = minSamples;
    this.trees = [];
    this.classes = ['LOW', 'MED', 'HIGH'];
    this.featureNames = ['temp', 'humidity', 'wind_speed', 'rainfall_intensity', 'visibility_score'];
    this.featureImportances = new Array(5).fill(0);
    this.trainAccuracy = 0;
    this.trained = false;
  }

  bootstrap(X, y) {
    const n = X.length;
    const Xi = [], yi = [];
    for (let i = 0; i < n; i++) {
      const idx = Math.floor(Math.random() * n);
      Xi.push(X[idx]);
      yi.push(y[idx]);
    }
    return { X: Xi, y: yi };
  }

  fit(X, y) {
    const nFeat = Math.max(1, Math.floor(Math.sqrt(X[0].length)));
    this.trees = [];
    const allImportances = new Array(X[0].length).fill(0);

    for (let i = 0; i < this.nTrees; i++) {
      const { X: bX, y: bY } = this.bootstrap(X, y);
      const tree = new DecisionTree(this.maxDepth, this.minSamples, nFeat);
      tree.fit(bX, bY);
      this.trees.push(tree);
      tree.featureImportances.forEach((imp, fi) => { allImportances[fi] += imp; });
    }

    // Average importances across trees
    this.featureImportances = allImportances.map(v => v / this.nTrees);

    // Compute training accuracy
    let correct = 0;
    for (let i = 0; i < X.length; i++) {
      if (this.predict(X[i]) === y[i]) correct++;
    }
    this.trainAccuracy = correct / X.length;
    this.trained = true;
    return this;
  }

  predictProba(x) {
    const votes = { LOW: 0, MED: 0, HIGH: 0 };
    for (const tree of this.trees) {
      const pred = tree.predictSample(x);
      votes[pred] = (votes[pred] || 0) + 1;
    }
    return {
      votes,
      probabilities: {
        LOW:  votes.LOW  / this.nTrees,
        MED:  votes.MED  / this.nTrees,
        HIGH: votes.HIGH / this.nTrees,
      },
      rfScore: (votes.MED * 0.5 + votes.HIGH) / this.nTrees,
    };
  }

  predict(x) {
    const { votes } = this.predictProba(x);
    return Object.entries(votes).sort((a, b) => b[1] - a[1])[0][0];
  }

  modelInfo() {
    return {
      algorithm: 'Random Forest Classifier',
      nTrees: this.nTrees,
      maxDepth: this.maxDepth,
      splitCriterion: 'Gini Impurity',
      featureSubsampling: `sqrt(${this.featureNames.length}) = ${Math.floor(Math.sqrt(this.featureNames.length))} features/split`,
      bootstrapSampling: true,
      trainingAccuracy: `${(this.trainAccuracy * 100).toFixed(1)}%`,
      features: this.featureNames.map((name, i) => ({
        name,
        importance: parseFloat(this.featureImportances[i].toFixed(4)),
        importancePct: `${(this.featureImportances[i] * 100).toFixed(1)}%`,
      })),
    };
  }
}

// ── Synthetic Training Data (IMD-standard thresholds) ──────────────────────
function generateTrainingData() {
  const X = [], y = [];
  const rand = (min, max) => min + Math.random() * (max - min);

  // HIGH: 250 samples across 4 hazard scenarios
  for (let i = 0; i < 250; i++) {
    const s = i % 4;
    let temp, hum, wind, rain, vis;
    if (s === 0) { // heatwave (IMD: ≥45°C = severe)
      temp = rand(42, 52); hum = rand(20, 70); wind = rand(0, 12); rain = rand(0, 8); vis = rand(4000, 10000);
    } else if (s === 1) { // extreme rainfall / flood
      temp = rand(22, 35); hum = rand(80, 100); wind = rand(8, 18); rain = rand(40, 80); vis = rand(500, 4000);
    } else if (s === 2) { // cyclone / storm (IMD: wind ≥89 kmh = severe)
      temp = rand(20, 32); hum = rand(65, 95); wind = rand(20, 35); rain = rand(15, 50); vis = rand(300, 3000);
    } else { // heat-humidity combined stress (wet bulb >35°C equivalent)
      temp = rand(36, 44); hum = rand(85, 100); wind = rand(0, 10); rain = rand(0, 25); vis = rand(2000, 8000);
    }
    X.push([temp, hum, wind, rain, 1 - Math.min(1, vis / 10000)]);
    y.push('HIGH');
  }

  // MED: 250 samples — elevated but sub-threshold conditions
  for (let i = 0; i < 250; i++) {
    const temp = rand(30, 42);
    const hum  = rand(55, 88);
    const wind = rand(8, 20);
    const rain = rand(10, 40);
    const vis  = rand(1500, 7000);
    X.push([temp, hum, wind, rain, 1 - Math.min(1, vis / 10000)]);
    y.push('MED');
  }

  // LOW: 250 samples — benign conditions
  for (let i = 0; i < 250; i++) {
    const temp = rand(10, 32);
    const hum  = rand(15, 60);
    const wind = rand(0, 9);
    const rain = rand(0, 10);
    const vis  = rand(6000, 10000);
    X.push([temp, hum, wind, rain, 1 - Math.min(1, vis / 10000)]);
    y.push('LOW');
  }

  // Shuffle
  for (let i = X.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [X[i], X[j]] = [X[j], X[i]];
    [y[i], y[j]] = [y[j], y[i]];
  }
  return { X, y };
}

// ── Singleton model — trained once on startup ──────────────────────────────
let _model = null;

function getModel() {
  if (!_model) {
    console.log('[RF] Training Random Forest (100 trees, 750 samples)...');
    const t0 = Date.now();
    const { X, y } = generateTrainingData();
    _model = new RandomForest(100, 8, 4);
    _model.fit(X, y);
    console.log(`[RF] Training complete in ${Date.now() - t0}ms | Accuracy: ${(_model.trainAccuracy * 100).toFixed(1)}%`);
  }
  return _model;
}

function toFeatureVector(current, features) {
  return [
    current.temp,
    current.humidity,
    current.wind_speed,
    features.rainfall_intensity,
    1 - Math.min(1, current.visibility / 10000), // invert: lower vis = higher risk
  ];
}

module.exports = { getModel, toFeatureVector };
