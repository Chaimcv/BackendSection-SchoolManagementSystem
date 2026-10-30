const express = require("express");
const router = express.Router();
const {
  createExamTimetable,
  getTeacherExams,
  getClassExams,
  updateExamTimetable,
  deleteExamTimetable,
} = require("../Controller/ExamController");

// Mount REST routes
router.post("/", createExamTimetable);
router.get("/teacher/:teacherId", getTeacherExams);
router.get("/class/:standard/:division", getClassExams);
router.put("/:id", updateExamTimetable);
router.delete("/:id", deleteExamTimetable);

module.exports = router;

