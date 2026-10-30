const mongoose = require("mongoose");

const SubjectScheduleSchema = new mongoose.Schema({
  subject: {
    type: String,
    required: [true, "Subject name is required"],
    trim: true,
  },
  examDate: {
    type: String,
    required: [true, "Exam date is required"],
    match: [/^\d{4}-\d{2}-\d{2}$/, "Date must follow YYYY-MM-DD format"],
  },
  startTime: {
    type: String,
    required: [true, "Start time is required"],
    trim: true,
  },
  endTime: {
    type: String,
    required: [true, "End time is required"],
    trim: true,
  },
  duration: {
    type: String,
    default: "3 Hours",
    trim: true,
  },
  maxMarks: {
    type: Number,
    default: 100,
  },
  roomNumber: {
    type: String,
    default: "",
    trim: true,
  },
});

const ExamTimetableSchema = new mongoose.Schema(
  {
    examTitle: {
      type: String,
      required: [true, "Exam title is required"],
      trim: true,
    },
    standard: {
      type: String,
      required: [true, "Class standard is required"],
      trim: true,
    },
    division: {
      type: String,
      required: [true, "Class division is required"],
      trim: true,
    },
    academicYear: {
      type: String,
      default: "2026-2027",
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teachers",
      default: null,
      required: false,
    },
    subjects: {
      type: [SubjectScheduleSchema],
      validate: {
        validator: function (val) {
          return Array.isArray(val) && val.length > 0;
        },
        message: "At least one subject must be scheduled in the timetable",
      },
    },
    status: {
      type: String,
      enum: ["Draft", "Published"],
      default: "Published",
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to help search timetables by class and term
ExamTimetableSchema.index({ standard: 1, division: 1, examTitle: 1 });

module.exports = mongoose.model("ExamTimetable", ExamTimetableSchema);

