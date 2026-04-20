const mongoose=require("mongoose");
const PostSchema=mongoose.Schema({
student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Students"
  },
text: String,

ImageUrl: String,

likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Students"
  }],

comments: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: "Students" },
    text: String,
    createdAt: { type: Date, default: Date.now }
  }]

}, { timestamps: true });

module.exports=mongoose.model("Posts",PostSchema);