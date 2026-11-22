
const mongoose = require("mongoose");

const pollSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
      trim: true
    },

    options: [
      {
        text: {
          type: String,
          required: true,
          trim: true
        },

        votes: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
          }
        ]
        }
    ],

    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    expiresAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

const Poll = mongoose.model("Poll", pollSchema);

module.exports = Poll;
