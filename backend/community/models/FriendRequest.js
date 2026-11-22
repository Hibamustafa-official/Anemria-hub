const mongoose = require("mongoose");

const friendRequestSchema = new mongoose.Schema(
    {
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        receiver: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        anime: {
            type: String,
            trim: true,
            default: ""
        },

        status: {
            type: String,
            enum: ["pending", "accepted", "rejected"],
            default: "pending"
        }
    },
    {
        timestamps: true
    }
);

friendRequestSchema.index(
    { sender: 1, receiver: 1 },
    { unique: true }
);

const FriendRequest = mongoose.model(
    "FriendRequest",
    friendRequestSchema
);

module.exports = FriendRequest;