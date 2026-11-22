
const mongoose = require("mongoose");

const Post = require("../models/Post");
const Comment = require("../models/Comment");

// =====================================
// 1. CREATE POST
// =====================================

const createPost = async (req, res) => {
  try {
    const { text, image } = req.body;

    if ((!text || !text.trim()) && !image) {
      return res.status(400).json({
        success: false,
        message: "Post text or image is required"
      });
    }

    const post = await Post.create({
      author: req.userId,
      text: text ? text.trim() : "",
      image: image || ""
    });

    await post.populate("author", "username profilePicture");

    res.status(201).json({
      success: true,
      message: "Post created successfully",
      post
    });
  } catch (error) {
    console.error("Create post error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to create post"
    });
  }
};

// =====================================
// 2. GET ALL POSTS
// =====================================

const getPosts = async (req, res) => {
  try {
    const posts = await Post.find()
      .populate("author", "username profilePicture bio")
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      count: posts.length,
      posts
    });
  } catch (error) {
    console.error("Get posts error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to fetch posts"
    });
  }
};

// =====================================
// 3. GET SINGLE POST
// =====================================

const getPostById = async (req, res) => {
  try {
    const { postId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid post ID"
      });
    }

    const post = await Post.findById(postId)
      .populate("author", "username profilePicture bio");

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found"
      });
    }

    res.status(200).json({
      success: true,
      post
    });
  } catch (error) {
    console.error("Get post error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to fetch post"
    });
  }
};

// =====================================
// 4. DELETE MY POST
// =====================================

const deletePost = async (req, res) => {
  try {
    const { postId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid post ID"
      });
    }

    const post = await Post.findOneAndDelete({
      _id: postId,
      author: req.userId
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found or you are not the owner"
      });
    }

    // Delete comments associated with this post
    await Comment.deleteMany({
      post: post._id
    });

    res.status(200).json({
      success: true,
      message: "Post deleted successfully"
    });
  } catch (error) {
    console.error("Delete post error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to delete post"
    });
  }
};

// =====================================
// 5. LIKE / UNLIKE POST
// =====================================

const toggleLike = async (req, res) => {
  try {
    const { postId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid post ID"
      });
    }

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found"
      });
    }

    const alreadyLiked = post.likes.some(
      (id) => id.toString() === req.userId.toString()
    );

    if (alreadyLiked) {
      post.likes = post.likes.filter(
        (id) => id.toString() !== req.userId.toString()
      );
    } else {
      post.likes.push(req.userId);
    }

    await post.save();

    res.status(200).json({
      success: true,
      message: alreadyLiked ? "Post unliked" : "Post liked",
      liked: !alreadyLiked,
      likesCount: post.likes.length
    });
  } catch (error) {
    console.error("Toggle like error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to update like"
    });
  }
};

// =====================================
// 6. ADD COMMENT
// =====================================

const addComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const { text } = req.body;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid post ID"
      });
    }

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: "Comment text is required"
      });
    }

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found"
      });
    }

    const comment = await Comment.create({
      post: postId,
      author: req.userId,
      text: text.trim()
    });

    await comment.populate("author", "username profilePicture");

    res.status(201).json({
      success: true,
      message: "Comment added successfully",
      comment
    });
  } catch (error) {
    console.error("Add comment error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to add comment"
    });
  }
};

// =====================================
// 7. GET POST COMMENTS
// =====================================

const getComments = async (req, res) => {
  try {
    const { postId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid post ID"
      });
    }

    const postExists = await Post.exists({
      _id: postId
    });

    if (!postExists) {
      return res.status(404).json({
        success: false,
        message: "Post not found"
      });
    }

    const comments = await Comment.find({
      post: postId
    })
      .populate("author", "username profilePicture")
      .sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      count: comments.length,
      comments
    });
  } catch (error) {
    console.error("Get comments error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to fetch comments"
    });
  }
};

// =====================================
// 8. DELETE MY COMMENT
// =====================================

const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid comment ID"
      });
    }

    const comment = await Comment.findOneAndDelete({
      _id: commentId,
      author: req.userId
    });

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found or you are not the owner"
      });
    }

    res.status(200).json({
      success: true,
      message: "Comment deleted successfully"
    });
  } catch (error) {
    console.error("Delete comment error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to delete comment"
    });
  }
};

// =====================================
// EXPORT FUNCTIONS
// =====================================

module.exports = {
  createPost,
  getPosts,
  getPostById,
  deletePost,
  toggleLike,
  addComment,
  getComments,
  deleteComment
};
