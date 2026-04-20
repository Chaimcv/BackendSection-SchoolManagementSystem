const mongoose=require("mongoose");
const PostSchema=mongoose.Schema({
Student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Students"
  },
Text: String,

ImageUrl: String,

lengthikes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Students"
  }],

Comments: [{
    Student: { type: mongoose.Schema.Types.ObjectId, ref: "Students" },
    text: String,
    createdAt: { type: Date, default: Date.now }
  }]

}, { timestamps: true });

module.exports=mongoose.model("Posts",PostSchema);