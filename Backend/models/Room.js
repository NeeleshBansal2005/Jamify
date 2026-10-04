import mongoose from "mongoose";

const memberSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    joinedAt: {
      type: Date,
      default: Date.now,
      required: true
    }
  },
  {
    _id: false //Normally Mongoose har subdocument ko apna _id de sakta hai. so we set _id to false to prevent Mongoose from creating an _id for this subdocument.
  }
);

// Reusable schema for every song.
// Used by:
// 1. currentTrack
// 2. queue
const trackSchema = new mongoose.Schema({
providerTrackId: {
    type: String,
    required: true
},

provider: {
    type: String,
    required: true,
    trim: true
  },

 streamUrl: {
    type: String,
    required: true
  },
  
title: {
    type: String,
    required: true,
    trim: true
  },
artist: {
    type: String,
    required: true,
    trim: true
},
cover: {
    type: String,
    default: "" // Optional cover image URL
  },
  duration: {
    type: Number,
    required: true
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  addedAt: {
    type: Date,
    default: Date.now,
    required: true
  }

    
});

const roomSchema = new mongoose.Schema({

    name: {
        type: String,
        required: true,
        trim: true
    },

    genre: {
        type: String,
        trim: true,
        default: ""
    },

    vibe: {
        type: String,
        trim: true,
        default: ""
    },

    // Will point to User after authentication.
    host: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },

    // Users currently belonging to this room.
    // Empty until authentication is implemented.
   members: {
  type: [memberSchema],
  default: []
},

    // Song currently playing.
    currentTrack: {
        type: trackSchema,
        default: null
    },

    // Songs waiting to be played.
    // Current song is NOT stored here.
    queue: {
        type: [trackSchema],
        default: []
    },

    isPlaying: {
        type: Boolean,
        default: false
    },
    playbackPosition: { //playback position is last known position from which current playing segment is being played.
    type: Number,
    default: 0
},

    playbackStartedAt: { //playbackStartedAt = timestamp when that segment started.
    type: Date,
    default: null
},

},
{
    timestamps: true //this will automatically add createdAt and updatedAt fields to the schema, which will be managed by Mongoose.
});

// Reusable schema for a room member.
// who has been in the room the longest.


const Room = mongoose.model("Room", roomSchema);


export default Room;