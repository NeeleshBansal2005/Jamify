import express from "express";
import { registerUser } from "../controllers/authControllers.js";
import { loginUser } from "../controllers/authControllers.js";
import { getCurrentUser } from "../controllers/authControllers.js";
import authmiddleware from "../middleware/auth.js";
import { refreshAccessToken } from "../controllers/authControllers.js";
import { logoutUser } from "../controllers/authControllers.js";
const router = express.Router();    
router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/me",authmiddleware, getCurrentUser);
router.post("/refresh", refreshAccessToken);
router.post("/logout",logoutUser);

export default router;

