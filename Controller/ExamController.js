const mongoose = require("mongoose");
const ExamTimetable = require("../Models/ExamModel");
const Teacher = require("../Models/TeacherModel");

// Helper to format/sanitize class standard & division
const normalizeStandard = (val) => String(val || "").trim();
const normalizeDivision = (val) => String(val || "").trim().toUpperCase();

// 1. Create a new Exam Timetable
exports.createExamTimetable = async (req, res) => {
  try {
    const { examTitle, standard, division, academicYear, createdBy, subjects, status } = req.body;

    if (!examTitle || !standard || !division) {
      return res.status(400).json({
        success: false,
        message: "Exam title, standard, and division are required.",
      });
    }

    let teacherRecord = null;
    if (createdBy && mongoose.Types.ObjectId.isValid(createdBy)) {
      teacherRecord = await Teacher.findById(createdBy);
    } else {
      teacherRecord = await Teacher.findOne();
    }

    if (!teacherRecord) {
      return res.status(404).json({
        success: false,
        message: "Teacher account not found.",
      });
    }

    // Enforce Rule: Teacher must have an assigned class
    if (teacherRecord.standard === null || teacherRecord.standard === undefined) {
      return res.status(403).json({
        success: false,
        message: "Access Denied: You do not have an assigned class. Timetables can only be created by class in-charge teachers.",
      });
    }

    const assignedStandard = String(teacherRecord.standard).trim();
    const assignedDivision = teacherRecord.division
      ? String(teacherRecord.division).trim().toUpperCase()
      : null;

    // Enforce Rule: A teacher can create ONLY the timetable for her assigned class
    if (normalizeStandard(standard) !== assignedStandard) {
      return res.status(403).json({
        success: false,
        message: `Authorization Denied: You are only permitted to create timetables for your assigned class (Standard ${assignedStandard}).`,
      });
    }

    if (assignedDivision && normalizeDivision(division) !== assignedDivision) {
      return res.status(403).json({
        success: false,
        message: `Authorization Denied: You are only permitted to create timetables for your assigned Division (${assignedDivision}).`,
      });
    }

    const validCreator = teacherRecord._id;
    const enforcedStandard = assignedStandard;
    const enforcedDivision = assignedDivision || normalizeDivision(division || "A");

    if (!Array.isArray(subjects) || subjects.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please include at least one subject with date and time in the timetable.",
      });
    }

    // Validate each subject item
    for (const item of subjects) {
      if (!item.subject || !item.examDate || !item.startTime || !item.endTime) {
        return res.status(400).json({
          success: false,
          message: "Each subject column must specify subject name, exam date, start time, and end time.",
        });
      }
    }

    const newTimetable = new ExamTimetable({
      examTitle: examTitle.trim(),
      standard: enforcedStandard,
      division: enforcedDivision,
      academicYear: academicYear ? academicYear.trim() : "2026-2027",
      createdBy: validCreator,
      subjects,
      status: status || "Published",
    });

    const saved = await newTimetable.save();

    return res.status(201).json({
      success: true,
      message: "Exam timetable created successfully!",
      data: saved,
    });
  } catch (error) {
    console.error("Error creating exam timetable:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create exam timetable.",
    });
  }
};

// 2. Fetch all timetables created by a teacher or for her assigned class
exports.getTeacherExams = async (req, res) => {
  try {
    const { teacherId } = req.params;

    let queryConditions = [];
    if (teacherId && mongoose.Types.ObjectId.isValid(teacherId)) {
      queryConditions.push({ createdBy: teacherId });

      const teacher = await Teacher.findById(teacherId);
      if (teacher && teacher.standard !== null && teacher.standard !== undefined) {
        const std = String(teacher.standard);
        if (teacher.division) {
          queryConditions.push({
            standard: std,
            division: new RegExp(`^${teacher.division}$`, "i"),
          });
        } else {
          queryConditions.push({ standard: std });
        }
      }
    }

    const query = queryConditions.length > 0 ? { $or: queryConditions } : {};

    let timetables = await ExamTimetable.find(query)
      .sort({ createdAt: -1 })
      .populate("createdBy", "name Email subject standard division");

    return res.status(200).json({
      success: true,
      count: timetables.length,
      data: timetables,
    });
  } catch (error) {
    console.error("Error fetching teacher timetables:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch teacher exam timetables.",
    });
  }
};

// 3. Fetch timetables for a specific class (Used by both Teacher and Students)
exports.getClassExams = async (req, res) => {
  try {
    const { standard, division } = req.params;

    if (!standard || !division) {
      return res.status(400).json({
        success: false,
        message: "Standard and division are required parameters.",
      });
    }

    const std = normalizeStandard(standard);
    const div = normalizeDivision(division);
    const stdNum = Number(std);
    const stdQuery = !isNaN(stdNum) ? { $in: [std, String(stdNum), stdNum] } : std;

    const timetables = await ExamTimetable.find({
      standard: stdQuery,
      division: { $regex: new RegExp(`^${div}$`, "i") },
    })
      .sort({ createdAt: -1 })
      .populate("createdBy", "name subject");

    return res.status(200).json({
      success: true,
      count: timetables.length,
      data: timetables,
    });
  } catch (error) {
    console.error("Error fetching class exam timetables:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch class exam timetables.",
    });
  }
};

// 4. Update an existing exam timetable
exports.updateExamTimetable = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Valid timetable ID is required.",
      });
    }

    const { examTitle, standard, division, academicYear, subjects, status } = req.body;

    const updated = await ExamTimetable.findByIdAndUpdate(
      id,
      {
        ...(examTitle && { examTitle: examTitle.trim() }),
        ...(standard && { standard: normalizeStandard(standard) }),
        ...(division && { division: normalizeDivision(division) }),
        ...(academicYear && { academicYear: academicYear.trim() }),
        ...(subjects && { subjects }),
        ...(status && { status }),
      },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Exam timetable not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Exam timetable updated successfully!",
      data: updated,
    });
  } catch (error) {
    console.error("Error updating exam timetable:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update exam timetable.",
    });
  }
};

// 5. Delete an exam timetable
exports.deleteExamTimetable = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Valid timetable ID is required.",
      });
    }

    const deleted = await ExamTimetable.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Exam timetable not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Exam timetable deleted successfully!",
      data: deleted,
    });
  } catch (error) {
    console.error("Error deleting exam timetable:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete exam timetable.",
    });
  }
};

