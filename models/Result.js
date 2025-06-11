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
    timeTaken: {
      type: Number, // Time taken in seconds
      required: true,
    },
    creditsUsed: {
      type: Number, // Number of credits consumed for this attempt
      required: true,
    },
    submittedAt: {
      type: Date,
      default: Date.now, // Automatically set the date when creating the document
    },
    answers: [
      {
        questionId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Question",
          required: true,
        }, // Reference to the question
        selectedAnswer: { type: Schema.Types.Mixed }, // Store user's selected answer(s)
        isCorrect: { type: Boolean, required: true }, // Whether the user's answer is correct
        correctAnswer: { type: Schema.Types.Mixed }, // Store the correct answer(s) for reference
      },
    ],
  },
  { timestamps: true } // Enable createdAt and updatedAt fields
);

module.exports = mongoose.model("Result", resultSchema);