
const express = require("express");
const router = express.Router();

// Import authentication middleware
const authMiddleware = require("../middleware/authMiddleware");

// Import post controller functions
const {
    createPost,
    getPosts,
    getPostById,
    deletePost,
    toggleLike,
    addComment,
    getComments,
    deleteComment
} = require("../controllers/postController");

// Protect all post routes
router.use(authMiddleware);

// Get all posts
router.get("/", getPosts);

// Create a new post
router.post("/", createPost);

// Get a single post
router.get("/:postId", getPostById);

// Delete a post
router.delete("/:postId", deletePost);

// Like or unlike a post
router.post("/:postId/like", toggleLike);

// Add a comment to a post
router.post("/:postId/comments", addComment);

// Get comments of a post
router.get("/:postId/comments", getComments);

// Delete a comment
router.delete("/comments/:commentId", deleteComment);

module.exports = router;
