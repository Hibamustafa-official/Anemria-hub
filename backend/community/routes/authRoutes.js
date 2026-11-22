
const express = require("express");
const router = express.Router();

// Import authentication controller functions
const {
    register,
    login
} = require("../controllers/authController");

// Register a new user
router.post("/register", register);

// Login an existing user
router.post("/login", login);

module.exports = router;
