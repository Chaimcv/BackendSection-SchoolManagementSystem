const StudentModel=require("../Models/StudentsModel");
//const { get } = require("../Routes/StudentsRoute");
const generator=require("generate-password");
const mongoose=require("mongoose");
const crypto=require("crypto");


const createStudent=async(req,res)=>{
     const {name,age,email,gender,standard,guardian,guardian_phonenumber,division,address,pincode}=req.body; 

//password generation
const password = generator.generate({
    length: 10,
    numbers: true
});
 try{
        const newStudent=new StudentModel({  //storing data to db
           Name:name,
           Email:email,
           Password:password,
           Age:age, 
           Gender:gender,
          Standard:standard,
          Division:division,
          Guardian:guardian,
          Guardian_phonnumber:guardian_phonenumber,
           Address:address,
           Pincode:pincode,
        });
        await newStudent.save();
        const resData={
            Name:newStudent.name
        }
        console.log(resData,"data");               
        res.send({
            message:"Student added successfully",
            data:resData

        })

    }catch(er){
        console.log("error",er);
    }
};  


//get data from db 
const getStudents=async(req,res)=>{
    try{
        const StudentData=await StudentModel.find();
        res.send({
            message:"Students data fetched successfully",
            data:StudentData
    })
    }catch(error){
        res.send({
            message:"Error",
        })
        console.log(error,"error");
    }
    
};

//get particular data with id
const getStudentById=async(req,res)=>{
    try{
        const id=req.params.studentid;

        const Student=await StudentModel.findById(id);
        if(!Student){
            res.send({
                message:"Student data not available"
            })
        }
        res.send({
            message:"Student data fetched successfully",
            data:Student
        })
    }catch(error){
        res.send({
            message:"Error",
        })
        console.log(error,"error occ");
    }
};



//update
const updateStudent=async(req,res)=>{
    const {name,age,gender,address,pincode,guardian,guardian_phonenumber,standard,division}=req.body; 
    try{
       const id=req.params.studentid;
       const isStudentAvailable=await StudentModel.findById(id);
       if(!isStudentAvailable){
        res.send({
            message:"Student not available"
        })
       }

       const updateStudent=await StudentModel.findByIdAndUpdate(
        id,
        req.body,
         { returnDocument: "after" }                      // {new:true}
    );
    res.send({
        message:"updated studennt data",
        data:updatedStudent
    })
    }catch(error){
   res.send({
    message:"Not updated"
   })
    }
};
//delete
const deleteStudent=async(req,res)=>{
  const id=req.params.studentid;
    const StudentAvailable=await StudentModel.findById(id); //or  await TeacherModel.deleteOne({_id:id});
    if(!StudentAvailable){
        res.send({
            message:"No Student"
        })
    }
   await StudentModel.findByIdAndDelete(id);
   res.send({
    message:"Student data deleted successfully"
   })
}

//login
const jwt=require("jsonwebtoken");
const StudentLogin=async(req,res)=>{
    const{inputtedEmail,inputtedPassword}=req.body;
    try{
        if(!inputtedEmail||!inputtedPassword){
           return res.send({
                message:"Enter email and password"
            })
        }
      const fetchStudentData=await StudentModel.findOne({email:inputtedEmail});
      if(!fetchStudentData){
        return res.send({
            message:"no matching email found"
        })
      }
      const isMatch=await compare(inputtedPassword,fetchStudentData.password);
      if(!isMatch){
        return res.send({
            message:"Invalid Password"
        })
      }
      const token = jwt.sign(
        { id: fetchedStudentData._id },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
      );
      
      res.send({
       message: "Login successful",
       token: token,
        id:fetchedStudentData._id,
        name:fetchedStudentData.Name
      });
    } catch (error) {

  res.send({
   message: "Error in Student login"
  });

}
}

module.exports={createStudent,getStudentById,getStudents,deleteStudent,updateStudent,StudentLogin}