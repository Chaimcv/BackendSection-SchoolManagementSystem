const express = require("express");
const MessageRouter = express.Router();
const {
  sendMessage,
  sendMessageToTeacher,
  getAssignedTeacherForStudent,
  getAssignedTeacherForParent,
  getTeacherMessages,
  getTeacherInbox,
  getStudentMessages,
  getParentMessages,
  deleteMessage
} = require("../Controller/MessageController");

// Teacher Outbox & Broadcast
MessageRouter.post("/send", sendMessage);

// Student/Parent sending to assigned teacher
MessageRouter.post("/send-to-teacher", sendMessageToTeacher);

// Resolve assigned teachers
MessageRouter.get("/assigned-teacher/student/:studentId", getAssignedTeacherForStudent);
MessageRouter.get("/assigned-teacher/parent/:parentId", getAssignedTeacherForParent);

// Teacher feeds
MessageRouter.get("/teacher/:teacherId", getTeacherMessages);
MessageRouter.get("/teacher-inbox/:teacherId", getTeacherInbox);

// Student & Parent feeds
MessageRouter.get("/student/:studentId", getStudentMessages);
MessageRouter.get("/parent/:parentId", getParentMessages);

// Delete message
MessageRouter.delete("/:messageId", deleteMessage);

module.exports = MessageRouter;
