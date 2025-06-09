const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: function () {
      return !this.isGoogleUser && !this.isPayPalUser; // Required only for regular users
    },
    unique: true,
  },
  password: {
    type: String,
    required: function () {
      return !this.isGoogleUser && !this.isPayPalUser; // Required only for regular users
    },
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  phone: {
    type: String,
    default: null, // Optional phone field
  },
  isGoogleUser: {
    type: Boolean,
    default: false, // True for users created via Google OAuth
  },
  isPayPalUser: {
    type: Boolean,
    default: false, // True for users created via PayPal
  },
  resetPasswordToken: {
    type: String,
  },
  resetPasswordExpires: {
    type: Date,
  },
  totalCredits: {
    type: Number,
    default: 0, // Default credits for all users
  },
  active: {
    type: Boolean,
    default: true, // New field: Users are active by default
  },
  createdAt: {
    type: Date,
    default: Date.now, // Automatically set creation date
  },
});

module.exports = mongoose.model("User", userSchema);