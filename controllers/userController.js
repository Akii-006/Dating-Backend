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
  const { email } = req.body;

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const otp = authenticator.generate(uuidv4());

    const newUser = new User({
      email,
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
  const { otp, token } = req.body;

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
  console.log("🚀 ~ loginUser ~ req.body:", req.body);

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
    console.log("🚀 ~ loginUser ~ token:", token);
    res.status(200).json({
      message: "Login successful",
      token: token,
    });
  } catch (error) {
    res.status(500).json({ error: error.message || "Server error" });
  }
};

export const resendOTP = async (req, res) => {
  const { token } = req.body;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const newOtp = authenticator.generate(uuidv4());

    await OTPStore.findOneAndUpdate(
      { email: user.email },
      { otp: newOtp },
      { upsert: true, new: true }
    );
    const emailHtml = template.replace("{{otp}}", newOtp);

    await transporter.sendMail({
      from: "matrerajesh.igenerate@gmail.com",
      to: user.email,
      subject: "Your Resent OTP Code",
      text: emailHtml,
    });

    res.status(200).json({ message: "OTP resent successfully" });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(400).json({ message: "Token expired" });
    }
    res.status(500).json({ error: "Server error" });
  }
};

export const updateProfile = async (req, res) => {
  const token = req.headers.authorization;
  const {
    birthDate,
    gender,
    name,
    images,
    categorys,
    headline,
    bio,
    aboutMe,
    password,
  } = req.body;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      user.password = hashedPassword;
    }
    if (birthDate) user.birthDate = birthDate;
    if (gender) user.gender = gender;
    if (name) user.name = name;
    if (headline) user.headline = headline;
    if (bio) user.bio = bio;
    if (images && Array.isArray(images)) user.images = images;
    if (categorys && Array.isArray(categorys)) user.categorys = categorys;

    if (aboutMe) {
      const {
        work,
        education,
        location,
        homeTown,
        lookingFor,
        industry,
        experience,
        educationLevel,
        languages,
      } = aboutMe;
      if (work) user.aboutMe.work = work;
      if (education) user.aboutMe.education = education;
      if (location) user.aboutMe.location = location;
      if (homeTown) user.aboutMe.homeTown = homeTown;
      if (lookingFor) user.aboutMe.lookingFor = lookingFor;
      if (industry) user.aboutMe.industry = industry;
      if (experience) user.aboutMe.experience = experience;
      if (educationLevel) user.aboutMe.educationLevel = educationLevel;
      if (languages && Array.isArray(languages))
        user.aboutMe.languages = languages;
    }

    await user.save();

    res.status(200).json({ message: "Profile updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message || "Server error" });
  }
};

const saveImage = (base64Image, imageName) => {
  const uploadsDir = path.join(__dirname, "..", "uploads");

  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const imagePath = path.join(uploadsDir, imageName);
  const imageBuffer = Buffer.from(base64Image, "base64");
  fs.writeFileSync(imagePath, imageBuffer);
  return imagePath;
};

export const uploadImage = async (req, res) => {
  const { image } = req.body;

  if (!image) {
    return res.status(400).json({ message: "No image provided" });
  }

  try {
    const imageName = `image_${Date.now()}.png`;
    const imagePath = saveImage(image, imageName);

    res.status(200).json({
      message: "Image uploaded successfully",
      path: imagePath,
    });
  } catch (error) {
    res.status(500).json({ error: error.message || "Server error" });
  }
};
