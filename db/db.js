const mongoose = require('mongoose');

// MongoDB connection URI
const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/carbon_footprint_tracker';

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
