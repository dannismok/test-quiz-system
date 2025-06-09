const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const Registration = require("../models/Registration"); // Import Registration model
const QuizResult = require("../models/QuizResult"); // Import QuizResult model
const Quiz = require("../models/Quiz"); // Import Quiz model
const User = require("../models/User"); // Import User model

// Get all registrations for a user
router.get("/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    // Validate the userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid user ID format." });
    }

    // Find the user in the database
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // Find all registrations for the user
    const registrations = await Registration.find({ userId })
      .populate("quizId", "title") // Populate quiz details (only title)
      .exec();

    // Format the response
    res.status(200).json({
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
      },
      registrations: registrations.map((reg) => ({
        _id: reg._id,
        quizTitle: reg.quizId.title,
        startDate: reg.startDate,
        endDate: reg.endDate,
        creditPoints: reg.creditPoints,
        isActive: reg.isActive,
      })),
    });
  } catch (error) {
    console.error("Error fetching registrations:", error);
    res.status(500).json({ error: "Failed to fetch registrations." });
  }
});

// Register a user for a quiz
// Register a user for a quiz
router.post("/:quizId/register", async (req, res) => {
  const { quizId } = req.params;
  const { userId, startDate, endDate, creditPoints } = req.body;

  try {
    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(quizId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid quizId or userId format." });
    }

    // Remove the restriction for duplicate registrations
    // We no longer check for an existing registration

    // Create a new registration
    const newRegistration = new Registration({
      userId,
      quizId,
      startDate,
      endDate,
      creditPoints,
      isActive: true, // Default to active
    });

    await newRegistration.save();
    res.status(201).json({ message: "User registered successfully.", registration: newRegistration });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

// Delete a user's registration for a quiz
// DELETE /api/registrations/quiz/:quizId/user/:userId
router.delete("/quiz/:quizId/user/:userId", async (req, res) => {
  try {
    const { quizId, userId } = req.params;

    // Find and delete the registration
    const registration = await Registration.findOneAndDelete({ quizId, userId });

    if (!registration) {
      return res.status(404).json({ error: "Registration not found." });
    }

    res.status(200).json({ message: "Registration removed successfully." });
  } catch (error) {
    console.error("Error removing registration:", error);
    res.status(500).json({ error: "Failed to remove registration." });
  }
});


// Check if a user is eligible to play a quiz
router.get("/:quizId/can-play/:userId", async (req, res) => {
  const { quizId, userId } = req.params;

  try {
    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(quizId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid quizId or userId format." });
    }

    const registration = await Registration.findOne({ userId, quizId });
    if (!registration) {
      return res.status(404).json({ error: "User is not registered for this quiz." });
    }

    if (!registration.isValid()) {
      return res.status(400).json({ error: "Registration is not valid (expired, inactive, or insufficient credits)." });
    }

    res.status(200).json({ message: "User is eligible to play the quiz.", registration });
  } catch (error) {
    console.error("Error checking user eligibility:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

// Deduct points after a quiz attempt
router.post("/:quizId/deduct-points/:userId", async (req, res) => {
  const { quizId, userId } = req.params;
  const { pointsToDeduct } = req.body;

  try {
    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(quizId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid quizId or userId format." });
    }

    const registration = await Registration.findOne({ userId, quizId });
    if (!registration) {
      return res.status(404).json({ error: "User is not registered for this quiz." });
    }

    if (registration.creditPoints < pointsToDeduct) {
      return res.status(400).json({ error: "Insufficient credit points." });
    }

    registration.creditPoints -= pointsToDeduct;
    await registration.save();

    res.status(200).json({ message: "Points deducted successfully.", registration });
  } catch (error) {
    console.error("Error deducting points:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

// Save a quiz result
router.post("/:quizId/results/:userId", async (req, res) => {
  const { quizId, userId } = req.params;
  const { registrationId, startTime, endTime, score } = req.body;

  try {
    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(quizId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid quizId or userId format." });
    }

    // Validate request body
    if (!registrationId || !startTime || !endTime || score === undefined) {
      return res.status(400).json({ error: "Missing required fields in the request body." });
    }

    // Validate registration
    const registration = await Registration.findById(registrationId);
    if (!registration || registration.userId.toString() !== userId || registration.quizId.toString() !== quizId) {
      return res.status(400).json({ error: "Invalid registration for this user and quiz." });
    }

    // Calculate time taken
    const timeTaken = Math.floor((new Date(endTime) - new Date(startTime)) / 1000); // Time in seconds

    // Determine result (pass/fail)
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ error: "Quiz not found." });
    }
    const result = score >= quiz.passMark ? "Pass" : "Fail";

    // Save the quiz result
    const newQuizResult = new QuizResult({
      registrationId,
      quizId,
      userId,
      startTime,
      endTime,
      timeTaken,
      score,
      result,
    });

    await newQuizResult.save();
    res.status(201).json({ message: "Quiz result saved successfully.", quizResult: newQuizResult });
  } catch (error) {
    console.error("Error saving quiz result:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

// Get quiz results for a user
router.get("/:quizId/results/:userId", async (req, res) => {
  const { quizId, userId } = req.params;

  try {
    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(quizId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid quizId or userId format." });
    }

    const results = await QuizResult.find({ quizId, userId }).sort({ startTime: -1 }); // Fetch results sorted by start time
    res.status(200).json(results);
  } catch (error) {
    console.error("Error fetching quiz results:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

// Get all registrations for a user
router.get("/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    // Check if the user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // Fetch all registrations for the user
    const registrations = await Registration.find({ userId })
      .populate("quizId", "title") // Populate quiz title
      .exec();

    res.status(200).json({
      user: { username: user.username, email: user.email },
      registrations: registrations.map((reg) => ({
        _id: reg._id,
        quizTitle: reg.quizId.title,
        startDate: reg.startDate,
        endDate: reg.endDate,
        creditPoints: reg.creditPoints,
        isActive: reg.isActive,
      })),
    });
  } catch (error) {
    console.error("Error fetching registrations:", error);
    res.status(500).json({ error: "Failed to fetch registrations." });
  }
});

// Toggle active status of a registration
router.patch("/:registrationId/toggle", async (req, res) => {
  const { registrationId } = req.params;
  const { isActive } = req.body; // New active status

  try {
    // Update the registration status
    const updatedRegistration = await Registration.findByIdAndUpdate(
      registrationId,
      { isActive },
      { new: true }
    );

    if (!updatedRegistration) {
      return res.status(404).json({ error: "Registration not found." });
    }

    res.status(200).json({
      message: "Registration status updated successfully.",
      registration: updatedRegistration,
    });
  } catch (error) {
    console.error("Error toggling registration status:", error);
    res.status(500).json({ error: "Failed to update registration status." });
  }
});

// Update credit points for a registration
router.patch("/:registrationId/update-credits", async (req, res) => {
  const { registrationId } = req.params;
  const { creditPoints } = req.body; // New credit points value

  try {
    // Update the registration credits
    const updatedRegistration = await Registration.findByIdAndUpdate(
      registrationId,
      { creditPoints },
      { new: true }
    );

    if (!updatedRegistration) {
      return res.status(404).json({ error: "Registration not found." });
    }

    res.status(200).json({
      message: "Credits updated successfully.",
      registration: updatedRegistration,
    });
  } catch (error) {
    console.error("Error updating credits:", error);
    res.status(500).json({ error: "Failed to update credits." });
  }
});

// Delete a registration
router.delete("/:registrationId", async (req, res) => {
  const { registrationId } = req.params;

  try {
    const deletedRegistration = await Registration.findByIdAndDelete(registrationId);

    if (!deletedRegistration) {
      return res.status(404).json({ error: "Registration not found." });
    }

    res.status(200).json({
      message: "Registration deleted successfully.",
      registration: deletedRegistration,
    });
  } catch (error) {
    console.error("Error deleting registration:", error);
    res.status(500).json({ error: "Failed to delete registration." });
  }
});

// Get registered users for a specific quiz
router.get("/quiz/:quizId/users", async (req, res) => {
  const { quizId } = req.params;

  try {
    // Fetch registrations for the specified quiz
    const registrations = await Registration.find({ quizId }).populate("userId");

    // If no registrations exist, return an empty array
    if (!registrations || registrations.length === 0) {
      return res.status(200).json([]); // Return an empty array instead of 404
    }

    // Map the registrations to return user details
    const registeredUsers = registrations.map((registration) => ({
      _id: registration.userId._id,
      username: registration.userId.username,
      email: registration.userId.email,
      isActive: registration.userId.isActive,
      creditPoints: registration.userId.creditPoints,
    }));

    res.status(200).json(registeredUsers); // Return the registered users
  } catch (error) {
    console.error("Error fetching registered users:", error);
    res.status(500).json({ error: "Failed to fetch registered users." });
  }
});


module.exports = router;