const cron = require('node-cron');
const { fetchWeatherData } = require('./weatherService');
const { engineerFeatures } = require('./featureEngine');
const { computeRisk } = require('./riskEngine');
const WeatherReading = require('../models/WeatherReading');
const ClimateAlert = require('../models/ClimateAlert');

const monitoredCities = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata'];
let lastRun = null;
let isRunning = false;

async function processCity(city) {
  try {
    const { city: resolvedCity, current, forecast } = await fetchWeatherData(city);
    const features = engineerFeatures(current, forecast);
    const risk = computeRisk(resolvedCity, current, features);

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
      console.log(`[ClimateGuard] ALERT fired for ${resolvedCity} — score ${risk.riskScore}`);
    }
  } catch (err) {
    console.error(`[ClimateGuard] Error processing ${city}:`, err.message);
  }
}

function startScheduler() {
  // Run every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    if (isRunning) return;
    isRunning = true;
    lastRun = new Date();
    console.log('[ClimateGuard] Scheduled fetch started:', lastRun.toISOString());
    for (const city of monitoredCities) {
      await processCity(city);
    }
    isRunning = false;
  });

  // Also run once immediately on startup after a 3-second delay
  setTimeout(async () => {
    isRunning = true;
    lastRun = new Date();
    console.log('[ClimateGuard] Initial fetch on startup...');
    for (const city of monitoredCities) {
      await processCity(city);
    }
    isRunning = false;
  }, 3000);
}

function getSchedulerStatus() {
  return {
    active: true,
    monitoredCities,
    lastRun: lastRun ? lastRun.toISOString() : null,
    nextRunIn: '30 minutes (cron)',
  };
}

module.exports = { startScheduler, getSchedulerStatus, processCity };
