const express = require("express");
const mongoose = require("mongoose");
const Subscription = require("../models/Subscription"); // Import Subscription model
const Registration = require('../models/Registration'); 
const Course = require('../models/Course'); 
const verifyToken = require("../middleware/verifyToken");
const verifyAdmin = require("../middleware/verifyAdmin");

// Initialize the router
const router = express.Router();

/**
 * @route   POST /api/subscriptions
 * @desc    Add a new subscription for a course for a user
 * @access  Public (for admins)
 */
// Subscribe a user to a course
router.post("/", async (req, res) => {
  const { userId, courseId, subscriptionDate, expirationDate } = req.body;

  try {
    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ error: "Invalid userId or courseId format." });
    }

    // Create a course subscription
    const newSubscription = new Subscription({
      userId,
      courseId,
      subscriptionDate,
      expirationDate,
      isActive: true,
    });
    await newSubscription.save();

    // Fetch the course and its lessons
    const course = await Course.findById(courseId).populate("lessons.quizId quizzes");
    if (!course) {
      return res.status(404).json({ error: "Course not found." });
    }

    // Collect all quizzes from the course and its lessons
    const courseQuizzes = course.quizzes || [];
    const lessonQuizzes = course.lessons.flatMap((lesson) => lesson.quizId || []);
    const allQuizzes = [...new Set([...courseQuizzes, ...lessonQuizzes])]; // Remove duplicates

    // Register the user for all quizzes
    const registrations = allQuizzes.map((quizId) => ({
      userId,
      quizId,
      startDate: subscriptionDate,
      endDate: expirationDate,
      creditPoints: 1000, // Default credit points
      isActive: true,
    }));
    await Registration.insertMany(registrations);

    res.status(201).json({ message: "Subscription and quiz registrations created successfully." });
  } catch (error) {
    console.error("Error creating subscription and registering quizzes:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

/**
 * @route   PATCH /api/subscriptions/:id
 * @desc    Update subscription details (e.g., isActive, expirationDate)
 * @access  Public (for admins)
 */
router.patch("/:id", async (req, res) => {
  try {
    const { isActive, expirationDate } = req.body;

    // Find the subscription by ID
    const subscription = await Subscription.findById(req.params.id);

    if (!subscription) {
      return res.status(404).json({ error: "Subscription not found" });
    }

    // Update fields only if they are provided
    if (isActive !== undefined) {
      subscription.isActive = isActive;
    }
    if (expirationDate) {
      subscription.expirationDate = new Date(expirationDate);
    }

    // Save the updated subscription
    await subscription.save();

    res.status(200).json({ message: "Subscription updated successfully", subscription });
  } catch (error) {
    console.error("Error updating subscription:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @route   DELETE /api/subscriptions/:id
 * @desc    Delete a subscription
 * @access  Public (for admins)
 */
router.delete("/:id", async (req, res) => {
  try {
    // Find and delete the subscription by ID
    const subscription = await Subscription.findByIdAndDelete(req.params.id);

    if (!subscription) {
      return res.status(404).json({ error: "Subscription not found" });
    }

    res.status(200).json({ message: "Subscription deleted successfully" });
  } catch (error) {
    console.error("Error deleting subscription:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});


/**
 * @route   GET /api/subscriptions/user
 * @desc    View all subscriptions of a logged-in user (private)
 * @access  Private
 */
router.get("/user", verifyToken, async (req, res) => {
  try {
    const subscriptions = await Subscription.find({ userId: req.user._id }).populate(
      "courseId quizzes.quizId"
    );

    res.status(200).json({ subscriptions });
  } catch (error) {
    console.error("Error fetching user subscriptions:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @route   GET /api/subscriptions/user/:userId
 * @desc    View all subscriptions of a specific user (for admins)
 * @access  Public
 */
router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const subscriptions = await Subscription.find({ userId }).populate(
      "courseId quizzes.quizId"
    );

    res.status(200).json({ subscriptions });
  } catch (error) {
    console.error("Error fetching user subscriptions:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @route   GET /api/subscriptions/course/:courseId
 * @desc    View all subscriptions of a course
 * @access  Public
 */
router.get("/course/:courseId", async (req, res) => {
  try {
    const { courseId } = req.params;

    const subscriptions = await Subscription.find({ courseId }).populate(
      "userId quizzes.quizId"
    );

    res.status(200).json({ subscriptions });
  } catch (error) {
    console.error("Error fetching course subscriptions:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @route   PATCH /api/subscriptions/:id/quiz
 * @desc    Add a quiz to a subscription
 * @access  Public (for admins)
 */
router.patch("/:id/quiz", async (req, res) => {
  try {
    const { quizId } = req.body;

    if (!quizId) {
      return res.status(400).json({ error: "Quiz ID is required" });
    }

    const subscription = await Subscription.findById(req.params.id);

    if (!subscription) {
      return res.status(404).json({ error: "Subscription not found" });
    }

    subscription.quizzes.push({
      quizId,
      attemptsRemaining: 3, // Default attempts
      results: [],
    });

    await subscription.save();
    res.status(200).json({ message: "Quiz added to subscription", subscription });
  } catch (error) {
    console.error("Error adding quiz to subscription:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @route   DELETE /api/subscriptions/:id/quiz
 * @desc    Remove a quiz from a subscription
 * @access  Public (for admins)
 */
router.delete("/:id/quiz", async (req, res) => {
  try {
    const { quizId } = req.body;

    if (!quizId) {
      return res.status(400).json({ error: "Quiz ID is required" });
    }

    const subscription = await Subscription.findById(req.params.id);

    if (!subscription) {
      return res.status(404).json({ error: "Subscription not found" });
    }

    subscription.quizzes = subscription.quizzes.filter(
      (quiz) => quiz.quizId.toString() !== quizId
    );

    await subscription.save();
    res.status(200).json({ message: "Quiz removed from subscription", subscription });
  } catch (error) {
    console.error("Error removing quiz from subscription:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @route   PATCH /api/subscriptions/:id/quiz/attempts
 * @desc    Update quiz attempts or results
 * @access  Public (for admins)
 */
router.patch("/:id/quiz/attempts", async (req, res) => {
  try {
    const { quizId, score, isPassed } = req.body;

    if (!quizId || score === undefined || isPassed === undefined) {
      return res.status(400).json({ error: "Quiz ID, score, and pass status are required" });
    }

    const subscription = await Subscription.findById(req.params.id);

    if (!subscription) {
      return res.status(404).json({ error: "Subscription not found" });
    }

    const quiz = subscription.quizzes.find((q) => q.quizId.toString() === quizId);

    if (!quiz) {
      return res.status(404).json({ error: "Quiz not found in subscription" });
    }

    if (quiz.attemptsRemaining <= 0) {
      return res.status(400).json({ error: "No attempts remaining for this quiz" });
    }

    quiz.results.push({ attemptDate: new Date(), score, isPassed });
    quiz.attemptsRemaining -= 1;

    await subscription.save();
    res.status(200).json({ message: "Quiz attempts updated", subscription });
  } catch (error) {
    console.error("Error updating quiz attempts:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @route   PATCH /api/subscriptions/:id/view
 * @desc    Update the view records
 * @access  Public (for admins)
 */
router.patch("/:id/view", async (req, res) => {
  try {
    const { lessonId, topicId } = req.body;

    if (!lessonId && !topicId) {
      return res.status(400).json({ error: "Lesson ID or Topic ID is required" });
    }

    const subscription = await Subscription.findById(req.params.id);

    if (!subscription) {
      return res.status(404).json({ error: "Subscription not found" });
    }

    subscription.viewRecords.push({
      lessonId,
      topicId,
      viewedAt: new Date(),
    });

    await subscription.save();
    res.status(200).json({ message: "View record updated", subscription });
  } catch (error) {
    console.error("Error updating view records:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;