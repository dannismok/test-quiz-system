const express = require("express");
const router = express.Router();
const Question = require("../models/Question"); // Import Question model
const Quiz = require("../models/Quiz");

// Get All Questions
router.get("/", async (req, res) => {
  try {
    const questions = await Question.find();
    res.status(200).json(questions);
  } catch (err) {
    res.status(500).json({ message: "Error fetching questions", error: err });
  }
});

// Get a Single Question by ID
router.get("/:id", async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }
    res.status(200).json(question);
  } catch (err) {
    res.status(500).json({ message: "Error fetching question", error: err });
  }
});

// Fetch Questions by IDs
router.post("/by-ids", async (req, res) => {
  try {
    const { questionIds } = req.body;

    // Validate request body
    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      return res.status(400).json({ message: "questionIds must be a non-empty array" });
    }

    // Fetch questions matching the provided IDs
    const questions = await Question.find({ _id: { $in: questionIds } });

    // Return the questions
    res.status(200).json(questions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching questions by IDs", error: err });
  }
})



// Add a New Question
// POST: Add a new question
router.post('/', async (req, res) => {
  try {
    const newQuestion = new Question(req.body); // Validate and prepare to save
    await newQuestion.save(); // Save to MongoDB
    res.status(201).json({ message: "Question added successfully!", question: newQuestion });
  } catch (err) {
    console.error("Validation Error:", err.errors); // Log detailed validation errors
    res.status(400).json({ message: "Validation failed", error: err.message, errors: err.errors });
  }
});

// Update a Question by ID
router.put("/:id", async (req, res) => {
  try {
    const updatedQuestion = await Question.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updatedQuestion) {
      return res.status(404).json({ message: "Question not found" });
    }
    res.status(200).json(updatedQuestion);
  } catch (err) {
    res.status(400).json({ message: "Error updating question", error: err });
  }
});

// Delete a Question by ID

// Delete a question
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Step 1: Check if the question exists
    const question = await Question.findById(id);
    if (!question) {
      return res.status(404).json({ error: "Question not found." });
    }

    // Step 2: Check if the question is associated with any quiz
    const quizUsingQuestion = await Quiz.findOne({ "questions.questionId": id });
    if (quizUsingQuestion) {
      return res
        .status(400)
        .json({ error: "Cannot delete question. It is associated with a quiz." });
    }

    // Step 3: Proceed with deletion
    await Question.findByIdAndDelete(id); // Delete the question
    res.status(200).json({ message: "Question deleted successfully." });
  } catch (error) {
    console.error("Error deleting question:", error);
    res.status(500).json({ error: "Failed to delete question." });
  }
});


// PATCH: Toggle Question Status
router.patch('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        // Validate status
        if (!['active', 'inactive'].includes(status)) {
            return res.status(400).json({ message: "Invalid status value. Allowed values: 'active', 'inactive'." });
        }

        // Find the question and update its status
        const updatedQuestion = await Question.findByIdAndUpdate(
            id,
            { status: status },
            { new: true } // Return the updated document
        );

        if (!updatedQuestion) {
            return res.status(404).json({ message: 'Question not found.' });
        }

        res.status(200).json({ message: 'Question status updated successfully.', question: updatedQuestion });
    } catch (error) {
        console.error('Error updating question status:', error);
        res.status(500).json({ message: 'An error occurred while updating the question status.' });
    }
});

// Fetch questions by IDs
router.post("/questions/by-ids", async (req, res) => {
    try {
        const { questionIds } = req.body;

        if (!Array.isArray(questionIds) || questionIds.length === 0) {
            console.log("Invalid questionIds:", questionIds);
            return res.status(400).json({ message: "questionIds must be a non-empty array" });
        }

        console.log("Received question IDs:", questionIds);

        // Fetch questions from the database
        const questions = await Question.find({ _id: { $in: questionIds } });
        console.log("Questions fetched from the database:", questions);

        res.status(200).json(questions);
    } catch (err) {
        console.error("Error fetching questions by IDs:", err.message);
        res.status(500).json({ message: "Failed to fetch questions by IDs", error: err.message });
    }
});

// Search questions by title (wildcard) or tag (wildcard)
router.post('/search', async (req, res) => {
    const { title, tag } = req.body;

    try {
        // Build the search query
        const query = {};

        // If title is provided, perform a case-insensitive wildcard match
        if (title) {
            query.question = { $regex: title, $options: 'i' }; // Wildcard + case-insensitive regex
        }

        // If tag is provided, perform a case-insensitive wildcard match for tags
        if (tag) {
            query.tags = { $regex: tag, $options: 'i' }; // Wildcard + case-insensitive regex
        }

        // Fetch questions matching the query
        const questions = await Question.find(query).select('-options'); // Exclude options if not needed
        res.status(200).json(questions);
    } catch (error) {
        console.error("Error searching questions:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});


module.exports = router;