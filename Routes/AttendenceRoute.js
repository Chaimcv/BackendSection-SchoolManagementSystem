const express = require("express");
const {
  getMyAssignedClasses,
  getAttendance,
  saveAttendance,
  deleteClassAttendance,
  getMonthlyReport,
  getAllAttendance,
  getAllSchoolClasses,
  getClassTeacher,
  getStudentAttendance,
} = require("../Controller/AttendenceController");

const router = express.Router();

// GET: Fetch classes assigned to the teacher.
router.get("/my-classes", getMyAssignedClasses);

// GET: Fetch all school classes with assigned class teachers (Admin).
router.get("/classes", getAllSchoolClasses);

// GET: Fetch class teacher for a specific standard and division.
router.get("/class-teacher", getClassTeacher);

// GET: Fetch attendance for a specific student.
router.get("/student/:studentId", getStudentAttendance);
router.get("/my", getStudentAttendance);

// GET: Fetch all attendance records (Admin).
router.get("/all", getAllAttendance);

// DELETE: Delete a class attendance register.
router.delete("/register", deleteClassAttendance);

// GET: Fetch students and attendance for a selected class/date.
router.get("/", getAttendance);

// POST: Save or update attendance for multiple students.
router.post("/bulk", saveAttendance);

// GET: Generate a monthly attendance report.
router.get("/report", getMonthlyReport);

module.exports = router;