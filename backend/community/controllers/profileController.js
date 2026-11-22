
const User = require("../models/User");

// Get My Profile
const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found."
      });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get User Profile
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found."
      });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update My Profile
const updateProfile = async (req, res) => {
  try {
    const { username, bio, profilePicture } = req.body;

    const updates = {};

    if (username !== undefined) {
      if (!username.trim()) {
        return res.status(400).json({
          success: false,
          message: "Username cannot be empty."
        });
      }

      const existingUser = await User.findOne({
        username: username.trim(),
        _id: { $ne: req.userId }
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Username already exists."
        });
      }

      updates.username = username.trim();
    }

    if (bio !== undefined) {
      updates.bio = bio;
    }

    if (profilePicture !== undefined) {
      updates.profilePicture = profilePicture;
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { $set: updates },
      {
        new: true,
        runValidators: true
      }
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found."
      });
    }

    res.json({
      success: true,
      message: "Profile updated successfully.",
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  getMyProfile,
  getUserProfile,
  updateProfile
};
