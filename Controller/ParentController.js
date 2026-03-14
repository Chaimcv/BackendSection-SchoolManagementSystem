const ParentModel=require("../Models/ParentModel");
const mongoose=require("mongoose");
const crypto=require("crypto");
const generator=require("generate-password");

const upload=require("../middleware/uploads");

const bcrypt = require("bcryptjs");



const createParent=async(req,res)=>{
    console.log("parent api called");

    const password = generator.generate({
        length: 10,
        numbers: true
    });
    console.log(password);



    const{name,email,studentname,studentId,phonenumber,address,pincode,image}=req.body;
    console.log({name},"name");
    const hashedPassword = await bcrypt.hash(password, 10);
    try{
       const newParent=new ParentModel({
        Name:name,
        email,
        Student_name:studentname,
        student_id:studentId,
        phonenumber,
        address,
        pincode,
        password:hashedPassword,
        image:req.upload
       });
       await newParent.save();
       const resData={
        name:newParent.Name,
        student_name:newParent.Student_name,
        email:newParent.email,
        password:password
        //image
       }
       console.log(resData);
       res.send({
        message:"Parent added successfully",
        data:resData
       });
    }catch(error){
   console.log(error,"add parent error");
    }
};
//To get all parents
const getParents=async(req,res)=>{
    try{
        const ParentsData=await ParentModel.find();
        res.send({
            message:"Parentss data fetched successfully",
            data:ParentsData
    })
    }catch(error){
        res.send({
            message:"Error",
        })
        console.log(error,"error parents");
    }
    
};

//get particular data with id
const getParentById=async(req,res)=>{
    try{
        const id=req.params.parantssid;

        const Parent=await ParentModel.findById(id);
        if(!Parent){
            res.send({
                message:"Parent data not available"
            })
        }
        res.send({
            message:"Parent data fetched successfully",
            data:Parent
        })
    }catch(error){
        res.send({
            message:"Error",
        })
        console.log(error,"error ");
    }
};

//update
const updateParent=async(req,res)=>{
    const {name,studentname,studentId,phonenumber,address,pincode}=req.body; 
    try{
       const id=req.params.parentid;
       const isParentAvailable=await ParentModel.findById(id);
       if(!isParentAvailable){
        res.send({
            message:"Parent not available"
        })
       }

       const updatedParent=await ParentModel.findByIdAndUpdate(
        id,
        req.body,
       { returnDocument: "after" } 
    );
    res.send({
        message:"updated parent data",
        data:updatedParent
    })
    }catch(error){
   res.send({
    message:"Not updated"
   })
    }
};

//delete
const deleteParent=async(req,res)=>{
  const id=req.params.parentid;
    const ParentAvailable=await ParentModel.findById(id); 
    if(!ParentAvailable){
        res.send({
            message:"No Parent"
        })
    }
   await ParentModel.findByIdAndDelete(id);
   res.send({
    message:"Parent data deleted successfully"
   })
}
//Login
const ParentLogin=async(req,res)=>{
    const{inputtedEmail,inputtedPassword}=req.body;
    try {
        if(!inputtedEmail||!inputtedPassword){
            res.send({
                message:"Enter Valid email and password"
            })
        }
        const fetchedParentData=await ParentModel.findOne({email:inputtedEmail});
        if(!fetchedParentData){
            res.send({
                message:"No matching email found"
            })
        }
        if(fetchedParentData.password===inputtedPassword)
        {

const token = generateRandomToken();
            
            res.send({
                message:"Login Successful",
                data:{
                    email:fetchedParentData.email,
                    token:token,
                    id:fetchedParentData._id,
                    image:fetchedParentData.image     //profile pic url
                }
            })
        }


function generateRandomToken(length = 32) {
  // Generate random bytes and convert to a hex string
  return crypto.randomBytes(length).toString('hex');
}
//const token = generateRandomToken();
//console.log(token);



    } catch (error) {
        
    }
}

module.exports={createParent,getParents,getParentById,updateParent,deleteParent,ParentLogin}

