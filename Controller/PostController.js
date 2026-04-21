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

    res.status(201).json({message:"new post created in controller",
      data:newPost});  //created successfully
    
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
    res.send({
      message:"All posts",
      data:posts
    })
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.likePost = async (req, res) => {       // toggle like=👉 If the user already liked the post → remove like,👉 If not → add like
  try {
    const post = await Post.findById(req.params.id);

    const alreadyLiked = post.likes.includes(req.Student.id);  //the id of student who already liked

    if (alreadyLiked) {
      post.likes = post.likes.filter(
        (id) => id.toString() !== req.Student.id
      );
    } else {
      post.likes.push(req.user.id);
    }

    await post.save();
    res.json(post.likes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.addComment = async (req, res) => {
  try {
    const { text } = req.body;

    const post = await Post.findById(req.params.id);

    post.comments.push({
      user: req.Student.id,
      text
    });

    await post.save();

    res.json(post.comments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};