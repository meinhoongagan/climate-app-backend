const mongoose = require("mongoose");

const CommentsSchema = new mongoose.Schema({
    author: { type: mongoose.Schema.Types.ObjectId,
         ref: 'User',
         required: true },

    postId: { type: mongoose.Schema.Types.ObjectId,
         ref: 'Post',
         required: true },

    content: { type: String, 
        required: true },

},{timestamps:true});

module.exports = mongoose.model("Comments",CommentsSchema);