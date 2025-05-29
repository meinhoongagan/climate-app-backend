const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  likes:[{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
  }],
  Comments:[{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comments'
  }],
  Blogs:[{
     type: mongoose.Schema.Types.ObjectId,
     ref: 'Post',
  }]

});

const User = mongoose.model('User', UserSchema);

module.exports = User;
