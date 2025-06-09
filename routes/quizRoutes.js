const express = require("express");
const mongoose = require('mongoose');
const router = express.Router();
const Quiz = require("../models/Quiz"); // Import Quiz model
const Question = require('../models/Question'); // Your Question model
const Registration = require("../models/Registration");
const Course = require("../models/Course"); // Import Course model


// Get All Quizzes
router.get("/", async (req, res) => {
  try {
    const quizzes = await Quiz.find().populate("questions.questionId"); // Populate question details
    res.status(200).json(quizzes);
  } catch (err) {
    res.status(500).json({ message: "Error fetching quizzes", error: err });
  }
});

router.get('/:quizId', async (req, res) => {
    const { quizId } = req.params;

    try {
        if (!mongoose.Types.ObjectId.isValid(quizId)) {
            return res.status(400).json({ error: 'Invalid quizId format' });
        }

        const quiz = await Quiz.findById(quizId).populate('questions');
        if (!quiz) {
            return res.status(404).json({ error: 'Quiz not found' });
        }

        res.status(200).json(quiz);
    } catch (error) {
        console.error('Error fetching quiz:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Add a New Quiz
// Create a New Quiz
router.post("/", async (req, res) => {
  try {
    const { title, timeLimit, passMark, status } = req.body;

    // Validate required fields
    if (!title || !timeLimit || !passMark) {
      return res.status(400).json({ error: "All fields are required." });
    }

    // Create and save the new quiz
    const newQuiz = new Quiz({
      title,
      timeLimit,
      passMark,
      status,
      questions: [], // Initialize with no questions
    });

    const savedQuiz = await newQuiz.save();
    res.status(201).json(savedQuiz); // Return the newly created quiz
  } catch (error) {
    console.error("Error creating quiz:", error);
    res.status(500).json({ error: "Failed to create quiz." });
  }
});

// Update a Quiz by ID
router.put("/:id", async (req, res) => {
  try {
    const updatedQuiz = await Quiz.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updatedQuiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }
    res.status(200).json(updatedQuiz);
  } catch (err) {
    res.status(400).json({ message: "Error updating quiz", error: err });
  }
});


// Delete a Quiz
router.delete("/:quizId", async (req, res) => {
  const { quizId } = req.params;

  try {
    // Check if there are any registrations associated with the quiz
    const registrationCount = await Registration.countDocuments({ quizId });
    if (registrationCount > 0) {
      return res.status(400).json({
        error: "Quiz cannot be deleted because there are associated registrations.",
      });
    }

    // Attempt to delete the quiz
    const deletedQuiz = await Quiz.findByIdAndDelete(quizId);
    if (!deletedQuiz) {
      return res.status(404).json({ error: "Quiz not found." });
    }

    res.status(200).json({ message: "Quiz deleted successfully." });
  } catch (error) {
    console.error("Error deleting quiz:", error);
    res.status(500).json({ error: "Failed to delete quiz." });
  }
});

// Add Question to Quiz
router.post("/:quizId/add-question", async (req, res) => {
  try {
    const { quizId } = req.params;
    const { questionId } = req.body;

    // Validate inputs
    if (!quizId || !questionId) {
      return res.status(400).json({ error: "Quiz ID and Question ID are required." });
    }

    // Find the quiz
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ error: "Quiz not found." });
    }

    // Check if the question is already in the quiz
    const existingQuestion = quiz.questions.find(
      q => q.questionId && q.questionId.toString() === questionId
    );
    if (existingQuestion) {
      return res.status(400).json({ error: "Question is already in the quiz." });
    }

    // Add the question to the quiz
    const displayOrder = quiz.questions.length + 1; // Assign the next displayOrder
    quiz.questions.push({ questionId, displayOrder });

    // Save the updated quiz
    await quiz.save();

    res.status(200).json({ message: "Question added to quiz successfully." });
  } catch (error) {
    console.error("Error adding question to quiz:", error);
    res.status(500).json({ error: "Failed to add question to quiz." });
  }
});

// Remove a question from a quiz
router.post("/:quizId/remove-question", async (req, res) => {
  const { quizId } = req.params;
  const { questionId } = req.body;

  try {
    if (!mongoose.Types.ObjectId.isValid(quizId) || !mongoose.Types.ObjectId.isValid(questionId)) {
      return res.status(400).json({ error: "Invalid quizId or questionId format" });
    }

    // Remove the questionId from the quiz
    const quiz = await Quiz.findByIdAndUpdate(
      quizId,
      { $pull: { questions: { questionId } } }, // Remove the question
      { new: true } // Return the updated quiz
    );

    if (!quiz) {
      return res.status(404).json({ error: "Quiz not found." });
    }

    res.status(200).json({ message: "Question removed from quiz.", quiz });
  } catch (error) {
    console.error("Error removing question from quiz:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});


// Fetch questions by IDs
router.post("/questions/by-ids", async (req, res) => {
    const { questionIds } = req.body;

    try {
        if (!Array.isArray(questionIds)) {
            return res.status(400).json({ error: "questionIds must be an array." });
        }

        // Find questions matching the provided IDs
        const questions = await Question.find({ _id: { $in: questionIds } });

        res.status(200).json(questions);
    } catch (error) {
        console.error("Error fetching questions by IDs:", error);
        res.status(500).json({ error: "Internal server error." });
    }
});


router.post("/:quizId/update-order", async (req, res) => {
    const { quizId } = req.params;
    const { questions } = req.body;

    try {
        // Validate quizId
        if (!mongoose.Types.ObjectId.isValid(quizId)) {
            return res.status(400).json({ error: "Invalid quizId format." });
        }

        // Validate questions array
        if (!Array.isArray(questions) || questions.some(q => !mongoose.Types.ObjectId.isValid(q.questionId))) {
            return res.status(400).json({ error: "Invalid questionId format in questions array." });
        }

        // Fetch the quiz
        const quiz = await Quiz.findById(quizId);
        if (!quiz) {
            return res.status(404).json({ error: "Quiz not found." });
        }

        // Debug: Log the quiz and incoming question IDs
        console.log("Quiz found:", quiz);
        console.log("Incoming questions:", questions);

        // Update the displayOrder of each question
        questions.forEach(updatedQuestion => {
            const question = quiz.questions.find(q => q.questionId?.toString() === updatedQuestion.questionId);

            if (question) {
                question.displayOrder = updatedQuestion.displayOrder;
            } else {
                console.warn(`Question with ID ${updatedQuestion.questionId} not found in quiz.`);
            }
        });

        // Sort the questions by displayOrder
        quiz.questions = quiz.questions.sort((a, b) => a.displayOrder - b.displayOrder);

        // Save the updated quiz
        await quiz.save();

        res.status(200).json({ message: "Question order updated successfully.", quiz });
    } catch (error) {
        console.error("Error updating question order:", error);
        res.status(500).json({ error: "Internal server error." });
    }
});


// Force delete a quiz
router.delete("/:quizId/force", async (req, res) => {
  const { quizId } = req.params;

  try {
    // Step 1: Validate the `quizId`
    if (!mongoose.Types.ObjectId.isValid(quizId)) {
      return res.status(400).json({ error: "Invalid quiz ID format." });
    }

    // Step 2: Delete all registrations associated with the quiz
    const deletedRegistrations = await Registration.deleteMany({ quizId });
    console.log(`Deleted ${deletedRegistrations.deletedCount} registrations for quiz ${quizId}`);

    // Step 3: Remove references to the quiz from courses
    const updatedCourses = await Course.updateMany(
      { quizzes: quizId }, // Find courses that reference this quiz
      { $pull: { quizzes: quizId } } // Remove the quiz ID from the quizzes array
    );
    console.log(`Updated ${updatedCourses.modifiedCount} courses to remove quiz association.`);

    // Step 4: Delete the quiz
    const deletedQuiz = await Quiz.findByIdAndDelete(quizId);
    if (!deletedQuiz) {
      return res.status(404).json({ error: "Quiz not found." });
    }

    // Respond with success
    res.status(200).json({
      message: "Quiz and all associated data deleted successfully.",
      details: {
        deletedRegistrations: deletedRegistrations.deletedCount,
        updatedCourses: updatedCourses.modifiedCount,
      },
    });
  } catch (error) {
    console.error("Error force deleting quiz:", error);
    res.status(500).json({ error: "Failed to force delete quiz." });
  }
});


module.exports = router;