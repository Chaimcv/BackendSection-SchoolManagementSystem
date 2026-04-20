const PostModel=require("../Models/PostModel");
const mongoose=require("mongoose");

const cloudinary = require("../config/cloudinary");

//create post
exports.createPost = async (req, res) => {
  try {
    const { Text } = req.body;
    let imageUrl = "";

    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path);   //uploads the url from frontend to cloudinary
      image = result.secure_url;   //secure_url=HTTPS version(safe for browser)
    }

    const newPost = await Post.create({
      Student: req.Student.id,     //only loggedin student can create post
      Text,
      ImageUrl: image
    });

    res.status(201).json(newPost);  //created successfully
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getPosts = async (req, res) => {
  try {
    const posts = await Post.find()
      .populate("Student", "Name")    // by using populate,datas would be more structured and name also added(frontend shows name and not just ID)
      .populate("Comments.Student", "Name")
      .sort({ createdAt: -1 }); //descending order,i.e latest post first

    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};