const mongoose = require("mongoose");

const PDFSchema = new mongoose.Schema({
    url: {
        type: String,
        required: true,
    },

    thumbnailUrl: {
        type: String,
        required: true,
    },
    
    createdBy:{
        type: mongoose.Schema.Types.ObjectId,
        ref:"User",
        required: true,
    },

    createdAt: {
        type: Date,
        required: true,
        default: Date.now()
    }
},{timestamps:true});

const PDF = mongoose.model("pdf",PDFSchema);

module.exports = PDF;