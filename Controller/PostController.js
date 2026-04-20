const PostModel=require("../Models/PostModel");
const mongoose=require("mongoose");

const cloudinary = require("../config/cloudinary");

//create post
exports.createPost = async (req, res) => {
  try {
    const { Text } = req.body;
    let imageUrl = "";

    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path);
      imageUrl = result.secure_url;
    }

    const newPost = await Post.create({
      Student: req.Student.id,
      text,
      image: imageUrl
    });

    res.status(201).json(newPost);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};