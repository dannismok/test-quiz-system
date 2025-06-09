const mongoose = require("mongoose");

const registrationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  quizId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Quiz",
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  creditPoints: {
    type: Number,
    required: true,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

// Define the isValid method as an instance method
registrationSchema.methods.isValid = function () {
  const now = new Date();
  return this.isActive && now >= this.startDate && now <= this.endDate && this.creditPoints > 0;
};

module.exports = mongoose.model("Registration", registrationSchema);