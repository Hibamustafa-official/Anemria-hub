
const express = require("express");
const router = express.Router();

// Import authentication middleware
const authMiddleware = require("../middleware/authMiddleware");

// Import poll controller functions
const {
    createPoll,
    getPolls,
    getPollById,
    votePoll,
    deletePoll
} = require("../controllers/pollController");

// Protect all poll routes
router.use(authMiddleware);

// Get all polls
router.get("/", getPolls);

// Create a new poll
router.post("/", createPoll);

// Get a single poll
router.get("/:pollId", getPollById);

// Vote in a poll
router.post("/:pollId/vote", votePoll);

// Delete a poll
router.delete("/:pollId", deletePoll);

module.exports = router;
