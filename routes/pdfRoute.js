const express = require('express');
const PDFRouter = express.Router();
const {
    generatePDF,
    getUserPdfs
} = require('../controllers/PDFController')

PDFRouter.post('/generate-pdf', generatePDF);
PDFRouter.get('/getPdfs/:userId', getUserPdfs)

module.exports = PDFRouter