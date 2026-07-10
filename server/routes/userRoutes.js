import express from "express";
import CheckAuth from "../middlewares/authMiddleware.js";
import { registerUser, loginUser, getCurrentUser, logoutUser } from "../controllers/userControllers.js";

const router = express.Router();

router.post("/register", registerUser);

router.post("/login", loginUser);

router.get("/", CheckAuth, getCurrentUser);

router.post("/logout", logoutUser);

export default router;
