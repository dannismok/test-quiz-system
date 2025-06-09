const express = require("express");
const Result = require("../models/Result"); // Import the Result model
const Quiz = require("../models/Quiz"); // Import the Quiz model for validation
const User = require("../models/User"); // Import the User model for validation
const verifyToken = require("../middleware/verifyToken");


const router = express.Router();


// Route: Add a quiz result
router.post("/add-result", verifyToken, async (req, res) => {
  const {
    userId,
    quizId,
    score,
    totalQuestions,
    answers,
    timeTaken,
    creditsUsed,
  } = req.body;

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

    // Validate answers: Ensure it's an array of numbers
    if (
      !Array.isArray(answers) ||
      !answers.every((ans) => typeof ans === "number" || ans === null)
    ) {
      return res.status(400).json({
        message: "Invalid answers format. Expected an array of numbers.",
      });
    }

    // Save result
    const result = new Result({
      userId,
      quizId,
      score,
      totalQuestions,
      answers,
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


// Route: Get all results for a specific quiz 
router.get("/quiz/:quizId/admin",verifyToken, async (req, res) => {
  const { quizId } = req.params;

  try {
    const results = await Result.find({ quizId })
      .populate("userId", "username") // Populate user info
      .populate("quizId", "title"); // Populate quiz title

    res.status(200).json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const handleViewQuizDetails = async (quizId) => {
  try {
    const token = localStorage.getItem("token");

    if (!token) {
      throw new Error("No token found. Please log in.");
    }

    // Fetch the quiz details
    const quizResponse = await axios.get(
      `${API_BASE_URL}/api/quizzes/${quizId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    // Fetch the user's quiz result for this quiz
    const resultResponse = await axios.get(
      `${API_BASE_URL}/api/results/${quizId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    // Combine the quiz details with the user's result
    const detailedQuiz = {
      ...quizResponse.data,
      userAnswers: resultResponse.data.answers, // Include user answers
    };

    setSelectedQuiz(detailedQuiz); // Set the selected quiz for detailed view
  } catch (err) {
    console.error("Error fetching quiz details:", err);
    alert("Failed to fetch quiz details.");
  }
};


// Route: Get result for a specific quiz for the logged-in user
router.get("/:quizId", verifyToken, async (req, res) => {
  const { quizId } = req.params; // Extract quizId from the request params
  const userId = req.user.id; // Extract userId from the verified token

  try {
    // Fetch the result for the specific quiz and user
    const result = await Result.findOne({ quizId, userId }).populate("quizId", "title");

    if (!result) {
      return res.status(404).json({ message: "No result found for this quiz." });
    }

    res.status(200).json(result); // Return the result
  } catch (err) {
    console.error("Error fetching result:", err.message);
    res.status(500).json({ error: "Internal server error." });
  }
});


// Route: Get all results 
router.get("/all", verifyToken, async (req, res) => {
  const { page = 1, limit = 10 } = req.query; // Default pagination values

  try {
    const results = await Result.find({})
      .populate("userId", "username")
      .populate("quizId", "title")
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const totalResults = await Result.countDocuments();
    res.status(200).json({
      results,
      totalPages: Math.ceil(totalResults / limit),
      currentPage: page,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;