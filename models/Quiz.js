const mongoose = require("mongoose");

// Schema for individual questions in a quiz
const QuizQuestionSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: "Question" }, // Reference to the `questions` collection
  displayOrder: { type: Number } // Order of the question in the quiz
});

// Main quiz schema
const QuizSchema = new mongoose.Schema(
  {
    title: { type: String }, // Title of the quiz
    questions: [QuizQuestionSchema], // Array of questions with `questionId` and `displayOrder`
    timeLimit: { type: Number }, // Time limit in seconds
    passMark: { type: Number }, // Minimum percentage to pass
    creditRequired: { type: Number }, // Optional credits required
    status: { type: String }, // Status of the quiz
  },
  { timestamps: true } // Adds `createdAt` and `updatedAt`
);

module.exports = mongoose.model("Quiz", QuizSchema);