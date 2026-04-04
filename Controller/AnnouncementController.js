const AnnouncementModel=require("../Models/AnnouncementModel");
const mongoose=require("mongoose");
const cloudinary = require("../config/cloudinary");



// CREATE NOTICE
// const createNotice = async (req, res) => {
//   try {
//     console.log(req.body,"req.body");
//     const { image, text } = req.body;
//      console.log(image,"image");
//     // Validation
//     if (!image || !text) {
//       return res.status(400).json({
//         message: "Image and Text are required",
//       });
//     }

//     const newNotice = new AnnouncementModel({
//       Image: image,
//       Text: text,
//     });

//     await newNotice.save();

//     res.status(201).json({
//       message: "Notice added successfully",
//       data: newNotice,
//     });
//   } catch (error) {
//     console.error("Create Notice Error:", error);
//     res.status(500).json({
//       message: "Server Error",
//     });
//   }
// };



const createNotice=async(req,res)=>{
    console.log("annoucements");
    const {image,text}=req.body;
    try {
      const newNotice=new AnnouncementModel({
        Image:image,
        Text:text
      });
      await newNotice.save();
      const resData={
        image:newNotice.Image,
        text:newNotice.Text
      } 
      console.log(resData);
      res.send({
        message:"notice added",
        data:resData
      }); 
    } catch (error) {
      console.log(error,"notice error");  
    }
};

const getAllNotices=async(req,res)=>{
    try{
        const AllNotices=await AnnouncementModel.find();
        res.send({
            message:"Notices fetched successfully",
            data:AllNotices
    })
    }catch(error){
        res.send({
            message:"Error",
        })
        console.log(error,"error notice");
    }
    
}
const deleteNotice=async(req,res)=>{
  const id=req.params.noticeid;
    const IsNotice=await AnnouncementModel.findById(id); 
    if(!IsNotice){
        res.send({
            message:"No notice"
        })
    }
   await AnnouncementModel.findByIdAndDelete(id);
   res.send({
    message:"Notice deleted successfully"
   })
}
module.exports={createNotice,getAllNotices,deleteNotice}
