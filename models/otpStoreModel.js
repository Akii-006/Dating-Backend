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
    expires: 600, // This will automatically delete the document after 10 minutes (600 seconds)
  },
});

const OTPStore = mongoose.model("OTPStore", otpStoreSchema);

export default OTPStore;
