import mongoose from "mongoose";

const otpStoreSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  otp: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 600,
  },
});

const OTPStore = mongoose.model("OTPStore", otpStoreSchema);

export default OTPStore;
