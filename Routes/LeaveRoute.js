const express = require("express");
const LeaveRouter = express.Router();
const {
  applyLeave,
  getLeavesByParent,
  getLeavesByTeacher,
  updateLeaveStatus,
  deleteLeave
} = require("../Controller/LeaveController");

// Parent endpoints
LeaveRouter.post("/apply", applyLeave);
LeaveRouter.get("/parent/:parentId", getLeavesByParent);
LeaveRouter.delete("/:leaveId", deleteLeave);

// Teacher endpoints
LeaveRouter.get("/teacher/:teacherId", getLeavesByTeacher);
LeaveRouter.patch("/:leaveId/status", updateLeaveStatus);

module.exports = LeaveRouter;

