const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    senderRole: {
      type: String,
      enum: ["Teacher", "Student", "Parent"],
      default: "Teacher"
    },
    senderName: {
      type: String,
      default: ""
    },
    senderSubject: {
      type: String,
      default: ""
    },
    senderDetails: {
      type: String,
      default: ""
    },
    senderStudent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Students",
      default: null
    },
    senderParent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Parents",
      default: null
    },
    recipientType: {
      type: String,
      enum: ["Student", "ClassStudents", "Parent", "ClassParents", "Teacher"],
      required: true
    },
    recipientTeacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teachers",
      default: null
    },
    recipientTeacherName: {
      type: String,
      default: ""
    },
    recipientStudent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Students",
      default: null
    },
    recipientStudentName: {
      type: String,
      default: ""
    },
    recipientParent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Parents",
      default: null
    },
    recipientParentName: {
      type: String,
      default: ""
    },
    standard: {
      type: Number,
      default: null
    },
    division: {
      type: String,
      default: null
    },
    title: {
      type: String,
      default: ""
    },
    message: {
      type: String,
      required: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Messages", MessageSchema);
