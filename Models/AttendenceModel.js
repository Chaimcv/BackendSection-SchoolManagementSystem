const mongoose= require("mongoose");
const attendanceSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },

    standard: {
      type: String,
      required: true,
      trim: true,
    },

    division: {
      type: String,
      required: true,
      trim: true,
    },

    date: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,  //regular expression (regex) that checks whether the date string follows the required format:YYYY-MM-DD ->(4-2-2)
                                    
    },


    status: {
      type: String,
      enum: ["Present", "Absent", "Late"],
      required: true,
    },

    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate attendance records for the same student and date.
attendanceSchema.index(
  { studentId: 1, date: 1 },
  { unique: true }
);

module.exports = mongoose.model("Attendance", attendanceSchema);