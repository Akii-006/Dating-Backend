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
import { sendSuccess, sendError } from "../utils/responseUtil.js";

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
      return sendError(res, "User already exists", 400);
    }

    const otp = authenticator.generate(uuidv4());
    const newUser = new User({ email });
    await newUser.save();

    const emailHtml = template.replace("{{otp}}", otp);
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

    sendSuccess(
      res,
      { token },
      "User registered successfully. Please verify your email with the OTP sent.",
      201
    );
  } catch (error) {
    sendError(res, error);
  }
};

export const verifyOTP = async (req, res) => {
  const { otp, token } = req.body;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    const user = await User.findById(userId);
    if (!user) {
      return sendError(res, "Invalid token or user not found", 400);
    }

    const otpRecord = await OTPStore.findOne({ email: user.email, otp });
    if (!otpRecord) {
      return sendError(res, "Invalid OTP", 400);
    }

    user.isVerified = true;
    await user.save();
    await OTPStore.deleteOne({ email: user.email, otp });

    sendSuccess(res, {}, "OTP verified successfully", 200);
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return sendError(res, "Token expired", 400);
    }
    sendError(res, error);
  }
};

export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return sendError(res, "Invalid email or password", 400);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return sendError(res, "Invalid email or password", 400);
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    sendSuccess(res, { token }, "Login successful", 200);
  } catch (error) {
    sendError(res, error);
  }
};

export const resendOTP = async (req, res) => {
  const { token } = req.body;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    const user = await User.findById(userId);
    if (!user) {
      return sendError(res, "User not found", 400);
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
      html: emailHtml,
    });

    sendSuccess(res, {}, "OTP resent successfully", 200);
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return sendError(res, "Token expired", 400);
    }
    sendError(res, error);
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
      return sendError(res, "User not found", 400);
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
    sendSuccess(res, {}, "Profile updated successfully", 200);
  } catch (error) {
    sendError(res, error);
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
    return sendError(res, "No image provided", 400);
  }

  try {
    const imageName = `image_${Date.now()}.png`;
    const imagePath = saveImage(image, imageName);

    sendSuccess(res, { path: imagePath }, "Image uploaded successfully", 200);
  } catch (error) {
    sendError(res, error);
  }
};
