
const mongoose = require("mongoose");

const User = require("../models/User");
const FriendRequest = require("../models/FriendRequest");
const Friendship = require("../models/Friendship");

// Keep friendship IDs in a consistent order
const getSortedIds = (id1, id2) => {
  return [id1, id2].sort((a, b) =>
    a.toString().localeCompare(b.toString())
  );
};

// Check valid MongoDB ID
const isValidId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

// =====================================
// 1. DISCOVER USERS
// =====================================

const discoverUsers = async (req, res) => {
  try {
    const users = await User.find({
      _id: { $ne: req.userId }
    }).select("username profilePicture bio createdAt");

    res.status(200).json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    console.error("Discover users error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to fetch users"
    });
  }
};

// =====================================
// 2. SEND FRIEND REQUEST
// =====================================

const sendFriendRequest = async (req, res) => {
  try {
    const senderId = req.userId;
    const receiverId = req.params.userId;
    const anime = req.body.anime || "";

    if (!isValidId(receiverId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID"
      });
    }

    if (senderId.toString() === receiverId.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot send request to yourself"
      });
    }

    const receiver = await User.findById(receiverId);

    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const [userA, userB] = getSortedIds(
      senderId,
      receiverId
    );

    const existingFriendship = await Friendship.findOne({
      userA,
      userB
    });

    if (existingFriendship) {
      return res.status(409).json({
        success: false,
        message: "You are already friends"
      });
    }

    // Check reverse pending request
    const reverseRequest = await FriendRequest.findOne({
      sender: receiverId,
      receiver: senderId,
      status: "pending"
    });

    if (reverseRequest) {
      return res.status(409).json({
        success: false,
        message: "This user has already sent you a request. Accept it instead."
      });
    }

    const existingRequest = await FriendRequest.findOne({
      sender: senderId,
      receiver: receiverId
    });

    let request;

    if (existingRequest) {
      if (existingRequest.status === "pending") {
        return res.status(409).json({
          success: false,
          message: "Friend request already sent"
        });
      }

      if (existingRequest.status === "accepted") {
        return res.status(409).json({
          success: false,
          message: "You are already friends"
        });
      }

      // Re-send a previously rejected request
      existingRequest.status = "pending";
      existingRequest.anime = anime;

      request = await existingRequest.save();
    } else {
      request = await FriendRequest.create({
        sender: senderId,
        receiver: receiverId,
        anime,
        status: "pending"
      });
    }

    res.status(201).json({
      success: true,
      message: "Friend request sent successfully",
      request
    });
  } catch (error) {
    console.error("Send request error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to send friend request"
    });
  }
};

// =====================================
// 3. INCOMING REQUESTS
// =====================================

const getIncomingRequests = async (req, res) => {
  try {
    const requests = await FriendRequest.find({
      receiver: req.userId,
      status: "pending"
    })
      .populate("sender", "username profilePicture bio")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: requests.length,
      requests
    });
  } catch (error) {
    console.error("Incoming requests error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to fetch incoming requests"
    });
  }
};

// =====================================
// 4. SENT REQUESTS
// =====================================

const getSentRequests = async (req, res) => {
  try {
    const requests = await FriendRequest.find({
      sender: req.userId,
      status: "pending"
    })
      .populate("receiver", "username profilePicture bio")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: requests.length,
      requests
    });
  } catch (error) {
    console.error("Sent requests error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to fetch sent requests"
    });
  }
};

// =====================================
// 5. ACCEPT FRIEND REQUEST
// =====================================

const acceptFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.params;

    if (!isValidId(requestId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid request ID"
      });
    }

    const request = await FriendRequest.findOne({
      _id: requestId,
      receiver: req.userId,
      status: "pending"
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Pending friend request not found"
      });
    }

    const [userA, userB] = getSortedIds(
      request.sender,
      request.receiver
    );

    await Friendship.findOneAndUpdate(
      { userA, userB },
      {
        $setOnInsert: { userA, userB }
      },
      {
        upsert: true,
        new: true
      }
    );

    request.status = "accepted";
    await request.save();

    res.status(200).json({
      success: true,
      message: "Friend request accepted successfully"
    });
  } catch (error) {
    console.error("Accept request error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to accept friend request"
    });
  }
};

// =====================================
// 6. REJECT FRIEND REQUEST
// =====================================

const rejectFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.params;

    if (!isValidId(requestId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid request ID"
      });
    }

    const request = await FriendRequest.findOneAndUpdate(
      {
        _id: requestId,
        receiver: req.userId,
        status: "pending"
      },
      {
        $set: { status: "rejected" }
      },
      {
        new: true
      }
    );

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Pending friend request not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Friend request rejected"
    });
  } catch (error) {
    console.error("Reject request error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to reject request"
    });
  }
};

// =====================================
// 7. CANCEL SENT REQUEST
// =====================================

const cancelFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.params;

    if (!isValidId(requestId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid request ID"
      });
    }

    const request = await FriendRequest.findOneAndDelete({
      _id: requestId,
      sender: req.userId,
      status: "pending"
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Pending sent request not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Friend request cancelled"
    });
  } catch (error) {
    console.error("Cancel request error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to cancel friend request"
    });
  }
};

// =====================================
// 8. GET FRIENDS LIST
// =====================================

const getFriends = async (req, res) => {
  try {
    const friendships = await Friendship.find({
      $or: [
        { userA: req.userId },
        { userB: req.userId }
      ]
    });

    const friendIds = friendships.map((friendship) => {
      return friendship.userA.toString() === req.userId.toString()
        ? friendship.userB
        : friendship.userA;
    });

    const friends = await User.find({
      _id: { $in: friendIds }
    }).select("username profilePicture bio");

    res.status(200).json({
      success: true,
      count: friends.length,
      friends
    });
  } catch (error) {
    console.error("Get friends error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to fetch friends"
    });
  }
};

// =====================================
// 9. REMOVE FRIEND
// =====================================

const removeFriend = async (req, res) => {
  try {
    const friendId = req.params.userId;

    if (!isValidId(friendId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID"
      });
    }

    const [userA, userB] = getSortedIds(
      req.userId,
      friendId
    );

    const friendship = await Friendship.findOneAndDelete({
      userA,
      userB
    });

    if (!friendship) {
      return res.status(404).json({
        success: false,
        message: "Friendship not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Friend removed successfully"
    });
  } catch (error) {
    console.error("Remove friend error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to remove friend"
    });
  }
};

// =====================================
// 10. SEARCH USERS
// =====================================

const searchUsers = async (req, res) => {
  try {
    const search = req.query.search || "";

    const users = await User.find({
      _id: { $ne: req.userId },
      username: {
        $regex: search,
        $options: "i"
      }
    })
      .select("username profilePicture bio")
      .limit(20);

    res.status(200).json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    console.error("Search users error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to search users"
    });
  }
};

module.exports = {
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
};
