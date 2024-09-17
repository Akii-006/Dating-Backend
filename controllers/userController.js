import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import User from "../models/userModel.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import nodemailer from "nodemailer";
import { authenticator } from "otplib";
import OTPStore from "../models/otpStoreModel.js";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "matrerajesh.igenerate@gmail.com",
    pass: "rybihzjkyajnxdbc",
  },
});

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

const templatePath = path.join(
  __dirname,
  "../templates/otp-email-template.html"
);

const template = fs.readFileSync(templatePath, "utf-8");

export const registerUser = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = authenticator.generate(uuidv4());

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      isVerified: false,
    });

    await newUser.save();
    const emailHtml = template
      .replace("{{name}}", name)
      .replace("{{otp}}", otp);

    await OTPStore.create({ email, otp });

    await transporter.sendMail({
      from: "Dating",
      to: email,
      subject: "Your OTP Code",
      html: emailHtml,
    });

    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, {
      expiresIn: "10m",
    });

    res.status(201).json({
      message:
        "User registered successfully. Please verify your email with the OTP sent.",
      token,
    });
  } catch (error) {
    res.status(500).json({ error: error.message || "Server error" });
  }
};
export const verifyOTP = async (req, res) => {
  const { otp } = req.body;
  const token = req.query.token;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(400)
        .json({ message: "Invalid token or user not found" });
    }

    const otpRecord = await OTPStore.findOne({ email: user.email, otp });
    if (!otpRecord) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    user.isVerified = true;
    await user.save();

    await OTPStore.deleteOne({ email: user.email, otp });

    res.status(200).json({ message: "OTP verified successfully" });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(400).json({ message: "Token expired" });
    }
    res.status(500).json({ error: error.message || "Server error" });
  }
};

export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    res.status(200).json({
      message: "Login successful",
      token: token,
    });
  } catch (error) {
    res.status(500).json({ error: error.message || "Server error" });
  }
};
