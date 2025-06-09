const mongoose = require("mongoose");

// Topic Schema
const topicSchema = new mongoose.Schema(
  {
    title: { type: String, required: true }, // Topic title
    videoId: { type: String, required: true }, // Video ID (e.g., YouTube or internal ID)
    description: { type: String }, // Optional description
    duration: { type: Number, required: true }, // Video duration in seconds
  },
  { timestamps: true } // Automatically adds `createdAt` and `updatedAt`
);

// Lesson Schema
const lessonSchema = new mongoose.Schema(
  {
    title: { type: String, required: true }, // Lesson title
    description: { type: String }, // Optional description
    topics: [topicSchema], // Array of topics
    totalTopics: { type: Number, default: 0 }, // Total number of topics in the lesson
    totalDuration: { type: Number, default: 0 }, // Total duration of all topics (in seconds)
    hasQuiz: { type: Boolean, default: false }, // Indicates if the lesson has a quiz
    quizId: { type: mongoose.Schema.Types.ObjectId, ref: "Quiz", default: null }, // Reference to the quiz ID
  },
  { timestamps: true } // Automatically adds `createdAt` and `updatedAt`
);

// Pre-save middleware to calculate `totalTopics` and `totalDuration` for lessons
lessonSchema.pre("save", function (next) {
  this.totalTopics = this.topics.length;
  this.totalDuration = this.topics.reduce((sum, topic) => sum + topic.duration, 0);
  next();
});

// Course Schema
const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true }, // Course title
    description: { type: String }, // Optional course description
    category: { type: String }, // Course category
    lessons: [lessonSchema], // Array of lessons
    price: { type: Number, default: 0 }, // Course price (0 for free courses)
    totalDuration: { type: Number, default: 0 }, // Total duration of all lessons (in seconds)
    hasQuiz: { type: Boolean, default: false }, // Indicates if the course has quizzes
    quizzes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Quiz" }], // Array of quiz IDs
    courseCode: { type: String, unique: true }, // Unique course code
  },
  { timestamps: true } // Automatically adds `createdAt` and `updatedAt`
);

// Pre-save middleware to calculate `totalDuration` for courses
courseSchema.pre("save", function (next) {
  // Calculate the total duration of the course
  this.totalDuration = this.lessons.reduce((sum, lesson) => sum + lesson.totalDuration, 0);

  // Update `hasQuiz` based on whether quizzes are associated with the course
  this.hasQuiz = this.quizzes.length > 0;

  next();
});


// Export the Course model
module.exports = mongoose.model("Course", courseSchema);