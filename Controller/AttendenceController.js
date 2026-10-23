const mongoose = require("mongoose");

const Attendance = require("../models/Attendance");
const Student = require("../models/Student");

// Validate date format and actual calendar date.
const isValidDate = (date) => {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }

  const [year, month, day] = date.split("-").map(Number);

  const parsedDate = new Date(
    Date.UTC(year, month - 1, day)
  );

  return (
    parsedDate.getUTCFullYear() === year &&
    parsedDate.getUTCMonth() === month - 1 &&
    parsedDate.getUTCDate() === day
  );
};

// Validate YYYY-MM format.
const isValidMonth = (month) => {
  return (
    typeof month === "string" &&
    /^\d{4}-(0[1-9]|1[0-2])$/.test(month)
  );
};

// =====================================================
// 1. GET ATTENDANCE
// Fetch students and existing attendance for a class/date
// =====================================================

const getAttendance = async (req, res) => {
  try {
    const { standard, division, date } = req.query;

    if (!standard || !division || !isValidDate(date)) {
      return res.status(400).json({
        success: false,
        message: "Valid standard, division, and date are required.",
      });
    }

    // Fetch students belonging to the selected class.
    const students = await Student.find({
      standard,
      division,
    }).lean();

    const studentIds = students.map((student) => student._id);

    // Fetch attendance records for the selected date.
    const attendanceRecords = await Attendance.find({
      studentId: { $in: studentIds },
      date,
    }).lean();

    // Create a map for quick attendance lookup.
    const attendanceMap = new Map(
      attendanceRecords.map((record) => [
        String(record.studentId),
        record.status,
      ])
    );

    // Combine student details with attendance status.
    const attendanceSheet = students.map((student) => ({
      studentId: String(student._id),
      name: student.name,
      status:
        attendanceMap.get(String(student._id)) || "",
    }));

    return res.status(200).json({
      success: true,
      message: "Attendance fetched successfully.",
      date,
      standard,
      division,
      students: attendanceSheet,
    });
  } catch (error) {
    console.error("Get attendance error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch attendance.",
    });
  }
};

// =====================================================
// 2. SAVE OR UPDATE ATTENDANCE
// Save multiple students' attendance in one request
// =====================================================

const saveAttendance = async (req, res) => {
  try {
    const { standard, division, date, records } = req.body;

    if (!standard || !division || !isValidDate(date)) {
      return res.status(400).json({
        success: false,
        message: "Valid standard, division, and date are required.",
      });
    }

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Attendance records are required.",
      });
    }

    const validStatuses = ["Present", "Absent", "Late"];
    const seenStudentIds = new Set();

    // Validate every submitted attendance record.
    for (const record of records) {
      if (
        !record.studentId ||
        !mongoose.isValidObjectId(record.studentId)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid student ID.",
        });
      }

      if (!validStatuses.includes(record.status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid attendance status.",
        });
      }

      if (seenStudentIds.has(String(record.studentId))) {
        return res.status(400).json({
          success: false,
          message: "Duplicate student IDs are not allowed.",
        });
      }

      seenStudentIds.add(String(record.studentId));
    }

    const studentIds = [...seenStudentIds];

    // Verify that all submitted students belong to this class.
    const students = await Student.find({
      _id: { $in: studentIds },
      standard,
      division,
    })
      .select("_id")
      .lean();

    if (students.length !== studentIds.length) {
      return res.status(400).json({
        success: false,
        message: "One or more students do not belong to this class.",
      });
    }

    // Update an existing record or insert a new one.
    const operations = records.map((record) => ({
      updateOne: {
        filter: {
          studentId: record.studentId,
          date,
        },

        update: {
          $set: {
            standard,
            division,
            status: record.status,
          },
        },

        upsert: true,
      },
    }));

    await Attendance.bulkWrite(operations);

    return res.status(200).json({
      success: true,
      message: "Attendance saved successfully.",
      count: records.length,
    });
  } catch (error) {
    console.error("Save attendance error:", error);

    // Handle a duplicate-key error if concurrent requests
    // attempt to create the same student/date record.
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "Attendance was modified concurrently. Reload and try again.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to save attendance.",
    });
  }
};

// =====================================================
// 3. MONTHLY ATTENDANCE REPORT
// Calculate attendance totals for each student
// =====================================================

const getMonthlyReport = async (req, res) => {
  try {
    const { standard, division, month } = req.query;

    if (!standard || !division || !isValidMonth(month)) {
      return res.status(400).json({
        success: false,
        message: "Valid standard, division, and month are required.",
      });
    }

    // Fetch students in the selected class.
    const students = await Student.find({
      standard,
      division,
    }).lean();

    const studentIds = students.map((student) => student._id);

    // Calculate the first day of the next month.
    const [year, monthNumber] = month.split("-").map(Number);

    const nextMonthDate = new Date(
      Date.UTC(year, monthNumber, 1)
    );

    const nextMonth = [
      nextMonthDate.getUTCFullYear(),
      String(nextMonthDate.getUTCMonth() + 1).padStart(2, "0"),
    ].join("-");

    const startDate = `${month}-01`;
    const endDate = `${nextMonth}-01`;

    // Fetch attendance records for the selected month.
    const attendanceRecords = await Attendance.find({
      studentId: { $in: studentIds },
      date: {
        $gte: startDate,
        $lt: endDate,
      },
    }).lean();

    // Group records by student.
    const recordsByStudent = new Map();

    for (const record of attendanceRecords) {
      const studentId = String(record.studentId);

      if (!recordsByStudent.has(studentId)) {
        recordsByStudent.set(studentId, []);
      }

      recordsByStudent.get(studentId).push(record);
    }

    // Calculate each student's attendance summary.
    const report = students.map((student) => {
      const records =
        recordsByStudent.get(String(student._id)) || [];

      const present = records.filter(
        (record) => record.status === "Present"
      ).length;

      const absent = records.filter(
        (record) => record.status === "Absent"
      ).length;

      const late = records.filter(
        (record) => record.status === "Late"
      ).length;

      const totalMarked = records.length;

      const attendancePercentage =
        totalMarked === 0
          ? 0
          : Number(
              ((present / totalMarked) * 100).toFixed(2)
            );

      return {
        studentId: String(student._id),
        name: student.name,
        present,
        absent,
        late,
        totalMarked,
        attendancePercentage,
      };
    });

    return res.status(200).json({
      success: true,
      message: "Monthly report generated successfully.",
      month,
      standard,
      division,
      report,
    });
  } catch (error) {
    console.error("Monthly report error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate monthly report.",
    });
  }
};

// Export controller functions.
module.exports = { getAttendance,saveAttendance,getMonthlyReport,};