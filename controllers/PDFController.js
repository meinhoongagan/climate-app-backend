const PDFDocument = require('pdfkit');
const PDF = require('../models/PDFModel');
const cloudinary = require('cloudinary').v2;
const mongoose = require("mongoose");

const generatePDF = async (req, res) => {
    // Guard: if Cloudinary not fully configured, skip gracefully
    if (!process.env.CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        console.warn('[PDF] Cloudinary not fully configured — skipping PDF generation.');
        return res.status(503).json({ error: 'PDF service not configured (missing Cloudinary credentials).' });
    }

    try {
        const { text, userId } = req.body;

        const doc = new PDFDocument({
            font: 'Courier',
            info: {
                Title: 'ClimateGuard Carbon Footprint Report',
                Author: 'ClimateGuard AI',
                Subject: 'Carbon Footprint Analysis',
            },
            size: 'A4',
            margin: 50,
        });

        // Collect PDF bytes in memory
        const buffers = [];
        doc.on('data', chunk => buffers.push(chunk));

        // Wrap the stream completion in a Promise so errors don't escape
        const pdfBuffer = await new Promise((resolve, reject) => {
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', reject);
            doc.text(text || 'No report content.');
            doc.end();
        });

        // Upload to Cloudinary via Promise wrapper
        const uploadResult = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                {
                    resource_type: 'raw',
                    public_id: `reports/report_${Date.now()}`,
                    format: 'pdf',
                },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );
            stream.end(pdfBuffer);
        });

        const thumbnailUrl = `https://res.cloudinary.com/${process.env.CLOUD_NAME}/image/upload/w_200,h_250,c_fill,pg_1/${uploadResult.public_id}.jpg`;

        const pdf = await PDF.create({
            url: uploadResult.secure_url,
            thumbnailUrl,
            createdBy: userId,
        });

        return res.status(200).json(pdf);

    } catch (error) {
        console.error('[PDF] Generation error:', error.message);
        return res.status(500).json({ error: 'PDF generation failed: ' + error.message });
    }
};

const getUserPdfs = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        const pdfs = await PDF.find({ createdBy: userId }).populate({
            path: 'createdBy',
            select: 'name email',
        });

        if (!pdfs || pdfs.length === 0) {
            return res.status(404).json({ message: 'No PDFs found for this user' });
        }

        return res.status(200).json({ message: 'PDFs retrieved successfully', pdfs });
    } catch (err) {
        console.error('[PDF] getUserPdfs error:', err);
        return res.status(500).json({ error: 'Server error while retrieving PDFs' });
    }
};

module.exports = { generatePDF, getUserPdfs };
