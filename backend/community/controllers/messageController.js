
const Message = require("../models/Message");
const User = require("../models/User");

// Send Message
const sendMessage = async (req, res) => {
  try {
    const receiverId = req.params.userId;
    const senderId = req.userId;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message text is required."
      });
    }

    if (senderId === receiverId) {
      return res.status(400).json({
        success: false,
        message: "You cannot send a message to yourself."
      });
    }

    const receiver = await User.findById(receiverId);

    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: "Receiver not found."
      });
    }

    const message = await Message.create({
      sender: senderId,
      receiver: receiverId,
      text: text.trim()
    });

    res.status(201).json({
      success: true,
      message: "Message sent successfully.",
      data: message
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get Conversation
const getConversation = async (req, res) => {
  try {
    const otherUserId = req.params.userId;

    const otherUser = await User.findById(otherUserId);

    if (!otherUser) {
      return res.status(404).json({
        success: false,
        message: "User not found."
      });
    }

    const messages = await Message.find({
      $or: [
        {
          sender: req.userId,
          receiver: otherUserId
        },
        {
          sender: otherUserId,
          receiver: req.userId
        }
      ]
    })
      .sort({ createdAt: 1 })
      .limit(100);

    res.json({
      success: true,
      messages
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Mark Conversation as Read
const markConversationRead = async (req, res) => {
  try {
    const otherUserId = req.params.userId;

    await Message.updateMany(
      {
        sender: otherUserId,
        receiver: req.userId,
        isRead: false
      },
      {
        $set: { isRead: true }
      }
    );

    res.json({
      success: true,
      message: "Messages marked as read."
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  sendMessage,
  getConversation,
  markConversationRead
};
