const express = require("express");
const mongoose = require("mongoose");
const Course = require("../models/Course"); // Import the Course model
const Quiz = require("../models/Quiz"); // Import your Quiz model
const Subscription = require("../models/Subscription"); // Assuming you have a Subscription model
const Registration = require("../models/Registration");
const router = express.Router();
const verifyToken = require("../middleware/verifyToken");
const verifyAdmin = require("../middleware/verifyAdmin");

// ================================
// Middleware to Validate ObjectId
// ================================
const validateObjectId = (req, res, next) => {
  const { courseId, lessonId, topicId } = req.params;

  if (courseId && !mongoose.Types.ObjectId.isValid(courseId)) {
    return res.status(400).json({ error: "Invalid course ID format" });
  }
  if (lessonId && !mongoose.Types.ObjectId.isValid(lessonId)) {
    return res.status(400).json({ error: "Invalid lesson ID format" });
  }
  if (topicId && !mongoose.Types.ObjectId.isValid(topicId)) {
    return res.status(400).json({ error: "Invalid topic ID format" });
  }
  next();
};


// Add a quiz to a lesson
router.post("/:courseId/lessons/:lessonId/quiz", async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;
    const { quizId } = req.body;

    // Validate input
    if (!quizId) {
      return res.status(400).json({ error: "Quiz ID is required." });
    }

    // Find the course
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: "Course not found." });
    }

    // Find the lesson
    const lesson = course.lessons.id(lessonId);
    if (!lesson) {
      return res.status(404).json({ error: "Lesson not found." });
    }

    // Check if a quiz is already associated
    if (lesson.quizId && lesson.quizId.toString() === quizId) {
      return res.status(400).json({ error: "This quiz is already associated with the lesson." });
    }

    // Update the lesson
    lesson.quizId = quizId;
    lesson.hasQuiz = true; // Indicate the lesson now has a quiz
    await course.save(); // Save changes to the course

    res.status(200).json({ message: "Quiz successfully added to the lesson.", lesson });
  } catch (error) {
    console.error("Error adding quiz to lesson:", error);
    res.status(500).json({ error: "Failed to add quiz to lesson." });
  }
});

// Remove a quiz from a lesson
router.delete("/:courseId/lessons/:lessonId/quiz", async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;

    // Find the course
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: "Course not found." });
    }

    // Find the lesson
    const lesson = course.lessons.id(lessonId);
    if (!lesson) {
      return res.status(404).json({ error: "Lesson not found." });
    }

    // Check if a quiz is associated
    if (!lesson.quizId) {
      return res.status(400).json({ error: "No quiz is associated with this lesson." });
    }

    // Remove the quiz association
    lesson.quizId = null;
    lesson.hasQuiz = false; // Indicate the lesson no longer has a quiz
    await course.save(); // Save changes to the course

    res.status(200).json({ message: "Quiz successfully removed from the lesson.", lesson });
  } catch (error) {
    console.error("Error removing quiz from lesson:", error);
    res.status(500).json({ error: "Failed to remove quiz from lesson." });
  }
});

// ================================
// API for Courses
// ================================

// Create a New Course
router.post("/", async (req, res) => {
  try {
    const { title, description, category, price, quizzes } = req.body;

    if (!title || !description || !category || price === undefined) {
      return res.status(400).json({ error: "Title, description, and price are required" });
    }

    const newCourse = new Course({
      title,
      description,
      category,
      price,
      quizzes: quizzes || [], // Allow multiple quizzes
      lessons: [],
    });

    await newCourse.save();
    res.status(201).json({ message: "Course created successfully", course: newCourse });
  } catch (error) {
    console.error("Error creating course:", error);
    res.status(500).json({ error: "Failed to create course" });
  }
});

// Update a Course
router.put("/:courseId", validateObjectId, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { title, description, category, price, quizzes } = req.body;

    const updatedCourse = await Course.findByIdAndUpdate(
      courseId,
      { title, description, category, price, quizzes }, // Update quizzes
      { new: true, runValidators: true }
    );

    if (!updatedCourse) {
      return res.status(404).json({ error: "Course not found" });
    }

    res.status(200).json({ message: "Course updated successfully", course: updatedCourse });
  } catch (error) {
    console.error("Error updating course:", error);
    res.status(500).json({ error: "Failed to update course" });
  }
});

// Fetch All Courses with Optional Search Filters
router.get("/", async (req, res) => {
  try {
    const { search, title, category, code } = req.query;

    // Build the search query dynamically
    const query = {};

    // General search across title and code
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } }, // Case-insensitive search in title
        { code: { $regex: search, $options: "i" } },  // Case-insensitive search in code
      ];
    }

    // Individual field filters
    if (title) query.title = { $regex: title, $options: "i" }; // Case-insensitive search for title
    if (category) query.category = { $regex: category, $options: "i" }; // Case-insensitive search for category
    if (code) query.code = { $regex: code, $options: "i" }; // Case-insensitive search for code

    // Find courses and populate quizzes
    const courses = await Course.find(query).populate("quizzes");

    res.status(200).json(courses);
  } catch (error) {
    console.error("Error fetching courses:", error);
    res.status(500).json({ error: "Failed to fetch courses" });
  }
});

// Fetch a Single Course by ID
router.get("/:courseId", validateObjectId, async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findById(courseId).populate("quizzes"); // Populate quizzes
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    res.status(200).json(course);
  } catch (error) {
    console.error("Error fetching course:", error);
    res.status(500).json({ error: "Failed to fetch course" });
  }
});


// Delete a Course
router.delete("/:courseId", async (req, res) => {
  const { courseId } = req.params;

  try {
    // Step 1: Check if there are associated subscriptions
    const subscriptionCount = await Subscription.countDocuments({ courseId });
    if (subscriptionCount > 0) {
      return res.status(400).json({
        error: "Course cannot be deleted because there are active subscriptions.",
      });
    }

    // Step 2: Delete the course
    const deletedCourse = await Course.findByIdAndDelete(courseId);
    if (!deletedCourse) {
      return res.status(404).json({ error: "Course not found." });
    }

    res.status(200).json({ message: "Course deleted successfully." });
  } catch (error) {
    console.error("Error deleting course:", error);
    res.status(500).json({ error: "Failed to delete course." });
  }
});


router.post("/:courseId/quizzes", validateObjectId, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { quizIds } = req.body;

    if (!quizIds || quizIds.length === 0) {
      return res.status(400).json({ error: "At least one quiz ID is required" });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    // Add the new quizzes to the course
    course.quizzes.push(...quizIds);

    // Ensure there are no duplicate quiz IDs
    course.quizzes = [...new Set(course.quizzes)];

    await course.save();
    res.status(200).json({ message: "Quizzes added successfully", course });
  } catch (error) {
    console.error("Error adding quizzes to course:", error);
    res.status(500).json({ error: "Failed to add quizzes" });
  }
});

router.delete("/:courseId/quizzes/:quizId", validateObjectId, async (req, res) => {
  try {
    const { courseId, quizId } = req.params;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    // Remove the quiz from the course
    course.quizzes = course.quizzes.filter((id) => id.toString() !== quizId);

    await course.save();
    res.status(200).json({ message: "Quiz removed successfully", course });
  } catch (error) {
    console.error("Error removing quiz from course:", error);
    res.status(500).json({ error: "Failed to remove quiz" });
  }
});

// Get quizzes associated with a course
router.get("/:courseId/quizzes", async (req, res) => {
  try {
    const { courseId } = req.params;

    // Find the course by ID
    const course = await Course.findById(courseId).populate("quizzes", "title _id");
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    // Return the quizzes associated with the course
    res.status(200).json(course.quizzes);
  } catch (error) {
    console.error("Error fetching quizzes for course:", error);
    res.status(500).json({ error: "Failed to fetch quizzes for the course." });
  }
});


// ================================
// API for Lessons
// ================================

// Add a New Lesson to a Course
router.post("/:courseId/lessons", validateObjectId, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { title, description } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: "Title and description are required" });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    const newLesson = { title, description, topics: [] };
    course.lessons.push(newLesson);
    await course.save();

    res.status(201).json({ message: "Lesson added successfully", lesson: newLesson });
  } catch (error) {
    console.error("Error adding lesson:", error);
    res.status(500).json({ error: "Failed to add lesson" });
  }
});

// Update a Lesson
router.put("/:courseId/lessons/:lessonId", validateObjectId, async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;
    const { title, description } = req.body;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    const lesson = course.lessons.id(lessonId);
    if (!lesson) {
      return res.status(404).json({ error: "Lesson not found" });
    }

    if (title) lesson.title = title;
    if (description) lesson.description = description;

    await course.save();
    res.status(200).json({ message: "Lesson updated successfully", lesson });
  } catch (error) {
    console.error("Error updating lesson:", error);
    res.status(500).json({ error: "Failed to update lesson" });
  }
});


// Fetch All Lessons in a Course
router.get("/:courseId/lessons", validateObjectId, async (req, res) => {
  try {
    const { courseId } = req.params;

    // Find the course and populate the quizId field in each lesson
    const course = await Course.findById(courseId).populate({
      path: "lessons.quizId", // Populate the quizId field in lessons
      select: "title _id", // Include only the quiz title and ID
    });

    if (!course) {
      return res.status(404).json({ error: "Course not found." });
    }

    res.status(200).json(course.lessons); // Return lessons with populated quizzes
  } catch (error) {
    console.error("Error fetching lessons:", error);
    res.status(500).json({ error: "Failed to fetch lessons." });
  }
});

// Fetch a Single Lesson by ID
router.get("/:courseId/lessons/:lessonId", validateObjectId, async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    const lesson = course.lessons.id(lessonId);
    if (!lesson) {
      return res.status(404).json({ error: "Lesson not found" });
    }

    res.status(200).json(lesson);
  } catch (error) {
    console.error("Error fetching lesson:", error);
    res.status(500).json({ error: "Failed to fetch lesson" });
  }
});

// Update a Lesson
router.put("/:courseId/lessons/:lessonId", validateObjectId, async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;
    const { title, description, hasQuiz, totalDuration, totalTopics } = req.body;

    // Find the course
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    // Find the specific lesson
    const lesson = course.lessons.id(lessonId);
    if (!lesson) {
      return res.status(404).json({ error: "Lesson not found" });
    }

    // Update the lesson fields
    if (title !== undefined) lesson.title = title;
    if (description !== undefined) lesson.description = description;
    if (hasQuiz !== undefined) lesson.hasQuiz = hasQuiz;
    if (totalDuration !== undefined) lesson.totalDuration = totalDuration;
    if (totalTopics !== undefined) lesson.totalTopics = totalTopics;

    // Save the updated course
    await course.save();

    res.status(200).json({ message: "Lesson updated successfully", lesson });
  } catch (error) {
    console.error("Error updating lesson:", error);
    res.status(500).json({ error: "Failed to update lesson" });
  }
});

// Delete a Lesson
router.delete("/:courseId/lessons/:lessonId", validateObjectId, async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;

    // Step 1: Find the course
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    // Step 2: Find the lesson in the course
    const lesson = course.lessons.id(lessonId); // Get the lesson subdocument
    if (!lesson) {
      return res.status(404).json({ error: "Lesson not found" });
    }

    // Step 3: Delete all topics associated with the lesson
    // Assuming topics are stored as an array inside the lesson subdocument
    lesson.topics = []; // Clear all topics in the lesson

    // Step 4: Unlink the quiz from the lesson (if any)
    if (lesson.quizId) {
      // Optionally, you could delete the quiz here
      // const quiz = await Quiz.findByIdAndDelete(lesson.quizId);
      lesson.quizId = undefined; // Remove the quiz reference
    }

    // Step 5: Remove the lesson from the course
    course.lessons.pull(lessonId); // Remove the lesson subdocument

    // Save the updated course
    await course.save();

    res.status(200).json({ message: "Lesson and associated data deleted successfully" });
  } catch (error) {
    console.error("Error deleting lesson:", error);
    res.status(500).json({ error: "Failed to delete lesson" });
  }
});


// ================================
// API for Topics in Lessons
// ================================

// Add a New Topic to a Lesson
router.post("/:courseId/lessons/:lessonId/topics", validateObjectId, async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;
    const { title, videoId, description, duration } = req.body;

    if (!title || !videoId || !duration) {
      return res.status(400).json({ error: "Title, videoId, and duration are required" });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    const lesson = course.lessons.id(lessonId);
    if (!lesson) {
      return res.status(404).json({ error: "Lesson not found" });
    }

    const newTopic = { title, videoId, description, duration };
    lesson.topics.push(newTopic);
    await course.save();

    res.status(201).json({ message: "Topic added successfully", topic: newTopic });
  } catch (error) {
    console.error("Error adding topic:", error);
    res.status(500).json({ error: "Failed to add topic" });
  }
});

// Fetch All Topics in a Lesson
router.get("/:courseId/lessons/:lessonId/topics", validateObjectId, async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    const lesson = course.lessons.id(lessonId);
    if (!lesson) {
      return res.status(404).json({ error: "Lesson not found" });
    }

    res.status(200).json(lesson.topics);
  } catch (error) {
    console.error("Error fetching topics:", error);
    res.status(500).json({ error: "Failed to fetch topics" });
  }
});

// Fetch a Single Topic by ID
router.get("/:courseId/lessons/:lessonId/topics/:topicId", validateObjectId, async (req, res) => {
  try {
    const { courseId, lessonId, topicId } = req.params;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    const lesson = course.lessons.id(lessonId);
    if (!lesson) {
      return res.status(404).json({ error: "Lesson not found" });
    }

    const topic = lesson.topics.id(topicId);
    if (!topic) {
      return res.status(404).json({ error: "Topic not found" });
    }

    res.status(200).json(topic);
  } catch (error) {
    console.error("Error fetching topic:", error);
    res.status(500).json({ error: "Failed to fetch topic" });
  }
});

router.put("/:courseId/lessons/:lessonId/topics/:topicId", validateObjectId, async (req, res) => {
  try {
    const { courseId, lessonId, topicId } = req.params;
    const { title, videoId, description, duration } = req.body;

    // Find the course
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    // Find the lesson in the course
    const lesson = course.lessons.id(lessonId);
    if (!lesson) {
      return res.status(404).json({ error: "Lesson not found" });
    }

    // Find the topic in the lesson
    const topic = lesson.topics.id(topicId);
    if (!topic) {
      return res.status(404).json({ error: "Topic not found" });
    }

    // Update the topic fields
    if (title !== undefined) topic.title = title;
    if (videoId !== undefined) topic.videoId = videoId;
    if (description !== undefined) topic.description = description;
    if (duration !== undefined) topic.duration = duration;

    // Save the updated course
    await course.save();

    res.status(200).json({ message: "Topic updated successfully", topic });
  } catch (error) {
    console.error("Error updating topic:", error);
    res.status(500).json({ error: "Failed to update topic" });
  }
});

// Delete a Topic
router.delete("/:courseId/lessons/:lessonId/topics/:topicId", validateObjectId, async (req, res) => {
  try {
    const { courseId, lessonId, topicId } = req.params;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    const lesson = course.lessons.id(lessonId);
    if (!lesson) {
      return res.status(404).json({ error: "Lesson not found" });
    }

    const topic = lesson.topics.id(topicId);
    if (!topic) {
      return res.status(404).json({ error: "Topic not found" });
    }

    lesson.topics.pull(topicId);
    await course.save();

    res.status(200).json({ message: "Topic deleted successfully" });
  } catch (error) {
    console.error("Error deleting topic:", error);
    res.status(500).json({ error: "Failed to delete topic" });
  }
});

// Force delete a course
router.delete("/:courseId/force", verifyToken, verifyAdmin, async (req, res) => {
  const { courseId } = req.params;

  try {
    // Step 1: Delete registrations associated with the course
    const deletedRegistrations = await Registration.deleteMany({ courseId });
    console.log(`Deleted ${deletedRegistrations.deletedCount} registrations for course ${courseId}`);

    // Step 2: Delete subscriptions associated with the course
    const deletedSubscriptions = await Subscription.deleteMany({ courseId });
    console.log(`Deleted ${deletedSubscriptions.deletedCount} subscriptions for course ${courseId}`);

    // Step 3: Delete the course
    const deletedCourse = await Course.findByIdAndDelete(courseId);
    if (!deletedCourse) {
      return res.status(404).json({ message: "Course not found." });
    }

    res.status(200).json({
      message: "Course and all associated registrations and subscriptions deleted successfully.",
    });
  } catch (err) {
    console.error("Error force deleting course:", err);
    res.status(500).json({ message: "Failed to force delete course." });
  }
});


/**
 * Route: Fetch all courses with optional search filters
 * URL: /courses
 * Method: GET
 * Access: Public
 */
router.get("/", async (req, res) => {
  const { title, category, code } = req.query;

  try {
    // Build the query object dynamically based on provided filters
    const query = {};
    if (title) query.title = { $regex: title, $options: "i" };  // Case-insensitive title search
    if (category) query.category = { $regex: category, $options: "i" }; // Case-insensitive category search
    if (code) query.code = { $regex: code, $options: "i" };  // Case-insensitive code search

    // Find courses matching the query
    const courses = await Course.find(query).select("id title category code price"); // Return only necessary fields

    res.status(200).json(courses);
  } catch (err) {
    console.error("Error fetching courses:", err);
    res.status(500).json({ message: "Failed to fetch courses." });
  }
});

module.exports = router;