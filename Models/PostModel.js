const mongoose = require("mongoose");

const postSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Students",
    required: true
  },
  text: {
    type: String,
    default: ""
  },
  imageUrl: {
    type: String
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Students"
  }],
  comments: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Students"
    },
    text: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, { timestamps: true });

module.exports = mongoose.model("Posts", postSchema);