const mongoose = require("mongoose");

const quizResultSchema = new mongoose.Schema({
  registrationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Registration",
    required: true, // Reference to the registration
  },
  quizId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Quiz",
    required: true, // Reference to the quiz
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true, // Reference to the user
  },
  startTime: {
    type: Date,
    required: true, // Quiz start time
  },
  endTime: {
    type: Date,
    required: true, // Quiz end time
  },
  timeTaken: {
    type: Number, // Time taken in seconds
    required: true,
  },
  score: {
    type: Number, // Score achieved in the quiz
    required: true,
  },
  result: {
    type: String,
    enum: ["Pass", "Fail"], // Whether the user passed or failed
    required: true,
  },
}, { timestamps: true });

module.exports = mongoose.model("QuizResult", quizResultSchema);