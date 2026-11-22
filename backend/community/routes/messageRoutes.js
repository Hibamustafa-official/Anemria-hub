
const express = require("express");
const router = express.Router();

// Import authentication middleware
const authMiddleware = require("../middleware/authMiddleware");

// Import message controller functions
const {
    sendMessage,
    getConversation,
    markConversationRead
} = require("../controllers/messageController");

// Protect all message routes
router.use(authMiddleware);

// Send a message to another user
router.post("/:userId", sendMessage);

// Get conversation with another user
router.get("/:userId", getConversation);

// Mark conversation messages as read
router.put("/:userId/read", markConversationRead);

module.exports = router;
