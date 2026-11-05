const PostModel = require("../Models/PostModel");
const mongoose = require("mongoose");
const cloudinary = require("../config/cloudinary");

// Create Post
exports.createPost = async (req, res) => {
  try {
    const Text = req.body.Text || req.body.text || "";
    let imageUrl = "";

    if (req.file && req.file.path) {
      imageUrl = req.file.path;   // multer-storage-cloudinary directly provides the Cloudinary URL
    }

    const newPost = await PostModel.create({
      student: req.Student.id,     //only loggedin student can create post
      text: Text || "",
      imageUrl: imageUrl
    });

    const populatedPost = await PostModel.findById(newPost._id).populate("student", "Name ProfileImageUrl");

    res.status(201).json({
      message: "Post created successfully",
      data: populatedPost  //name and profileimageUrl will be send to frontend
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get All Posts
exports.getPosts = async (req, res) => {
  try {
    const posts = await PostModel.find()

      .populate("student", "Name ProfileImageUrl")    // by using populate,datas would be more structured and name also added(frontend shows name and not just ID)
      .populate("comments.student", "Name ProfileImageUrl")
      .sort({ createdAt: -1 }); //descending order,i.e latest post first



    res.json({
      message: "All posts fetched successfully",
      data: posts
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update Post
exports.updatePost = async (req, res) => {
  try {
    const post = await PostModel.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    // Check ownership
    if (post.student.toString() !== req.Student.id) {
      return res.status(403).json({ message: "Unauthorized to edit this post" });
    }  //It compares the ID of the post's creator with the ID of the logged-in user. If they don't match, it returns 403 Unauthorized.

    const Text = req.body.Text || req.body.text || "";
    if (Text) post.text = Text;  // If a new Text or a new image is provided, it updates those specific fields.

    if (req.file && req.file.path) {
      post.imageUrl = req.file.path;
    }

    await post.save();
    const updatedPost = await PostModel.findById(post._id) //Saves the changes, re-populates the data for the UI, and sends back the result.
      .populate("student", "Name ProfileImageUrl")
      .populate("comments.student", "Name ProfileImageUrl");

    res.json({ message: "Post updated successfully", data: updatedPost });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete Post
exports.deletePost = async (req, res) => {
  try {
    const post = await PostModel.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    // Finds the post and performs the same Ownership Check as the update function to prevent students from deleting each other's posts.
    // Check ownership
    if (post.student.toString() !== req.Student.id) {
      return res.status(403).json({ message: "Unauthorized to delete this post" });
    }

    await PostModel.findByIdAndDelete(req.params.id);
    res.json({ message: "Post deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Like/Unlike Post
exports.likePost = async (req, res) => {
  try {
    const post = await PostModel.findById(req.params.id);

    const studentId = req.Student.id;
    const alreadyLiked = post.likes.some(id => id.toString() === studentId);

    if (alreadyLiked) {
      post.likes = post.likes.filter((id) => id.toString() !== studentId);
    } else {
      post.likes.push(studentId);
    }

    await post.save();
    
    // Return fully populated post to keep frontend perfectly synced
    const updatedPost = await PostModel.findById(post._id)
      .populate("student", "Name ProfileImageUrl")
      .populate("comments.student", "Name ProfileImageUrl");

    res.json({ message: alreadyLiked ? "Unliked" : "Liked", data: updatedPost });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Add Comment
exports.addComment = async (req, res) => {
  try {  //Gets the comment text and finds the target post.
    const { text } = req.body;
    const post = await PostModel.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    // Pushes a new object into the Comments array containing the student's ID and their text.
    post.comments.push({
      student: req.Student.id,
      text
    });

    await post.save();
    const updatedPost = await PostModel.findById(post._id)
      .populate("student", "Name ProfileImageUrl")
      .populate("comments.student", "Name ProfileImageUrl");

    res.json({ message: "Comment added successfully", data: updatedPost });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};