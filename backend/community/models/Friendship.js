
const mongoose = require("mongoose");

const friendshipSchema = new mongoose.Schema(
  {
    userA: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    userB: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  {
    timestamps: true
  }
);

friendshipSchema.index(
  { userA: 1, userB: 1 },
  { unique: true }
);

const Friendship = mongoose.model("Friendship", friendshipSchema);

module.exports = Friendship;
