
const Poll = require("../models/Poll");

// Create Poll
const createPoll = async (req, res) => {
  try {
    const { question, options, expiresAt } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({
        success: false,
        message: "Poll question is required."
      });
    }

    if (!Array.isArray(options) || options.length < 2) {
      return res.status(400).json({
        success: false,
        message: "A poll must have at least two options."
      });
    }

    const cleanedOptions = options.map((option) => ({
      text: typeof option === "string"
        ? option.trim()
        : option.text.trim(),
      votes: []
    }));

    if (cleanedOptions.some((option) => !option.text)) {
      return res.status(400).json({
        success: false,
        message: "Poll options cannot be empty."
      });
    }

    const poll = await Poll.create({
      question: question.trim(),
      options: cleanedOptions,
      author: req.userId,
      expiresAt: expiresAt || null
    });

    res.status(201).json({
      success: true,
      message: "Poll created successfully.",
      poll
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get All Polls
const getPolls = async (req, res) => {
  try {
    const polls = await Poll.find()
      .populate("author", "username profilePicture")
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      polls
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get Single Poll
const getPollById = async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.pollId)
      .populate("author", "username profilePicture");

    if (!poll) {
      return res.status(404).json({
        success: false,
        message: "Poll not found."
      });
    }

    res.json({
      success: true,
      poll
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Vote in Poll
const votePoll = async (req, res) => {
  try {
    const { optionIndex } = req.body;

    if (
      optionIndex === undefined ||
      !Number.isInteger(optionIndex)
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid option index is required."
      });
    }

    const poll = await Poll.findById(req.params.pollId);

    if (!poll) {
      return res.status(404).json({
        success: false,
        message: "Poll not found."
      });
    }

    if (
      poll.expiresAt &&
      new Date(poll.expiresAt) <= new Date()
    ) {
      return res.status(400).json({
        success: false,
        message: "This poll has expired."
      });
    }

    if (
      optionIndex < 0 ||
      optionIndex >= poll.options.length
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid poll option."
      });
    }

    const userId = req.userId;

    // Check if user has already voted
    const alreadyVoted = poll.options.some((option) =>
      option.votes.some(
        (voterId) => voterId.toString() === userId
      )
    );

    if (alreadyVoted) {
      return res.status(400).json({
        success: false,
        message: "You have already voted in this poll."
      });
    }

    poll.options[optionIndex].votes.push(userId);

    await poll.save();

    res.json({
      success: true,
      message: "Vote submitted successfully.",
      poll
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete My Poll
const deletePoll = async (req, res) => {
  try {
    const poll = await Poll.findOneAndDelete({
      _id: req.params.pollId,
      author: req.userId
    });

    if (!poll) {
      return res.status(404).json({
        success: false,
        message: "Poll not found or you are not the owner."
      });
    }

    res.json({
      success: true,
      message: "Poll deleted successfully."
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  createPoll,
  getPolls,
  getPollById,
  votePoll,
  deletePoll
};
