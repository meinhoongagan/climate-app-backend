const PDFDocument = require('pdfkit');
const PDF = require('../models/PDFModel');
const cloudinary = require('cloudinary').v2;
const mongoose = require("mongoose");

const generatePDF = async (req, res) => {
    try {
        const text = req.body.text;
        const userId = req.body.userId;

        const doc = new PDFDocument({
            font: 'Courier',
            info: {
                Title: 'Sample Report',
                Author: 'Your Name or Organization',
                Subject: 'Generated Report',
                Keywords: 'report, pdf, cloudinary, sample',
                // CreationDate is set automatically by pdfkit, but you can override
                CreationDate: new Date('2025-05-29T09:35:00Z'),
                ModDate: new Date(), // Last modified date
            },
            size: 'A4',
            margin: 50
        });

        let buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', async () => {
            const pdfBuffer = Buffer.concat(buffers);
            const result = cloudinary.uploader.upload_stream(
                {
                    resource_type: 'raw',
                    public_id: `reports/report_${Date.now()}`,
                    format: 'pdf',
                },
                async (error, result) => {
                    if (error) {
                        return res.status(500).json({ error: 'Upload to Cloudinary failed' });
                    }
                    const thumbnailUrl = `https://res.cloudinary.com/${process.env.CLOUD_NAME}/image/upload/w_200,h_250,c_fill,pg_1/${result.public_id}.jpg`;

                    const pdf = await PDF.create({
                        url: result.secure_url,
                        thumbnailUrl: thumbnailUrl,
                        createdBy: userId
                    })

                    return res.status(200).json(pdf);
                }

            ).end(pdfBuffer);
        })


        doc.text(text);
        doc.end();
    } 
    catch (error) {
        console.log(error);
        return res.status(500).json({error: 'server error'});
    }
}

const getUserPdfs = async (req, res) => {
  try {
    const userId = req.params.userId;
   
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const pdfs = await PDF.find({ createdBy: userId }).populate({
        path: 'createdBy', 
        select: 'name email'
      });

    if (!pdfs || pdfs.length === 0) {
      return res.status(404).json({ message: 'No PDFs found for this user' });
    }

    res.status(200).json({
      message: 'PDFs retrieved successfully',
      pdfs: pdfs
    });
  } catch (err) {
    console.error('Error querying PDFs:', err);
    res.status(500).json({ error: 'Server error while retrieving PDFs' });
  }
};

module.exports = {
    generatePDF,
    getUserPdfs
}