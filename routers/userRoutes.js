import express from "express";
import {
  registerUser,
  loginUser,
  verifyOTP,
} from "../controllers/userController.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/verifyOTP", verifyOTP);

export default router;
