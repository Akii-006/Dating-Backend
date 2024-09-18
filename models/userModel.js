import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  isVerified: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false },
  birthDate: { type: Date },
  gender: { type: String },
  images: [{ type: String }],
  categorys: [{ type: String }],
  headline: { type: String },
  bio: { type: String },
  aboutMe: {
    work: { type: String },
    education: { type: String },
    location: { type: String },
    homeTown: { type: String },
    lookingFor: { type: String },
    industry: { type: String },
    experience: { type: String },
    educationLevel: { type: String },
    languages: [{ type: String }],
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const User = mongoose.model("User", userSchema);
export default User;
