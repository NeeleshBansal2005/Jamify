import express from "express";

import {
  searchMusic,
  getMusicById
} from "../controllers/musicControllers.js";


const router = express.Router();

// Search songs
router.get("/search", searchMusic);

// Get complete song data by JioSaavn ID
router.get("/:id", getMusicById);

export default router;