
const express = require("express");
const router = express.Router();

// Import authentication middleware
const authMiddleware = require("../middleware/authMiddleware");

// Import profile controller functions
const {
    getMyProfile,
    getUserProfile,
    updateProfile
} = require("../controllers/profileController");

// Protect all profile routes
router.use(authMiddleware);

// Get logged-in user's profile
router.get("/me", getMyProfile);

// Update logged-in user's profile
router.put("/me", updateProfile);

// Get another user's profile
router.get("/:userId", getUserProfile);

module.exports = router;
