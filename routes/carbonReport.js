require("dotenv").config();
const express = require('express');
const router = express.Router();
const DailyFootprint = require('../models/DailyFootprint');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require("axios");

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API);

function buildReportPrompt(userData, entryCount) {
  return `
You are an expert climate scientist and sustainability advisor. Analyze this user's carbon footprint data collected over their last ${entryCount} day(s) and generate a detailed, structured report in plain text (do not use markdown symbols like ** or ##).

DATA:
${JSON.stringify(userData, null, 2)}

Structure the report exactly like this:

CLIMATEGUARD - PERSONAL CARBON FOOTPRINT REPORT
=================================================

1. EXECUTIVE SUMMARY
Brief 2-3 sentence overview of the user's environmental impact.

2. FOOTPRINT BREAKDOWN BY CATEGORY
Analyze transportation, energy usage, food consumption, waste management, water usage, and purchases based on the data.

3. KEY FINDINGS
List 3-5 specific observations about their habits (both positive and areas to improve).

4. ESTIMATED CO2 IMPACT
Provide rough CO2 equivalent estimates per category based on the data provided.

5. PERSONALIZED RECOMMENDATIONS
Give 5 specific, actionable recommendations tailored to this user's actual data.

6. SUSTAINABILITY SCORE (out of 10)
Rate each category and give an overall score with brief explanation.

7. 30-DAY IMPROVEMENT PLAN
A simple week-by-week action plan to reduce their footprint.

Keep the tone encouraging, scientific, and practical.
`;
}

// GET /api/carbon-report/:userId
router.get('/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const userFootprints = await DailyFootprint.find({ userId })
      .sort({ date: -1 })
      .limit(30);

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // No personal data yet — return a general guide
    if (!userFootprints || userFootprints.length === 0) {
      const prompt = `Write a comprehensive personal carbon footprint guide in plain text (no markdown ** or ## symbols) for a new user. Include:
1. WELCOME TO CLIMATEGUARD - why tracking matters
2. AVERAGE CARBON FOOTPRINT IN INDIA - statistics and breakdown by category
3. TOP 5 WAYS TO REDUCE YOUR FOOTPRINT - actionable tips
4. HOW TO USE THIS APP - what to log and why
5. SUSTAINABILITY GOALS - suggested 30, 60, and 90 day targets
Keep it encouraging and practical.`;

      const result = await model.generateContent(prompt);
      return res.status(200).json({
        message: 'No personal data yet — generated a general guide.',
        report: result.response.text(),
        pdf: null,
        hasPersonalData: false,
      });
    }

    // Build structured data for the prompt
    const userData = {
      totalEntries: userFootprints.length,
      transportation:  userFootprints.map(i => i.transportation),
      energyUsage:     userFootprints.map(i => i.energyUsage),
      foodConsumption: userFootprints.map(i => i.foodConsumption),
      wasteManagement: userFootprints.map(i => i.wasteManagement),
      waterUsage:      userFootprints.map(i => i.waterUsage),
      purchases:       userFootprints.map(i => i.purchases),
    };

    const result = await model.generateContent(buildReportPrompt(userData, userFootprints.length));
    const reportText = result.response.text();

    // PDF is optional — won't crash report if Cloudinary not configured
    let pdfResult = null;
    try {
      const pdfResponse = await axios.post(
        `${process.env.BACKEND_URL}/api/pdf/generate-pdf`,
        { userId, text: reportText },
        { timeout: 15000 }
      );
      pdfResult = pdfResponse.data;
    } catch (pdfErr) {
      console.warn('[CarbonReport] PDF skipped (Cloudinary not configured):', pdfErr.message);
    }

    return res.status(200).json({
      message: 'Carbon footprint report generated successfully.',
      report: reportText,
      pdf: pdfResult,
      hasPersonalData: true,
      entriesAnalyzed: userFootprints.length,
    });

  } catch (error) {
    console.error('[CarbonReport] Error:', error.message);
    return res.status(500).json({
      message: 'Error generating carbon footprint report',
      error: error.message,
    });
  }
});

// GET /api/carbon-report/environment/upcoming
router.get('/environment/upcoming', async (req, res) => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const prompt = `List major annual global environmental events, observances, and policy milestones in plain text (no markdown). Include month/date, event name, brief description, and why it matters for climate action. Cover at least 12 events like Earth Day, World Environment Day, World Oceans Day, etc.`;
    const result = await model.generateContent(prompt);
    return res.status(200).json({
      message: 'Environmental events retrieved successfully.',
      annualEventsAndPolicies: result.response.text(),
    });
  } catch (error) {
    console.error('[CarbonReport] Events error:', error.message);
    return res.status(500).json({
      message: 'Error fetching environmental events',
      error: error.message,
    });
  }
});

module.exports = router;
