const mongoose = require("mongoose");

// Option schema for multiple-choice or single-choice questions
const OptionSchema = new mongoose.Schema({
  text: { type: String, required: true }, // Option text
  graphic: { type: String }, // Optional graphic URL
  isCorrect: { type: Boolean, default: false } // Indicates if this option is correct
});

// Background schema for additional context
const BackgroundSchema = new mongoose.Schema({
  text: { type: String }, // Background text
  graphic: { type: String } // Optional background URL
});

// Main question schema
const QuestionSchema = new mongoose.Schema(
  {
    question: { type: String, required: true }, // Question text
    type: {
      type: String,
      enum: ["multiple_choice", "single_choice", "fill_in_the_blank", "matching", "true_false"],
      required: true,
    }, // Question type with enumerated values
    options: [OptionSchema], // Array of options (only for multiple or single-choice questions)
    correctAnswers: { type: [String], default: [] }, // Correct answers for fill-in-the-blank or true/false
    explanation: { type: String }, // Explanation for the correct answer
    vimeoId: { type: String }, // Vimeo video ID (optional)
    background: BackgroundSchema, // Background (text and/or graphic)
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    }, // Status of the question
    tags: { type: [String] }, // Tags for categorization
    pairs: [
      {
        key: { type: String }, // Key for matching questions
        value: { type: String }, // Value for matching questions
      },
    ],
  },
  { timestamps: true } // Adds createdAt and updatedAt timestamps
);

module.exports = mongoose.model("Question", QuestionSchema);