import express from 'express';
import { getSpotifyAccessToken } from '../controllers/SpotifyControllers.js';
import { searchTracks } from '../controllers/SpotifyControllers.js';
const router = express.Router();
router.get('/search',searchTracks);
router.get


export default router;