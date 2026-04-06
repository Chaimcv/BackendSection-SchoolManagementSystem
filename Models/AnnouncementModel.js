const mongoose=require("mongoose");
const AnnouncementSchema=mongoose.Schema({
    ImageUrl:{
    type:String
    },
    Title:{
        type:String
    },
    Description:{
        type:String
    }
},
{
    Timestamp:true
})
module.exports=mongoose.model("announcement",AnnouncementSchema);
