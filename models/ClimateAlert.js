const mongoose = require('mongoose');

const ClimateAlertSchema = new mongoose.Schema({
  city: { type: String, required: true, index: true },
  triggeredAt: { type: Date, default: Date.now },
  riskScore: Number,
  riskLevel: { type: String, enum: ['LOW', 'MED', 'HIGH'] },
  reasons: [String],
  consecutiveHighCount: Number,
  weatherSnapshot: {
    temp: Number,
    humidity: Number,
    wind_speed: Number,
    rainfall_intensity: Number,
  },
});

module.exports = mongoose.model('ClimateAlert', ClimateAlertSchema);
