const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
     try {
         const DB_URL = process.env.DB_URL;
         if (!DB_URL) {
             throw new Error('DB_URL is not defined. Check your environment variables.');
         }
         await mongoose.connect(DB_URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true
        });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
