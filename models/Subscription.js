const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId, // Reference to the user
      ref: "User",
      required: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId, // Reference to the course
      ref: "Course",
      required: true,
    },
    subscriptionDate: {
      type: Date, // Date when the subscription started
      default: Date.now,
      required: true,
    },
    expirationDate: {
      type: Date, // Date when the subscription expires
      required: true,
    },
    isActive: {
      type: Boolean, // Whether the subscription is active
      default: true,
    },
    quizzes: [
      {
        quizId: {
          type: mongoose.Schema.Types.ObjectId, // Reference to the quiz
          ref: "Quiz",
          required: true,
        },
        attemptsRemaining: {
          type: Number, // Number of quiz attempts remaining
          default: 3,
        },
        results: [
          {
            attemptDate: {
              type: Date, // Date of the quiz attempt
              default: Date.now,
            },
            score: {
              type: Number, // Quiz score
              required: true,
            },
            isPassed: {
              type: Boolean, // Whether the user passed the quiz
              required: true,
            },
          },
        ],
      },
    ],
    viewRecords: [
      {
        lessonId: {
          type: mongoose.Schema.Types.ObjectId, // Reference to the lesson viewed
          ref: "Lesson",
        },
        topicId: {
          type: mongoose.Schema.Types.ObjectId, // Reference to the topic viewed
          ref: "Topic",
        },
        viewedAt: {
          type: Date, // Date and time when the lesson/topic was viewed
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true } // Automatically adds `createdAt` and `updatedAt`
);

// Middleware to automatically set `isActive` based on expiration date
subscriptionSchema.pre("save", function (next) {
  if (this.expirationDate < Date.now()) {
    this.isActive = false;
  }
  next();
});

// Export the Subscription model
module.exports = mongoose.model("Subscription", subscriptionSchema);