const LeaveModel = require("../Models/LeaveModel");
const StudentsModel = require("../Models/StudentsModel");
const ParentModel = require("../Models/ParentModel");
const TeacherModel = require("../Models/TeacherModel");

// 1. Submit a Leave Application (Parent -> Teacher)
exports.applyLeave = async (req, res) => {
  try {
    const {
      parentId,
      studentId,
      teacherId,
      leaveType,
      startDate,
      endDate,
      reason
    } = req.body;

    if (!parentId || !studentId || !teacherId || !startDate || !endDate || !reason) {
      return res.status(400).json({
        message: "Missing required fields: parentId, studentId, teacherId, startDate, endDate, and reason are required."
      });
    }

    // Resolve Student
    const student = await StudentsModel.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student record not found." });
    }

    // Resolve Parent
    const parent = await ParentModel.findById(parentId);
    if (!parent) {
      return res.status(404).json({ message: "Parent record not found." });
    }

    // Resolve Teacher
    const teacher = await TeacherModel.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ message: "Assigned teacher record not found." });
    }

    const newLeave = await LeaveModel.create({
      parent: parent._id,
      parentName: parent.Name || "Guardian",
      parentEmail: parent.email || "",
      parentPhone: parent.phonenumber || null,
      student: student._id,
      studentName: student.Name || "Student",
      standard: student.Standard !== undefined ? Number(student.Standard) : teacher.standard,
      division: student.Division || teacher.division || "",
      teacher: teacher._id,
      teacherName: teacher.name || "Class Teacher",
      leaveType: leaveType || "Medical / Sick Leave",
      startDate,
      endDate,
      reason: reason.trim(),
      status: "Pending",
      rejectionReason: ""
    });

    res.status(201).json({
      message: "Leave application submitted successfully",
      data: newLeave
    });
  } catch (error) {
    console.error("Error submitting leave application:", error);
    res.status(500).json({ message: "Failed to submit leave application", error: error.message });
  }
};

// 2. Get Leaves for a Parent
exports.getLeavesByParent = async (req, res) => {
  try {
    const { parentId } = req.params;
    const leaves = await LeaveModel.find({ parent: parentId })
      .populate("teacher", "name Email subject standard division")
      .populate("student", "Name Standard Division")
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "Parent leave applications fetched successfully",
      data: leaves
    });
  } catch (error) {
    console.error("Error fetching parent leaves:", error);
    res.status(500).json({ message: "Failed to fetch leave applications", error: error.message });
  }
};

// 3. Get Leaves for a Teacher
exports.getLeavesByTeacher = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const teacher = await TeacherModel.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ message: "Teacher record not found." });
    }

    // Query either directly assigned to teacher OR matching teacher's class standard
    const queryConditions = [{ teacher: teacher._id }];
    if (teacher.standard !== undefined && teacher.standard !== null) {
      const classCondition = { standard: teacher.standard };
      if (teacher.division) {
        classCondition.$or = [
          { division: teacher.division },
          { division: null },
          { division: "" }
        ];
      }
      queryConditions.push(classCondition);
    }

    const leaves = await LeaveModel.find({ $or: queryConditions })
      .populate("parent", "Name email phonenumber Student_name")
      .populate("student", "Name Standard Division")
      .populate("teacher", "name Email subject")
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "Teacher leave applications fetched successfully",
      data: leaves
    });
  } catch (error) {
    console.error("Error fetching teacher leaves:", error);
    res.status(500).json({ message: "Failed to fetch leave applications", error: error.message });
  }
};

// 4. Update Leave Status (Accept or Reject with Reason)
exports.updateLeaveStatus = async (req, res) => {
  try {
    const { leaveId } = req.params;
    const { status, rejectionReason } = req.body;

    if (!status || !["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status. Must be 'Approved' or 'Rejected'." });
    }

    if (status === "Rejected" && (!rejectionReason || !rejectionReason.trim())) {
      return res.status(400).json({
        message: "A rejection reason is mandatory when rejecting a leave application."
      });
    }

    const leave = await LeaveModel.findById(leaveId);
    if (!leave) {
      return res.status(404).json({ message: "Leave application not found." });
    }

    leave.status = status;
    leave.rejectionReason = status === "Rejected" ? rejectionReason.trim() : "";
    leave.reviewedAt = new Date();

    await leave.save();

    res.status(200).json({
      message: `Leave application successfully ${status.toLowerCase()}`,
      data: leave
    });
  } catch (error) {
    console.error("Error updating leave status:", error);
    res.status(500).json({ message: "Failed to update leave status", error: error.message });
  }
};

// 5. Delete / Cancel Leave Application
exports.deleteLeave = async (req, res) => {
  try {
    const { leaveId } = req.params;
    const leave = await LeaveModel.findByIdAndDelete(leaveId);
    if (!leave) {
      return res.status(404).json({ message: "Leave application not found." });
    }

    res.status(200).json({
      message: "Leave application cancelled successfully",
      data: leave
    });
  } catch (error) {
    console.error("Error deleting leave application:", error);
    res.status(500).json({ message: "Failed to cancel leave application", error: error.message });
  }
};

