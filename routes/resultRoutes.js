const express = require("express");
const Result = require("../models/Result"); // Import the Result model
const Quiz = require("../models/Quiz"); // Import the Quiz model for validation
const User = require("../models/User"); // Import the User model for validation
const Question = require("../models/Question");
const verifyToken = require("../middleware/verifyToken");


const router = express.Router();


// Route: Add a quiz result
router.post("/add-result", verifyToken, async (req, res) => {
  const {
    userId,
    quizId,
    score,
    totalQuestions,
    answers, // Updated: Array of objects with questionId, selectedAnswer, isCorrect, correctAnswer
    timeTaken,
    creditsUsed,
  } = req.body;

  console.log("Payload Received in /add-result:", {
      userId,
      quizId,
      score,
      totalQuestions,
      answers,
      timeTaken,
      creditsUsed,
});

  try {
    // Validate user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Validate quiz
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found." });
    }

    // Validate answers: Ensure it's an array of objects with the required fields
    if (
      !Array.isArray(answers) ||
      !answers.every(
        (ans) =>
          typeof ans.questionId === "string" &&
          (typeof ans.selectedAnswer === "string" || Array.isArray(ans.selectedAnswer)) &&
          typeof ans.isCorrect === "boolean" &&
          (typeof ans.correctAnswer === "string" || Array.isArray(ans.correctAnswer))
      )
    ) {
      return res.status(400).json({
        message:
          "Invalid answers format. Each answer must include questionId, selectedAnswer, isCorrect, and correctAnswer.",
      });
    }

    // Save result
    const result = new Result({
      userId,
      quizId,
      score,
      totalQuestions,
      answers, // Save detailed answers
      timeTaken,
      creditsUsed,
    });

    await result.save();

    res.status(201).json({ message: "Result added successfully.", result });
  } catch (err) {
    console.error("Error in /add-result:", err.message);
    res.status(500).json({ error: "Internal server error." });
  }
});




// Route: Get results for the logged-in user
router.get("/", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id; // Extract `userId` from the verified token

    // Fetch results for the logged-in user
    const results = await Result.find({ userId }).populate("quizId", "title"); // Populate the quiz title

    if (!results || results.length === 0) {
      return res.status(404).json({ message: "No results found for this user." });
    }

    res.status(200).json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Route: Get all results for a specific quiz (admin view)
router.get("/quiz/:quizId/admin", verifyToken, async (req, res) => {
  const { quizId } = req.params;

  try {
    const results = await Result.find({ quizId })
      .populate("userId", "username") // Populate user info
      .populate("quizId", "title"); // Populate quiz title

    // Include answers with question details for admin review
    const detailedResults = await Promise.all(
      results.map(async (result) => {
        const detailedAnswers = await Promise.all(
          result.answers.map(async (ans) => {
            const question = await Question.findById(ans.questionId);
            return {
              questionText: question.question,
              selectedAnswer: ans.selectedAnswer,
              isCorrect: ans.isCorrect,
              correctAnswer: ans.correctAnswer,
            };
          })
        );

        return {
          ...result.toObject(),
          detailedAnswers,
        };
      })
    );

    res.status(200).json(detailedResults);
  } catch (err) {
    console.error("Error fetching quiz results:", err.message);
    res.status(500).json({ error: "Internal server error." });
  }
});


// Route: Get result for a specific quiz for the logged-in user
router.get("/:resultId", verifyToken, async (req, res) => {
  const { resultId } = req.params;
  const userId = req.user?.id; // Extract user ID from the token

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized: No user found in request." });
  }

  try {
    console.log(`Fetching result for Result ID: ${resultId}, User ID: ${userId}`);

    // Fetch the result
    const result = await Result.findOne({ _id: resultId, userId })
      .populate("quizId", "title") // Populate quiz title
      .populate("answers.questionId"); // Populate question details

    if (!result) {
      return res.status(404).json({ message: "No result found for the provided ID." });
    }

    // Transform data for detailed answers
    const detailedAnswers = result.answers.map((ans) => {
      const question = ans.questionId;

      // Check if the question exists
      if (!question) {
        console.warn(`Question not found for answer: ${JSON.stringify(ans)}`);
        return {
          questionText: "Question not found.",
          type: null,
          options: [],
          selectedAnswer: ans.selectedAnswer || [],
          isCorrect: ans.isCorrect || false,
          correctAnswer: [],
          explanation: null,
        };
      }

      // Handle matching questions
      if (question.type === "matching") {
        // Check if pairs exist
        if (!Array.isArray(question.pairs) || question.pairs.length === 0) {
          console.warn(`Missing pairs for question: ${question._id}`);
          return {
            questionText: question.question,
            type: "matching",
            details: [],
            explanation: question.explanation || null,
            isCorrect: ans.isCorrect || false,
            selectedAnswer: ans.selectedAnswer || [],
            correctAnswer: [],
          };
        }

        const details = question.pairs.map((pair, idx) => ({
          value: pair.key, // The prompt (e.g., "Black and White")
          correctKey: pair.value, // The correct answer (e.g., "Panda")
          userKey: ans.selectedAnswer?.[idx] || "No answer provided", // The user's answer
        }));

        return {
          questionText: question.question,
          type: "matching",
          details: details,
          explanation: question.explanation,
          isCorrect: ans.isCorrect,
          selectedAnswer: ans.selectedAnswer,
          correctAnswer: question.pairs.map((pair) => pair.value), // Array of correct answers
        };
      }

      // Handle non-matching questions
      return {
        questionText: question.question,
        type: question.type || null,
        options: question.options || [],
        selectedAnswer: ans.selectedAnswer || [],
        isCorrect: ans.isCorrect || false,
        correctAnswer: question.correctAnswers || [],
        explanation: question.explanation || null,
      };
    });

    // Return the transformed result
    res.status(200).json({
      ...result.toObject(),
      detailedAnswers,
    });
  } catch (err) {
    console.error("Error fetching result by ID:", err.message);
    res.status(500).json({ error: "Internal server error." });
  }
});


// Route: Get all results (paginated)
router.get("/all", verifyToken, async (req, res) => {
  const { page = 1, limit = 10 } = req.query; // Default pagination values

  try {
    const results = await Result.find({})
      .populate("userId", "username")
      .populate("quizId", "title")
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const totalResults = await Result.countDocuments();

    // Fetch detailed answers for each result
    const detailedResults = await Promise.all(
      results.map(async (result) => {
        const detailedAnswers = await Promise.all(
          result.answers.map(async (ans) => {
            const question = await Question.findById(ans.questionId);
            return {
              questionText: question.question,
              selectedAnswer: ans.selectedAnswer,
              isCorrect: ans.isCorrect,
              correctAnswer: ans.correctAnswer,
            };
          })
        );

        return {
          ...result.toObject(),
          detailedAnswers,
        };
      })
    );

    res.status(200).json({
      results: detailedResults,
      totalPages: Math.ceil(totalResults / limit),
      currentPage: page,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;