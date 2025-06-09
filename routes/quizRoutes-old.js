const express = require('express');
const { ObjectId } = require('mongodb'); // Ensure ObjectId is imported
const Quiz = require('../models/Quiz'); // Quiz model
const Result = require('../models/Result'); // Result model
const { verifyToken, verifyAdmin } = require("../middleware/verifyToken");
const router = express.Router();

router.get("/hello2", async(req,res)=>{
    res.status(200).json({name:"Dannis Mok at local Windows"})
})



// ================================
// API: Get all quizzes (Protected)
// ================================
router.get('/quizzes', verifyToken, async (req, res) => {
  console.log('Token payload:', req.user); // Log the decoded token payload
  try {
    const quizzes = await Quiz.find({}, 'title creditRequired'); // Fetch only title and creditRequired
    res.status(200).json(quizzes);
  } catch (err) {
    console.error('Error fetching quizzes:', err);
    res.status(500).json({ message: 'Failed to fetch quizzes.' });
  }
});


router.get("/quizzes/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id; // Extract user ID from the token

    // Validate the quiz ID
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid quiz ID format" });
    }

    // Find the quiz by ID
    const quiz = await Quiz.findById(new ObjectId(id));
    if (!quiz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    // Attempt to find the result for the user and quiz
    const result = await Result.findOne({ quizId: id, userId });

    // Add user answers and explanations to the quiz details if the result exists
    const quizWithUserAnswers = {
      ...quiz.toObject(),
      creditRequired: quiz.creditRequired, // Include creditRequired
      userAnswers: result ? result.answers : null, // Include submitted answers if available, otherwise null
      questions: quiz.questions.map((q) => ({
        question: q.question,
        options: q.options,
        answerIndex: q.answerIndex,
        explanation: q.explanation, // Include explanation
      })),
    };

    res.json(quizWithUserAnswers);
  } catch (error) {
    console.error("Error fetching quiz details:", error);
    res.status(500).json({ error: "Failed to fetch quiz details" });
  }
});

  router.post("/quizzes/:id/submit", verifyToken, async (req, res) => {
    try {
      const { id } = req.params;
      const { answers, timeTaken } = req.body; // Include `timeTaken` in the request body
      const userId = req.user.id; // Extract user ID from token
  
      // Validate quiz ID
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: "Invalid quiz ID format" });
      }
  
      // Find the quiz by ID
      const quiz = await Quiz.findById(new ObjectId(id));
      if (!quiz) {
        return res.status(404).json({ error: "Quiz not found" });
      }
  
      // Validate the answers array
      if (!Array.isArray(answers) || answers.length !== quiz.questions.length) {
        return res.status(400).json({ error: "Invalid answers submitted" });
      }
  
      // Calculate the score and prepare detailed results
      let score = 0;
      const results = quiz.questions.map((question, index) => {
        const isCorrect = answers[index] === question.answerIndex;
        if (isCorrect) score++;
  
        return {
          question: question.question,
          selectedAnswer: question.options[answers[index]] || null,
          correctAnswer: question.options[question.answerIndex],
          explanation: question.explanation, // Include explanation for the question
          isCorrect,
        };
      });
  
      // Save the result to the database
      const result = new Result({
        quizId: id,
        userId,
        score,
        totalQuestions: quiz.questions.length,
        answers, // Save the submitted answers (indices)
        timeTaken, // Save `timeTaken` in seconds
        creditsUsed: quiz.creditRequired, // Use the `creditRequired` field from the Quiz model
        submittedAt: new Date(),
      });
  
      await result.save();
  
      // Respond with the detailed results
      res.json({
        message: "Quiz submitted successfully",
        score,
        totalQuestions: quiz.questions.length,
        timeTaken, // Include the `timeTaken` in the response
        results,
      });
    } catch (error) {
        console.error("Error submitting quiz:", error);
        res.status(500).json({ error: "Failed to submit quiz" });
    }
  });


// ================================
// API: Get results of a quiz (Protected)
// ================================
router.get("/quizzes/:id/results", verifyToken, async (req, res) => {
    try {
      const { id } = req.params;
  
      // Validate and convert `id` to ObjectId
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: "Invalid quiz ID format" });
      }
  
      // Fetch results for the quiz
      const results = await Result.find({ quizId: id }).populate("userId", "name email"); // Populate user details if available
  
      // Include explanations for each question in the results
      const quiz = await Quiz.findById(id);
  
      if (!quiz) {
        return res.status(404).json({ error: "Quiz not found" });
      }
  
      const detailedResults = results.map((result) => ({
        user: result.userId,
        score: result.score,
        totalQuestions: result.totalQuestions,
        submittedAt: result.submittedAt,
        timeTaken: result.timeTaken, // Include `timeTaken` field
        answers: result.answers.map((answerIndex, idx) => ({
          question: quiz.questions[idx].question,
          selectedAnswer: quiz.questions[idx].options[answerIndex] || null,
          correctAnswer: quiz.questions[idx].options[quiz.questions[idx].answerIndex],
          explanation: quiz.questions[idx].explanation,
          isCorrect: answerIndex === quiz.questions[idx].answerIndex,
        })),
      }));
  
      res.json({
        message: "Results fetched successfully",
        results: detailedResults,
      });
    } catch (error) {
      console.error("Error fetching results:", error);
      res.status(500).json({ error: "Failed to fetch results" });
    }
  });

  router.get("/history", verifyToken, async (req, res) => {
    try {
      const userId = req.user.id; // Extract user ID from the token
  
      // Find all results for the user and populate quiz details
      const results = await Result.find({ userId }).populate("quizId");
  
      // Format the history data to include quiz details and creditRequired
      const history = results.map((result) => ({
        quizId: result.quizId._id,
        title: result.quizId.title,
        creditRequired: result.quizId.creditRequired, // Include creditRequired
        score: result.score,
        totalQuestions: result.quizId.questions.length,
        dateTaken: result.submittedAt, // Use `submittedAt` instead of `createdAt`
        timeTaken: result.timeTaken, // Include the `timeTaken` field
      }));
  
      res.json(history);
    } catch (error) {
      console.error("Error fetching quiz history:", error);
      res.status(500).json({ error: "Failed to fetch quiz history" });
    }
  });


module.exports = router;