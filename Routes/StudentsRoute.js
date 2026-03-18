const express=require("express");
const{ createStudent,getStudentById,getStudents,deleteStudent,updateStudent,StudentLogin}=require("../Controller/StudentController");
const StudentRouter=express.Router();

StudentRouter.post("/",createStudent);
StudentRouter.get("/",getStudents);
StudentRouter.get("/:studentid",getStudentById);
StudentRouter.put("/:studentid",updateStudent);
StudentRouter.delete("/:studentid",deleteStudent);
StudenttRouter.post("/login",StudentLogin);


module.exports=StudentRouter;
