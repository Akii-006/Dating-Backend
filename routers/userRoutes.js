import express from "express";
import {
  registerUser,
  loginUser,
  verifyOTP,
  resendOTP,
  updateProfile,
  uploadImage,
  getAllUsers,
} from "../controllers/userController.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/verifyOTP", verifyOTP);
router.post("/resendOTP", resendOTP);
router.post("/updateProfile", updateProfile);
router.post("/uploadImage", uploadImage);
router.get("/getAllUsers", getAllUsers);

export default router;
