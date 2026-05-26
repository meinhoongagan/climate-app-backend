const express = require('express');
const router = express.Router();
const { fetchWeatherData } = require('../lib/weatherService');
const { engineerFeatures } = require('../lib/featureEngine');
const { computeRisk } = require('../lib/riskEngine');
const { getSchedulerStatus, processCity } = require('../lib/scheduler');
const { getModel } = require('../lib/randomForest');
const WeatherReading = require('../models/WeatherReading');
const ClimateAlert = require('../models/ClimateAlert');

// GET /api/climate-guard/health
router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'ClimateGuard', timestamp: new Date().toISOString() });
});

// GET /api/climate-guard/risk/:city  — live analysis
router.get('/risk/:city', async (req, res) => {
  try {
    const city = req.params.city;
    const { city: resolvedCity, current, forecast } = await fetchWeatherData(city);
    const features = engineerFeatures(current, forecast);
    const risk = computeRisk(resolvedCity, current, features);

    // Persist the reading (skip if DB unavailable)
    try {
      const reading = new WeatherReading({
        city: resolvedCity,
        current,
        forecast,
        features,
        riskScore: risk.riskScore,
        riskLevel: risk.riskLevel,
        reasons: risk.reasons,
      });
      await reading.save();

      if (risk.alertTriggered) {
        const alert = new ClimateAlert({
          city: resolvedCity,
          riskScore: risk.riskScore,
          riskLevel: risk.riskLevel,
          reasons: risk.reasons,
          consecutiveHighCount: risk.consecutiveHighCount,
          weatherSnapshot: {
            temp: current.temp,
            humidity: current.humidity,
            wind_speed: current.wind_speed,
            rainfall_intensity: features.rainfall_intensity,
          },
        });
        await alert.save();
      }
    } catch (dbErr) {
      console.warn('[ClimateGuard] DB save skipped:', dbErr.message);
    }

    res.json({
      city: resolvedCity,
      timestamp: new Date().toISOString(),
      current,
      forecast: forecast.slice(0, 8),
      features,
      risk,
    });
  } catch (err) {
    const status = err.response?.status === 404 ? 404 : 500;
    res.status(status).json({ error: err.response?.data?.message || err.message });
  }
});

// POST /api/climate-guard/analyze  — analyze custom weather payload (body: {city, temp, humidity, wind_speed, visibility, rainfall_1h})
router.post('/analyze', async (req, res) => {
  try {
    const { city = 'Custom', temp, humidity, wind_speed, visibility = 10000, rainfall_1h = 0 } = req.body;
    const current = { temp, humidity, wind_speed, visibility, rainfall_1h, description: 'manual', icon: '01d' };
    const features = engineerFeatures(current, []);
    const risk = computeRisk(city, current, features);
    res.json({ city, current, features, risk });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/climate-guard/history/:city  — last 20 readings
router.get('/history/:city', async (req, res) => {
  try {
    const readings = await WeatherReading.find({ city: new RegExp(req.params.city, 'i') })
      .sort({ timestamp: -1 })
      .limit(20)
      .lean();
    res.json(readings);
  } catch (err) {
    res.json([]);
  }
});

// GET /api/climate-guard/alerts/:city  — last 10 fired alerts
router.get('/alerts/:city', async (req, res) => {
  try {
    const alerts = await ClimateAlert.find({ city: new RegExp(req.params.city, 'i') })
      .sort({ triggeredAt: -1 })
      .limit(10)
      .lean();
    res.json(alerts);
  } catch (err) {
    res.json([]);
  }
});

// GET /api/climate-guard/model-info
router.get('/model-info', (req, res) => {
  const model = getModel();
  res.json({
    type: 'Hybrid (Rule-Based + Random Forest)',
    rules: [
      'temp > 42°C → HIGH (IMD severe heatwave threshold)',
      'rainfall_intensity > 40mm/6h → HIGH (IMD heavy rainfall)',
      'wind_speed > 20 m/s → HIGH (cyclonic storm)',
      'humidity > 85% AND temp > 35°C → HIGH (wet-bulb stress)',
      'visibility < 1000m → MED (fog/smoke)',
    ],
    ml: model.modelInfo(),
    levels: { LOW: 'score < 0.33', MED: 'score 0.33–0.66', HIGH: 'score > 0.66' },
    smoothing: '3 consecutive HIGH readings trigger persisted alert',
  });
});

// GET /api/climate-guard/scheduler/status
router.get('/scheduler/status', (req, res) => {
  res.json(getSchedulerStatus());
});

// POST /api/climate-guard/scheduler/trigger  — manually trigger a fetch for all cities
router.post('/scheduler/trigger', async (req, res) => {
  const { city } = req.body;
  if (city) {
    await processCity(city);
    res.json({ message: `Triggered for ${city}` });
  } else {
    res.json({ message: 'Use the /risk/:city endpoint for on-demand fetches' });
  }
});

module.exports = router;
