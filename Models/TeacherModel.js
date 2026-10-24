const mongoose=require("mongoose");

const TeacherSchema=mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    Email:{
        type:String,
        required:true,
        unique:true
    },
    Password:{
        type:String,
        required:true
    },
    city:{
        type:String
    },
    pin:{
        type:Number
    },
    phoneNumber:{
        type:Number
    },
    subject:{
        type:String
    },
    standard:{
        type:Number
    },
    division:{
        type:String,
        default:null
    },
},
    {
        Timestamp:true
    },
    
)
module.exports=mongoose.model("Teachers",TeacherSchema);   //Teachers(Database)
