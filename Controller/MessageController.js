const MessageModel = require("../Models/MessageModel");
const TeacherModel = require("../Models/TeacherModel");
const StudentsModel = require("../Models/StudentsModel");
const ParentModel = require("../Models/ParentModel");

// Helper to resolve linked student for a parent
const resolveParentStudent = async (parent) => {
  let linkedStudent = null;
  if (parent.student_id) {
    try {
      linkedStudent = await StudentsModel.findById(parent.student_id);
    } catch (e) {
      // invalid id format
    }
  }
  if (!linkedStudent && parent.Student_name) {
    linkedStudent = await StudentsModel.findOne({ Name: parent.Student_name });
  }
  return linkedStudent;
};

// 1. Send Message by Teacher (to student, class students, parent, class parents)
exports.sendMessage = async (req, res) => {
  try {
    const {
      senderId,
      recipientType,
      recipientStudentId,
      recipientParentId,
      standard,
      division,
      title,
      message
    } = req.body;

    if (!senderId || !recipientType || !message) {
      return res.status(400).json({
        message: "Missing required fields (senderId, recipientType, and message are required)."
      });
    }

    const teacher = await TeacherModel.findById(senderId);
    if (!teacher) {
      return res.status(404).json({ message: "Teacher sender record not found." });
    }

    const assignedStandard = standard !== undefined && standard !== null && standard !== ""
      ? Number(standard)
      : teacher.standard;
    const assignedDivision = division || teacher.division || null;

    let studentName = "";
    let parentName = "";

    if (recipientType === "Student") {
      if (!recipientStudentId) {
        return res.status(400).json({ message: "Please specify a recipient student." });
      }
      const student = await StudentsModel.findById(recipientStudentId);
      if (student) studentName = student.Name || "";
    } else if (recipientType === "Parent") {
      if (!recipientParentId) {
        return res.status(400).json({ message: "Please specify a recipient parent." });
      }
      const parent = await ParentModel.findById(recipientParentId);
      if (parent) parentName = parent.Name || "";
    }

    const newMessage = await MessageModel.create({
      sender: teacher._id,
      senderRole: "Teacher",
      senderName: teacher.name || "",
      senderSubject: teacher.subject || "",
      senderDetails: teacher.subject ? `Subject: ${teacher.subject}` : "Class Faculty",
      recipientType,
      recipientStudent: recipientType === "Student" ? recipientStudentId : null,
      recipientStudentName: studentName,
      recipientParent: recipientType === "Parent" ? recipientParentId : null,
      recipientParentName: parentName,
      standard: assignedStandard,
      division: assignedDivision,
      title: title || "Message from Class Teacher",
      message: message.trim()
    });

    res.status(201).json({
      message: "Message dispatched successfully",
      data: newMessage
    });
  } catch (error) {
    console.error("Error sending teacher message:", error);
    res.status(500).json({ message: "Failed to send message", error: error.message });
  }
};

// 2. Send Message to Teacher (from Student or Parent)
exports.sendMessageToTeacher = async (req, res) => {
  try {
    const {
      senderRole, // "Student" | "Parent"
      senderId,
      teacherId,
      title,
      message
    } = req.body;

    if (!senderRole || !senderId || !teacherId || !message) {
      return res.status(400).json({
        message: "Missing required fields (senderRole, senderId, teacherId, and message are required)."
      });
    }

    // Verify Teacher
    const teacher = await TeacherModel.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ message: "Assigned teacher record not found." });
    }

    let senderName = "";
    let senderDetails = "";
    let studentStandard = teacher.standard;
    let studentDivision = teacher.division;

    if (senderRole === "Student") {
      const student = await StudentsModel.findById(senderId);
      if (!student) return res.status(404).json({ message: "Student record not found." });
      senderName = student.Name || "Student";
      senderDetails = `Student • Standard ${student.Standard || "-"}${student.Division ? `-${student.Division}` : ""}`;
      studentStandard = student.Standard;
      studentDivision = student.Division;
    } else if (senderRole === "Parent") {
      const parent = await ParentModel.findById(senderId);
      if (!parent) return res.status(404).json({ message: "Parent record not found." });
      senderName = parent.Name || "Guardian";
      senderDetails = `Guardian of: ${parent.Student_name || "Enrolled Student"}`;

      const linkedStudent = await resolveParentStudent(parent);
      if (linkedStudent) {
        studentStandard = linkedStudent.Standard;
        studentDivision = linkedStudent.Division;
      }
    } else {
      return res.status(400).json({ message: "Invalid senderRole. Must be Student or Parent." });
    }

    const newMessage = await MessageModel.create({
      sender: senderId,
      senderRole,
      senderName,
      senderDetails,
      senderStudent: senderRole === "Student" ? senderId : null,
      senderParent: senderRole === "Parent" ? senderId : null,
      recipientType: "Teacher",
      recipientTeacher: teacher._id,
      recipientTeacherName: teacher.name || "",
      standard: studentStandard,
      division: studentDivision,
      title: title || (senderRole === "Student" ? "Student Query / Note" : "Parent Communication"),
      message: message.trim()
    });

    res.status(201).json({
      message: "Message successfully sent to assigned teacher",
      data: newMessage
    });
  } catch (error) {
    console.error("Error sending message to teacher:", error);
    res.status(500).json({ message: "Failed to send message to teacher", error: error.message });
  }
};

// 3. Resolve Assigned Teacher(s) for a Student
exports.getAssignedTeacherForStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    const student = await StudentsModel.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Match teachers by standard
    const query = {};
    if (student.Standard !== undefined && student.Standard !== null) {
      query.standard = student.Standard;
    }

    const teachers = await TeacherModel.find(query).select("name Email subject standard division");

    // Also pick best match (matching division)
    let primaryTeacher = null;
    if (teachers.length > 0) {
      if (student.Division) {
        primaryTeacher = teachers.find(
          (t) => String(t.division || "").trim().toUpperCase() === String(student.Division).trim().toUpperCase()
        );
      }
      if (!primaryTeacher) primaryTeacher = teachers[0];
    }

    res.status(200).json({
      message: "Assigned teachers fetched",
      data: {
        teachers,
        primaryTeacher,
        student: {
          _id: student._id,
          Name: student.Name,
          Standard: student.Standard,
          Division: student.Division
        }
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to resolve assigned teacher", error: error.message });
  }
};

// 4. Resolve Assigned Teacher(s) for a Parent's Child
exports.getAssignedTeacherForParent = async (req, res) => {
  try {
    const { parentId } = req.params;
    const parent = await ParentModel.findById(parentId);
    if (!parent) {
      return res.status(404).json({ message: "Parent not found" });
    }

    const linkedStudent = await resolveParentStudent(parent);
    let teachers = [];
    let primaryTeacher = null;

    if (linkedStudent && linkedStudent.Standard !== undefined && linkedStudent.Standard !== null) {
      teachers = await TeacherModel.find({ standard: linkedStudent.Standard }).select(
        "name Email subject standard division"
      );

      if (teachers.length > 0) {
        if (linkedStudent.Division) {
          primaryTeacher = teachers.find(
            (t) => String(t.division || "").trim().toUpperCase() === String(linkedStudent.Division).trim().toUpperCase()
          );
        }
        if (!primaryTeacher) primaryTeacher = teachers[0];
      }
    } else {
      // Fallback: return all teachers
      teachers = await TeacherModel.find().select("name Email subject standard division");
      if (teachers.length > 0) primaryTeacher = teachers[0];
    }

    res.status(200).json({
      message: "Assigned teachers for parent fetched",
      data: {
        teachers,
        primaryTeacher,
        linkedStudent: linkedStudent ? {
          _id: linkedStudent._id,
          Name: linkedStudent.Name,
          Standard: linkedStudent.Standard,
          Division: linkedStudent.Division
        } : null
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to resolve assigned teacher for parent", error: error.message });
  }
};

// 5. Get all sent messages by Teacher
exports.getTeacherMessages = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const sentMessages = await MessageModel.find({ sender: teacherId })
      .populate("recipientStudent", "Name Standard Division Email")
      .populate("recipientParent", "Name email Student_name")
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "Teacher sent messages retrieved successfully",
      data: sentMessages
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch teacher sent messages", error: error.message });
  }
};

// 6. Get Teacher Inbox (Messages received FROM Students & Parents)
exports.getTeacherInbox = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const incomingMessages = await MessageModel.find({
      recipientType: "Teacher",
      recipientTeacher: teacherId
    })
      .populate("senderStudent", "Name Standard Division Email ProfileImageUrl")
      .populate("senderParent", "Name email Student_name")
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "Teacher inbox retrieved successfully",
      data: incomingMessages
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch teacher inbox", error: error.message });
  }
};

// 7. Get messages for Student (Received from Teacher + Sent to Teacher)
exports.getStudentMessages = async (req, res) => {
  try {
    const { studentId } = req.params;
    const student = await StudentsModel.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const queryConditions = [
      { recipientType: "Student", recipientStudent: student._id },
      { senderRole: "Student", senderStudent: student._id }
    ];

    if (student.Standard !== undefined && student.Standard !== null) {
      const classQuery = {
        recipientType: "ClassStudents",
        standard: student.Standard
      };
      if (student.Division) {
        classQuery.$or = [
          { division: student.Division },
          { division: null },
          { division: "" }
        ];
      }
      queryConditions.push(classQuery);
    }

    const messages = await MessageModel.find({ $or: queryConditions })
      .populate("recipientTeacher", "name Email subject standard division")
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "Student messages retrieved successfully",
      data: messages
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch student messages", error: error.message });
  }
};

// 8. Get messages for Parent (Received from Teacher + Sent to Teacher)
exports.getParentMessages = async (req, res) => {
  try {
    const { parentId } = req.params;
    const parent = await ParentModel.findById(parentId);
    if (!parent) {
      return res.status(404).json({ message: "Parent not found" });
    }

    const queryConditions = [
      { recipientType: "Parent", recipientParent: parent._id },
      { senderRole: "Parent", senderParent: parent._id }
    ];

    const linkedStudent = await resolveParentStudent(parent);
    if (linkedStudent && linkedStudent.Standard !== undefined && linkedStudent.Standard !== null) {
      const classQuery = {
        recipientType: "ClassParents",
        standard: linkedStudent.Standard
      };
      if (linkedStudent.Division) {
        classQuery.$or = [
          { division: linkedStudent.Division },
          { division: null },
          { division: "" }
        ];
      }
      queryConditions.push(classQuery);
    }

    const messages = await MessageModel.find({ $or: queryConditions })
      .populate("recipientTeacher", "name Email subject standard division")
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "Parent messages retrieved successfully",
      data: messages
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch parent messages", error: error.message });
  }
};

// 9. Delete Message
exports.deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    await MessageModel.findByIdAndDelete(messageId);
    res.status(200).json({ message: "Message removed successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete message", error: error.message });
  }
};
