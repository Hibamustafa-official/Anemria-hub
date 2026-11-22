
const express = require("express");
const router = express.Router();

// Import authentication middleware
const authMiddleware = require("../middleware/authMiddleware");

// Import friend controller functions
const {
    discoverUsers,
    sendFriendRequest,
    getIncomingRequests,
    getSentRequests,
    acceptFriendRequest,
    rejectFriendRequest,
    cancelFriendRequest,
    getFriends,
    removeFriend,
    searchUsers
} = require("../controllers/friendController");

// Protect all friend routes
router.use(authMiddleware);

// Discover users
router.get("/discover", discoverUsers);

// Search users
router.get("/search", searchUsers);

// Get friends list
router.get("/", getFriends);

// Get incoming friend requests
router.get("/requests/incoming", getIncomingRequests);

// Get sent friend requests
router.get("/requests/sent", getSentRequests);

// Send friend request
router.post("/request/:userId", sendFriendRequest);

// Accept friend request
router.put("/accept/:requestId", acceptFriendRequest);

// Reject friend request
router.put("/reject/:requestId", rejectFriendRequest);

// Cancel sent friend request
router.delete("/cancel/:requestId", cancelFriendRequest);

// Remove an existing friend
router.delete("/:userId", removeFriend);

module.exports = router;
