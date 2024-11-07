const mongoose = require('mongoose');

const DailyFootprintSchema = new mongoose.Schema({
  date: {
    type: Date,
    default: Date.now,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  transportation: {
    mode: { type: String, enum: ['car', 'bus', 'bike', 'walking', 'train', 'other'], required: true },
    distance: { type: Number, required: true }, // in kilometers
    carpooling: { type: Boolean, default: false },
  },
  energyUsage: {
    appliances: { type: Number, default: 0 }, // in hours
    lighting: { type: Number, default: 0 }, // in hours
    showerDuration: { type: Number, default: 0 }, // in minutes
  },
  foodConsumption: {
    meals: { type: String, enum: ['vegetarian', 'vegan', 'meat-based'], required: true },
    snacksAndDrinks: { type: String },
    foodWaste: { type: String, enum: ['small', 'medium', 'large'], default: 'small' },
  },
  wasteManagement: {
    recyclables: { type: Number, default: 0 }, // number of recyclable items
    nonRecyclableWaste: { type: String, enum: ['small', 'medium', 'large'], default: 'small' },
  },
  waterUsage: {
    numberOfShowers: { type: Number, default: 0 },
    showerDuration: { type: Number, default: 0 }, // in minutes
    laundryDone: { type: String, enum: ['small', 'medium', 'large'], default: 'small' },
  },
  purchases: {
    newItems: { type: Boolean, default: false },
    reusableItemsUsed: { type: Boolean, default: false },
  },
});

module.exports = mongoose.model('DailyFootprint', DailyFootprintSchema);
