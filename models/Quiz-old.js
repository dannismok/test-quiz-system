const mongoose = require("mongoose");

const quizSchema = new mongoose.Schema({
  title: { type: String, required: true },
  questions: [
    {
      question: { type: String, required: true },
      options: { type: [String], required: true },
      answerIndex: { type: Number, required: true }, // Index of the correct answer
      explanation: { type: String, required: true }, // Explanation for the correct answer
    },
  ],
  creditRequired: { type: Number, required: true, default: 0 }, // New field for credits required
});

module.exports = mongoose.model("Quiz", quizSchema);