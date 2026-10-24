const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const Attendance = require("../Models/AttendenceModel");
const Student = require("../Models/StudentsModel");
const Teacher = require("../Models/TeacherModel");

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

// Robust helper to match students across both PascalCase and lowercase schemas,
// and handle both String and Number standards.
const buildStudentClassFilter = (standard, division) => {
  const stdNum = Number(standard);
  const stdConditions = !isNaN(stdNum)
    ? [
      { Standard: stdNum },
      { Standard: String(standard) },
      { standard: stdNum },
      { standard: String(standard) },
    ]
    : [
      { Standard: String(standard) },
      { standard: String(standard) },
    ];

  const divConditions = [
    { Division: division },
    { division: division },
    { Division: new RegExp(`^${division}$`, "i") },
    { division: new RegExp(`^${division}$`, "i") },
  ];

  return {
    $and: [
      { $or: stdConditions },
      { $or: divConditions },
    ],
  };
};

// Helper to resolve the assigned class teacher for a standard and division
const resolveClassTeacher = async (standard, division) => {
  if (!standard) return null;
  const stdNum = Number(standard);
  let teacher = null;

  // 1. Try to find a teacher with both standard and division matching
  if (!isNaN(stdNum) && division) {
    teacher = await Teacher.findOne({
      standard: stdNum,
      $or: [
        { division: { $regex: new RegExp(`^${String(division).trim()}$`, "i") } },
        { division: String(division).trim() },
      ],
    })
      .select("name Email subject standard division")
      .lean();
  }

  // 2. If no division-specific teacher, match by standard
  if (!teacher && !isNaN(stdNum)) {
    const teachersForStandard = await Teacher.find({ standard: stdNum })
      .select("name Email subject standard division")
      .lean();

    if (teachersForStandard.length === 1) {
      teacher = teachersForStandard[0];
    } else if (teachersForStandard.length > 1) {
      const divMatch = teachersForStandard.find(
        (t) =>
          t.division &&
          division &&
          t.division.toLowerCase() === String(division).toLowerCase()
      );
      teacher = divMatch || teachersForStandard[0];
    }
  }

  // 3. Fallback: check recent attendance records for this class marked by a teacher
  if (!teacher) {
    const sampleRecord = await Attendance.findOne({
      standard: String(standard),
      ...(division ? { division: String(division) } : {}),
      markedBy: { $ne: null },
    })
      .sort({ createdAt: -1 })
      .populate("markedBy", "name Email subject standard division")
      .lean();

    if (sampleRecord && sampleRecord.markedBy) {
      teacher = sampleRecord.markedBy;
    }
  }

  return teacher;
};

// =====================================================
// 1. GET MY ASSIGNED CLASSES
// Resolves a teacher's classes dynamically based on their standard
// =====================================================

const getMyAssignedClasses = async (req, res) => {
  try {
    let teacherId = req.query.teacherId || req.headers["x-teacher-id"] || req.user?.id;

    // Decode JWT token from Authorization header if available
    const authHeader = req.header("Authorization") || req.header("authorization");
    if (!teacherId && authHeader) {
      const token = authHeader.replace(/^Bearer\s+/i, "").trim();
      if (token) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET || "myschoolsecretkey");
          if (decoded && decoded.id) {
            teacherId = decoded.id;
          }
        } catch {
          // Token may be a direct token or id
        }
      }
    }

    let standard = null;
    let specificDivision = null;

    if (teacherId && mongoose.isValidObjectId(teacherId)) {
      const teacher = await Teacher.findById(teacherId).lean();
      if (teacher) {
        standard = teacher.standard;
        specificDivision = teacher.division || null;
      }
    }

    // If teacher has a standard assigned
    if (standard !== null && standard !== undefined && String(standard).trim() !== "") {
      const stdNum = Number(standard);
      const stdConditions = !isNaN(stdNum)
        ? [
          { Standard: stdNum },
          { Standard: String(standard) },
          { standard: stdNum },
          { standard: String(standard) },
        ]
        : [
          { Standard: String(standard) },
          { standard: String(standard) },
        ];

      if (specificDivision) {
        const t = await resolveClassTeacher(standard, specificDivision);
        return res.status(200).json({
          success: true,
          classes: [
            {
              standard: String(standard),
              division: String(specificDivision),
              classTeacherName: t ? t.name : "Not Assigned",
              classTeacher: t
                ? {
                    name: t.name,
                    email: t.Email,
                    subject: t.subject,
                  }
                : null,
            },
          ],
        });
      }

      // Query active divisions for this standard from Students collection
      const distinctDivisions = await Student.distinct("Division", { $or: stdConditions });
      const lowerDivisions = await Student.distinct("division", { $or: stdConditions });

      const allDivisions = Array.from(new Set([...distinctDivisions, ...lowerDivisions]))
        .filter(Boolean)
        .map(String)
        .sort();

      const divisions = allDivisions.length > 0 ? allDivisions : ["A"];

      const classes = await Promise.all(
        divisions.map(async (div) => {
          const t = await resolveClassTeacher(standard, div);
          return {
            standard: String(standard),
            division: String(div),
            classTeacherName: t ? t.name : "Not Assigned",
            classTeacher: t
              ? {
                  name: t.name,
                  email: t.Email,
                  subject: t.subject,
                }
              : null,
          };
        })
      );

      return res.status(200).json({
        success: true,
        classes,
      });
    }

    // Fallback: If no standard assigned to teacher, return all classes registered in the school
    const students = await Student.find(
      {},
      { Standard: 1, Division: 1, standard: 1, division: 1 }
    ).lean();

    const classMap = new Map();

    for (const s of students) {
      const std =
        s.Standard !== undefined && s.Standard !== null
          ? String(s.Standard)
          : s.standard !== undefined && s.standard !== null
            ? String(s.standard)
            : "";
      const div = s.Division || s.division || "";

      if (std && div) {
        const key = `${std}-${div}`;
        if (!classMap.has(key)) {
          classMap.set(key, { standard: std, division: div });
        }
      }
    }

    const classes = await Promise.all(
      Array.from(classMap.values()).map(async (item) => {
        const t = await resolveClassTeacher(item.standard, item.division);
        return {
          standard: String(item.standard),
          division: String(item.division),
          classTeacherName: t ? t.name : "Not Assigned",
          classTeacher: t
            ? {
                name: t.name,
                email: t.Email,
                subject: t.subject,
              }
            : null,
        };
      })
    );

    classes.sort((a, b) => {
      const stdDiff = Number(a.standard) - Number(b.standard);
      if (!isNaN(stdDiff) && stdDiff !== 0) return stdDiff;
      return a.division.localeCompare(b.division);
    });

    if (classes.length === 0) {
      classes.push({
        standard: "1",
        division: "A",
        classTeacherName: "Not Assigned",
        classTeacher: null,
      });
    }

    return res.status(200).json({
      success: true,
      classes,
    });
  } catch (error) {
    console.error("Get my-classes error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch assigned classes.",
    });
  }
};

// =====================================================
// 2. GET ATTENDANCE
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

    // Fetch students belonging to the selected class using resilient casing filter.
    const studentFilter = buildStudentClassFilter(standard, division);
    const students = await Student.find(studentFilter).lean();

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
      name: student.Name || student.name || "Student",
      status: attendanceMap.get(String(student._id)) || "",
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
// 3. SAVE OR UPDATE ATTENDANCE
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
    const studentFilter = {
      _id: { $in: studentIds },
      ...buildStudentClassFilter(standard, division),
    };

    const students = await Student.find(studentFilter)
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
            standard: String(standard),
            division: String(division),
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

    // Handle a duplicate-key error if concurrent requests attempt
    // to create the same student/date record.
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Attendance was modified concurrently. Reload and try again.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to save attendance.",
    });
  }
};

// =====================================================
// 4. DELETE ATTENDANCE REGISTER
// =====================================================

const deleteClassAttendance = async (req, res) => {
  try {
    const { standard, division, date } = req.query;

    if (!standard || !division || !isValidDate(date)) {
      return res.status(400).json({
        success: false,
        message: "Valid standard, division, and date are required.",
      });
    }

    const studentFilter = buildStudentClassFilter(standard, division);
    const students = await Student.find(studentFilter).select("_id").lean();
    const studentIds = students.map((s) => s._id);

    const result = await Attendance.deleteMany({
      $or: [
        { studentId: { $in: studentIds }, date },
        { standard: String(standard), division: String(division), date },
      ],
    });

    return res.status(200).json({
      success: true,
      message: "Attendance register deleted successfully.",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Delete attendance error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete attendance register.",
    });
  }
};

// =====================================================
// 5. MONTHLY ATTENDANCE REPORT
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
    const studentFilter = buildStudentClassFilter(standard, division);
    const students = await Student.find(studentFilter).lean();

    const studentIds = students.map((student) => student._id);

    // Calculate the first day of the next month.
    const [year, monthNumber] = month.split("-").map(Number);

    const nextMonthDate = new Date(Date.UTC(year, monthNumber, 1));

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

    // Generate all calendar dates for this month
    const daysInMonth = new Date(year, monthNumber, 0).getDate();
    const allDates = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = String(d).padStart(2, "0");
      const dateStr = `${month}-${dayStr}`;
      const dateObj = new Date(Date.UTC(year, monthNumber - 1, d));
      const dayName = dateObj.toLocaleDateString("en-US", {
        weekday: "short",
        timeZone: "UTC",
      });
      const isWeekend = dayName === "Sat" || dayName === "Sun";

      allDates.push({
        date: dateStr,
        day: d,
        dayName,
        isWeekend,
      });
    }

    // Resolve Class Teacher for this class
    const classTeacher = await resolveClassTeacher(standard, division);
    const classTeacherName = classTeacher ? classTeacher.name : "Not Assigned";

    // Calculate each student's attendance summary and daily records.
    const report = students.map((student) => {
      const records = recordsByStudent.get(String(student._id)) || [];

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
          : Number(((present / totalMarked) * 100).toFixed(2));

      // Build daily map: { [dateStr]: "Present" | "Absent" | "Late" }
      const dailyAttendance = {};
      for (const rec of records) {
        dailyAttendance[rec.date] = rec.status;
      }

      // Build full daily array for all days of the month
      const dailyList = allDates.map((dObj) => ({
        date: dObj.date,
        day: dObj.day,
        dayName: dObj.dayName,
        isWeekend: dObj.isWeekend,
        status: dailyAttendance[dObj.date] || "",
      }));

      return {
        studentId: String(student._id),
        name: student.Name || student.name || "Student",
        present,
        absent,
        late,
        totalMarked,
        attendancePercentage,
        dailyAttendance,
        dailyList,
        classTeacherName,
      };
    });

    return res.status(200).json({
      success: true,
      message: "Monthly report generated successfully.",
      month,
      standard,
      division,
      daysInMonth,
      allDates,
      classTeacherName,
      classTeacher: classTeacher
        ? {
            name: classTeacher.name,
            email: classTeacher.Email,
            subject: classTeacher.subject,
            standard: classTeacher.standard,
            division: classTeacher.division,
          }
        : null,
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

// =====================================================
// 6. GET ALL ATTENDANCE (Admin)
// =====================================================

const getAllAttendance = async (req, res) => {
  try {
    const { standard, division, date } = req.query;
    const query = {};

    if (date) query.date = date;
    if (standard) query.standard = String(standard);
    if (division) query.division = String(division);

    const records = await Attendance.find(query).lean();
    const studentIds = records.map((r) => r.studentId);
    const students = await Student.find({ _id: { $in: studentIds } }).lean();

    const studentMap = new Map(
      students.map((s) => [String(s._id), s.Name || s.name || "Student"])
    );

    const enrichedRecords = records.map((r) => ({
      ...r,
      name: studentMap.get(String(r.studentId)) || "Student",
      studentName: studentMap.get(String(r.studentId)) || "Student",
    }));

    return res.status(200).json({
      success: true,
      records: enrichedRecords,
    });
  } catch (error) {
    console.error("Get all attendance error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch attendance records.",
    });
  }
};

// =====================================================
// 7. GET ALL SCHOOL CLASSES (Admin)
// Lists all classes in the school with assigned class teachers
// =====================================================

const getAllSchoolClasses = async (req, res) => {
  try {
    const students = await Student.find(
      {},
      { Standard: 1, Division: 1, standard: 1, division: 1 }
    ).lean();

    const classMap = new Map();

    for (const s of students) {
      const std =
        s.Standard !== undefined && s.Standard !== null
          ? String(s.Standard)
          : s.standard !== undefined && s.standard !== null
            ? String(s.standard)
            : "";
      const div = s.Division || s.division || "";

      if (std && div) {
        const key = `${std}-${div}`;
        if (!classMap.has(key)) {
          classMap.set(key, { standard: std, division: div });
        }
      }
    }

    const classItems = Array.from(classMap.values());
    const classes = await Promise.all(
      classItems.map(async (c) => {
        const teacher = await resolveClassTeacher(c.standard, c.division);
        return {
          standard: String(c.standard),
          division: String(c.division),
          classTeacherName: teacher ? teacher.name : "Not Assigned",
          classTeacher: teacher
            ? {
                name: teacher.name,
                email: teacher.Email,
                subject: teacher.subject,
              }
            : null,
        };
      })
    );

    classes.sort((a, b) => {
      const stdDiff = Number(a.standard) - Number(b.standard);
      if (!isNaN(stdDiff) && stdDiff !== 0) return stdDiff;
      return a.division.localeCompare(b.division);
    });

    return res.status(200).json({
      success: true,
      classes,
    });
  } catch (error) {
    console.error("Get all classes error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch school classes.",
    });
  }
};

// =====================================================
// 8. GET CLASS TEACHER
// Resolves class teacher for a given standard and division
// =====================================================

const getClassTeacher = async (req, res) => {
  try {
    const { standard, division } = req.query;
    if (!standard) {
      return res.status(400).json({
        success: false,
        message: "Standard is required.",
      });
    }

    const teacher = await resolveClassTeacher(standard, division);

    return res.status(200).json({
      success: true,
      standard: String(standard),
      division: division ? String(division) : "",
      classTeacherName: teacher ? teacher.name : "Not Assigned",
      classTeacher: teacher
        ? {
            name: teacher.name,
            email: teacher.Email,
            subject: teacher.subject,
            standard: teacher.standard,
            division: teacher.division,
          }
        : null,
    });
  } catch (error) {
    console.error("Get class teacher error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to resolve class teacher.",
    });
  }
};

// =====================================================
// 9. GET STUDENT ATTENDANCE
// Fetches attendance records for a specific student
// =====================================================

const getStudentAttendance = async (req, res) => {
  try {
    const studentId = req.params.studentId || req.query.studentId;
    const { month } = req.query;

    if (!studentId || !mongoose.isValidObjectId(studentId)) {
      return res.status(400).json({
        success: false,
        message: "Valid student ID is required.",
      });
    }

    const student = await Student.findById(studentId).lean();
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found.",
      });
    }

    const dateFilter = {};
    if (month && isValidMonth(month)) {
      const [year, monthNumber] = month.split("-").map(Number);
      const nextMonthDate = new Date(Date.UTC(year, monthNumber, 1));
      const nextMonth = [
        nextMonthDate.getUTCFullYear(),
        String(nextMonthDate.getUTCMonth() + 1).padStart(2, "0"),
      ].join("-");
      dateFilter.date = {
        $gte: `${month}-01`,
        $lt: `${nextMonth}-01`,
      };
    }

    const query = {
      $or: [
        { studentId: new mongoose.Types.ObjectId(studentId) },
        { studentId: String(studentId) },
      ],
      ...dateFilter,
    };

    const records = await Attendance.find(query).sort({ date: -1 }).lean();

    const present = records.filter((r) => r.status === "Present").length;
    const absent = records.filter((r) => r.status === "Absent").length;
    const late = records.filter((r) => r.status === "Late").length;
    const total = records.length;

    const dailyMap = {};
    for (const rec of records) {
      dailyMap[rec.date] = rec.status;
    }

    return res.status(200).json({
      success: true,
      student: {
        id: String(student._id),
        name: student.Name || student.name || "Student",
        standard: student.Standard || student.standard,
        division: student.Division || student.division,
      },
      summary: {
        total,
        present,
        absent,
        late,
        percentage: total > 0 ? Math.round((present / total) * 100) : 0,
      },
      dailyMap,
      records,
    });
  } catch (error) {
    console.error("Get student attendance error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch student attendance.",
    });
  }
};

// Export controller functions.
module.exports = {
  getMyAssignedClasses,
  getAttendance,
  saveAttendance,
  deleteClassAttendance,
  getMonthlyReport,
  getAllAttendance,
  getAllSchoolClasses,
  getClassTeacher,
  getStudentAttendance,
};