import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema({

  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  refreshTokenHash: {
    type: String,
    required: true
  },

  expiresAt: {
    type: Date,
    required: true
  },

  revoked: {
    type: Boolean,
    default: false
  }

}, {
  timestamps: true
});

const Session = mongoose.model("Session", sessionSchema);

export default Session;