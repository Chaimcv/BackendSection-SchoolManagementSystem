const express=require("express");
const { createAnnouncement,getAllNotices,deleteNotice }=require("../Controller/AnnouncementController");

const AnnouncementRouter=express.Router();
AnnouncementRouter.post("/",createAnnouncement);
AnnouncementRouter.get("/",getAllNotices);
AnnouncementRouter.delete("/id",deleteNotice);
module.exports=AnnouncementRouter;
