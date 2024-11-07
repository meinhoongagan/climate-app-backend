const express = require('express');
const DailyFootprint = require('../models/DailyFootprint');

const router = express.Router();

// @route   POST /api/footprint
// @desc    Create a new daily carbon footprint entry
// @access  Public or Authenticated (depending on your authentication setup)
router.post('/', async (req, res) => {
  try {
    const { userId, transportation, energyUsage, foodConsumption, wasteManagement, waterUsage, purchases } = req.body;

    // Create a new daily footprint entry
    const dailyFootprint = new DailyFootprint({
      userId,
      transportation,
      energyUsage,
      foodConsumption,
      wasteManagement,
      waterUsage,
      purchases,
    });

    // Save the entry to the database
    await dailyFootprint.save();
    res.status(201).json({ message: 'Daily footprint saved successfully!', dailyFootprint });
  } catch (error) {
    res.status(500).json({ message: 'Error saving daily footprint', error: error.message });
  }
});

// @route   GET /api/footprint/:userId
// @desc    Get all daily carbon footprint entries for a specific user
// @access  Public or Authenticated
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Fetch all daily footprint entries for the given user
    const footprints = await DailyFootprint.find({ userId });
    res.status(200).json(footprints);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching daily footprints', error: error.message });
  }
});

// @route   DELETE /api/footprint/:id
// @desc    Delete a specific daily carbon footprint entry
// @access  Public or Authenticated
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Delete the entry from the database
    await DailyFootprint.findByIdAndDelete(id);
    res.status(200).json({ message: 'Daily footprint entry deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting daily footprint', error: error.message });
  }
});

module.exports = router;

