const express = require("express");
const PostRouter = express.Router();
const {
  getPosts,
  createPost,
  updatePost,
  deletePost,
  likePost,
  addComment
} = require("../Controller/PostController");
const auth = require("../middleware/auth");
const upload = require("../middleware/uploads");

// Public Route
PostRouter.get("/", getPosts);

// Protected Routes
PostRouter.post("/create", auth, upload.single("postImage"), createPost);
PostRouter.put("/:id", auth, upload.single("postImage"), updatePost);
PostRouter.delete("/:id", auth, deletePost);
PostRouter.post("/:id/like", auth, likePost);
PostRouter.post("/:id/comment", auth, addComment);

module.exports = PostRouter;