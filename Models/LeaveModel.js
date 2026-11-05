const mongoose = require("mongoose");

const LeaveSchema = new mongoose.Schema(
  {
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Parents",
      required: true
    },
    parentName: {
      type: String,
      default: ""
    },
    parentEmail: {
      type: String,
      default: ""
    },
    parentPhone: {
      type: Number,
      default: null
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Students",
      required: true
    },
    studentName: {
      type: String,
      required: true
    },
    standard: {
      type: Number,
      required: true
    },
    division: {
      type: String,
      default: ""
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teachers",
      required: true
    },
    teacherName: {
      type: String,
      default: ""
    },
    leaveType: {
      type: String,
      enum: [
        "Medical / Sick Leave",
        "Family Function",
        "Personal / Emergency",
        "Vacation / Travel",
        "Other"
      ],
      default: "Medical / Sick Leave"
    },
    startDate: {
      type: String,
      required: true
    },
    endDate: {
      type: String,
      required: true
    },
    reason: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending"
    },
    rejectionReason: {
      type: String,
      default: ""
    },
    reviewedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Leaves", LeaveSchema);

