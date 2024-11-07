require("dotenv").config()
const express = require('express');
const router = express.Router();
const DailyFootprint = require('../models/DailyFootprint');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Google Gemini API key from environment variables
const GOOGLE_GEMINI_API_KEY = process.env.GOOLE_GEMINI_API;

// Route to generate the carbon footprint report based on user data
router.get('/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const userFootprints = await DailyFootprint.find({ userId }).sort({ date: -1 }).limit(30);

    if (!userFootprints || userFootprints.length === 0) {
      return res.status(404).json({ message: 'No daily footprint data found for this user.' });
    }

    const userData = {
      transportation: userFootprints.map(item => item.transportation),
      energyUsage: userFootprints.map(item => item.energyUsage),
      foodConsumption: userFootprints.map(item => item.foodConsumption),
      wasteManagement: userFootprints.map(item => item.wasteManagement),
      waterUsage: userFootprints.map(item => item.waterUsage),
      purchases: userFootprints.map(item => item.purchases)
    };

    const genAI = new GoogleGenerativeAI(GOOGLE_GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Create a comprehensive carbon footprint report based on this data: ${JSON.stringify(userData)}`;

    const result = await model.generateContent(prompt);

    res.status(200).json({
      message: 'Carbon footprint report generated successfully.',
      report: result.response.text()
    });

  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      message: 'Error generating carbon footprint report',
      error: error.message
    });
  }
});

// Route to get 5 upcoming environmental events and policies
router.get('/environment/upcoming', async (req, res) => {
  try {
    const genAI = new GoogleGenerativeAI(GOOGLE_GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const date = Date();

    // Updated prompt to request general yearly information instead of real-time events
    const prompt = `Provide a summary of major environmental events and policies that occur every year, including notable events like Earth Day, World Environment Day, and key policies or observances that support environmental awareness and conservation. No real-time data is needed.$`;

    const result = await model.generateContent(prompt);

    res.status(200).json({
      message: 'Annual environmental events and policies information retrieved successfully.',
      annualEventsAndPolicies: result.response.text()
    });

  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      message: 'Error fetching annual environmental events and policies',
      error: error.message
    });
  }
});

module.exports = router;
