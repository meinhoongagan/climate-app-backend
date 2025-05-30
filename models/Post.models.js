const mongoose = require("mongoose");

const PostSchema = new mongoose.Schema({
    author:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required: true,
    },
    title:{
        type:String,
        required:true
    },
    description:{
        type:String,
        required:true
    },
    image:{
        type:String,
    },
    likes: [{ type: mongoose.Schema.Types.ObjectId,
         ref: 'User' }], // array of user IDs how likes this post

    Comments:[{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comments'
      }],

},{timestamps:true});

const POST = mongoose.model("Post",PostSchema);

module.exports = POST;