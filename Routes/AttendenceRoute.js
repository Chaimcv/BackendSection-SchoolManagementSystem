const express = require("express");

const {
  getAttendance,
  saveAttendance,
  getMonthlyReport,
} = require("../controllers/AttendanceController");

const router = express.Router();

// GET: Fetch students and attendance for a selected class/date.
router.get("/", getAttendance);

// POST: Save or update attendance for multiple students.
router.post("/bulk", saveAttendance);

// GET: Generate a monthly attendance report.
router.get("/report", getMonthlyReport);

module.exports = router;