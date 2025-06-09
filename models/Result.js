const mongoose = require("mongoose");
const { Schema } = mongoose;

const resultSchema = new mongoose.Schema(
  {
    quizId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quiz",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    score: {
      type: Number,
      required: true,
    },
    totalQuestions: {
      type: Number,
      required: true,
    },
    answers: {
      type: [Number], // Store indices of the user's selected answers
      required: true,
    },
    submittedAt: {
      type: Date,
      default: Date.now, // Automatically set the date when creating the document
    },
    timeTaken: {
      type: Number, // Time taken in seconds
      required: true, // Make it required since it's essential for quiz history
    },
    creditsUsed: {
      type: Number, // Number of credits consumed for this attempt
      required: true, // Make it required to track usage
    },
  },
  { timestamps: true } // Enable createdAt and updatedAt fields
);

module.exports = mongoose.model("Result", resultSchema);