const mongoose = require('mongoose');

const WeatherReadingSchema = new mongoose.Schema({
  city: { type: String, required: true, index: true },
  timestamp: { type: Date, default: Date.now, index: true },
  current: {
    temp: Number,
    humidity: Number,
    wind_speed: Number,
    visibility: Number,
    rainfall_1h: Number,
    description: String,
    icon: String,
  },
  forecast: [
    {
      dt: Number,
      temp: Number,
      humidity: Number,
      wind_speed: Number,
      rainfall_3h: Number,
      description: String,
    },
  ],
  features: {
    avg_temp_24h: Number,
    rainfall_intensity: Number,
    humidity_trend: String,
  },
  riskScore: Number,
  riskLevel: { type: String, enum: ['LOW', 'MED', 'HIGH'] },
  reasons: [String],
});

module.exports = mongoose.model('WeatherReading', WeatherReadingSchema);
