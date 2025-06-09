const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User"); // Import the User model
const Subscription = require("../models/Subscription"); // Import Subscription model
const Registration = require('../models/Registration'); 
const Course = require("../models/Course"); // Adjust the path as needed
const Quiz = require("../models/Quiz"); // Adjust the path as needed
const Purchase = require("../models/Purchase"); // Purchase schema
const verifyToken = require("../middleware/verifyToken"); // Ensure this is correct
const verifyAdmin = require("../middleware/verifyAdmin");


const sendEmail = require("../utils/sendEmail"); // Import the sendEmail utility
const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const client = new OAuth2Client(CLIENT_ID);

const router = express.Router();
const SECRET_KEY = process.env.SECRET_KEY || "unisoft";

// Google Login Route
// Google Login Route
router.post("/google-login", async (req, res) => {
  const { token: googleToken } = req.body;

  if (!googleToken) {
    return res.status(400).json({ message: "ID Token is required" });
  }

  try {
    // Verify Google ID token
    const ticket = await client.verifyIdToken({
      idToken: googleToken,
      audience: CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name } = payload;

    // Check if user exists
    let user = await User.findOne({ email });

    if (!user) {
      // Create a new Google user
      user = new User({
        username: name,
        email,
        isGoogleUser: true, // Mark as Google user
      });
      await user.save();

      // Send a welcome email
      await sendEmail(
        email,
        "Welcome to Our App",
        `Hello ${name}, welcome to our app! We're glad to have you with us.`
      );
    }

    // Generate a JWT token
    const jwtToken = jwt.sign(
      {
        id: user._id,
        username: user.username,
        isGoogleUser: user.isGoogleUser,
      },
      SECRET_KEY,
      { expiresIn: "1h" }
    );

    // Respond with token, userId, and username
    res.status(200).json({
      message: "Google login successful",
      token: jwtToken,
      userId: user._id, // Include the userId in the response
      username: user.username,
    });
  } catch (error) {
    console.error("Error verifying Google token:", error);
    res.status(401).json({ message: "Invalid ID Token" });
  }
});

/**
 * Route: Register a new user
 * URL: /api/user/register
 */
router.post("/register", async (req, res) => {
  const { username, password, email } = req.body;

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ message: "User already exists." });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({ username, password: hashedPassword, email });
    await newUser.save();

    // Send the welcome email using the sendEmail utility
    await sendEmail(
      email,
      "Welcome to Our App",
      `Hello ${username}, welcome to our app! We're glad to have you with us.`
    );

    res.status(201).json({ message: "User registered successfully and welcome email sent." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Route: Login a user
 * URL: /api/user/login
 */
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  // Log the incoming request body for debugging
  console.log("Login Request Body:", req.body);

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required." });
  }

  try {
    const user = await User.findOne({ username });
    console.log("User Found:", user);

    if (!user) {
      return res.status(400).json({ message: "Invalid username or password." });
    }

    // Check if the user is active
    if (!user.active) {
      return res.status(403).json({ message: "Your account is inactive. Please contact the administrator." });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log("Password Valid:", isPasswordValid);

    if (!isPasswordValid) {
      return res.status(400).json({ message: "Invalid username or password." });
    }

    // Generate the JWT token
    const token = jwt.sign(
      { id: user._id, username: user.username },
      SECRET_KEY,
      { expiresIn: "1h" }
    );
    console.log("Generated Token:", token);

    // Respond with the token, userId, and username
    res.status(200).json({
      message: "Login successful.",
      token, // Include the token
      userId: user._id, // Explicitly include the userId
      username: user.username // Include the username
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Route: Get the currently logged-in user's information
 * URL: /api/user/me
 * Protected route
 */
router.get("/user/me", verifyToken, (req, res) => {
  // The `verifyToken` middleware will attach the user info to `req.user`
  res.status(200).json({ username: req.user.username });
});

/**
 * Route: Forgot password
 * URL: /api/user/forgot-password
 */
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found." });

    // Generate a reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour from now

    await user.save();

    // Send password reset email
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    await sendEmail(email, "Password Reset Request", `Reset your password using this link: ${resetUrl}`);

    res.status(200).json({ message: "Password reset email sent." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Route: Reset password
 * URL: /api/user/reset-password/:token
 */
router.post("/reset-password/:token", async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }, // Ensure token is not expired
    });

    if (!user) return res.status(400).json({ message: "Invalid or expired token." });

    // Hash the new password and save it
    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    user.resetPasswordToken = undefined; // Clear the reset token
    user.resetPasswordExpires = undefined;

    await user.save();

    res.status(200).json({ message: "Password reset successfully." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Route: Change password
 * URL: /api/user/change-password
 * Protected route
 */
router.post("/change-password", verifyToken, async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found." });

    // Disallow password change for Google users
    if (user.isGoogleUser) {
      return res.status(400).json({ message: "Google users cannot change their password." });
    }

    // Verify the old password
    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordValid) return res.status(400).json({ message: "Incorrect old password." });

    // Hash and save the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;

    await user.save();

    res.status(200).json({ message: "Password changed successfully." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


/**
 * Route: Get all users (with optional search by username, email, or phone)
 * URL: /users
 * Method: GET
 * Access: Admins only
 */
router.get("/", verifyAdmin("admin"), async (req, res) => {
  const { username, email, phone } = req.query;

  try {
    // Build the query object dynamically based on the provided filters
    const query = {};
    if (username) query.username = { $regex: username, $options: "i" }; // Case-insensitive regex
    if (email) query.email = { $regex: email, $options: "i" }; // Case-insensitive regex
    if (phone) query.phone = { $regex: phone, $options: "i" }; // Case-insensitive regex

    // Fetch users based on the query
    const users = await User.find(query).select("-password"); // Exclude passwords
    res.status(200).json(users);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ message: "Failed to fetch users." });
  }
});

/**
 * Route: Add a new user
 * URL: /users
 * Method: POST
 * Access: Admins only
 */
router.post("/", verifyAdmin("admin"), async (req, res) => {
  const { username, email, password} = req.body;

  try {
    // Check if the user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists." });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user
    const newUser = new User({
      username,
      email,
      password: hashedPassword     
    });

    await newUser.save();

    res.status(201).json({ message: "User added successfully." });
  } catch (err) {
    console.error("Error adding user:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Route: Delete a user
 * URL: /users/:userId
 * Method: DELETE
 * Access: Admins only
 */
router.delete("/:userId", verifyAdmin("admin"), async (req, res) => {
  const { userId } = req.params;

  try {
    // Step 1: Check for registrations associated with the user
    const registrationCount = await Registration.countDocuments({ userId });
    if (registrationCount > 0) {
      return res.status(400).json({
        message: "User cannot be deleted because there are associated registrations.",
      });
    }

    // Step 2: Check for subscriptions associated with the user
    const subscriptionCount = await Subscription.countDocuments({ userId });
    if (subscriptionCount > 0) {
      return res.status(400).json({
        message: "User cannot be deleted because there are associated subscriptions.",
      });
    }

    // Step 3: Proceed to delete the user if no registrations or subscriptions exist
    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    res.status(200).json({ message: "User deleted successfully." });
  } catch (err) {
    console.error("Error deleting user:", err);
    res.status(500).json({ message: "Failed to delete user." });
  }
});

/**
 * Route: Update a user
 * URL: /users/:userId
 * Method: PUT
 * Access: Admins only
 */
router.put("/:userId", verifyAdmin("admin"), async (req, res) => {
  const { userId } = req.params;
  const { username, email, phone } = req.body;

  try {
    const updates = {};
    if (username) updates.username = username;
    if (email) updates.email = email;
    if (phone) updates.phone = phone; // Update phone number
 
    const updatedUser = await User.findByIdAndUpdate(userId, updates, { new: true });
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found." });
    }

    res.status(200).json({ message: "User updated successfully.", user: updatedUser });
  } catch (err) {
    console.error("Error updating user:", err);
    res.status(500).json({ message: "Failed to update user." });
  }
});

// Route: Get all users (with optional search by username, email, or phone)
// URL: /users
// Method: GET
// Access: Admins only
// Example: Admin-only route to fetch all users
router.get("/users", verifyAdmin("admin"), async (req, res) => {
  try {
    const users = await User.find().select("id username email phone");
    res.status(200).json(users);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ message: "Failed to fetch users." });
  }
});


// Route: Fetch a single user by ID
// URL: /:userId
// Method: GET
// Access: Admins only
router.get("/:userId", verifyAdmin("admin"), async (req, res) => {
  const { userId } = req.params;

  try {
    // Validate the userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID format." });
    }

    // Find the user by ID
    const user = await User.findById(userId).select("-password"); // Exclude password
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    res.status(200).json(user);
  } catch (err) {
    console.error("Error fetching user by ID:", err);
    res.status(500).json({ message: "Failed to fetch user." });
  }
});


router.delete("/:userId/force", verifyAdmin("admin"), async (req, res) => {
  const { userId } = req.params;

  try {
    // Step 1: Delete registrations associated with the user
    const deletedRegistrations = await Registration.deleteMany({ userId });
    console.log(`Deleted ${deletedRegistrations.deletedCount} registrations for user ${userId}`);

    // Step 2: Delete subscriptions associated with the user
    const deletedSubscriptions = await Subscription.deleteMany({ userId });
    console.log(`Deleted ${deletedSubscriptions.deletedCount} subscriptions for user ${userId}`);

    // Step 3: Delete the user
    const deletedUser = await User.findByIdAndDelete(userId);
    if (!deletedUser) {
      return res.status(404).json({ message: "User not found." });
    }

    res.status(200).json({
      message: "User and all associated registrations and subscriptions deleted successfully.",
    });
  } catch (err) {
    console.error("Error force deleting user:", err);
    res.status(500).json({ message: "Failed to force delete user." });
  }
});


/**
 * Route: Admin Reset User Password
 * URL: /api/user/:userId/reset-password
 * Method: PUT
 * Access: Admins only
 */
router.put("/:userId/reset-password", verifyAdmin("admin"), async (req, res) => {
  const { userId } = req.params;
  const { password } = req.body;

  try {
    // Validate password
    if (!password || password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters long." });
    }

    // Find the user by ID
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Disallow password reset for Google users
    if (user.isGoogleUser) {
      return res.status(400).json({ message: "Cannot reset password for Google users." });
    }

    // Hash the new password and update the user
    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ message: "Password reset successfully." });
  } catch (err) {
    console.error("Error resetting password:", err);
    res.status(500).json({ message: "Failed to reset password." });
  }
});


/**
 * Route: Search users by name, email, or phone
 * URL: /users/search
 * Method: GET
 * Access: Public
 */
router.get("/search", verifyAdmin("admin"), async (req, res) => {
  const { username, email, phone } = req.query;

  // Ensure at least one valid parameter is provided
  if (!username && !email && !phone) {
    return res.status(400).json({ message: "At least one search parameter (username, email, or phone) is required." });
  }

  try {
    // Build the query dynamically based on provided parameters
    const query = {};
    if (username) query.username = { $regex: username, $options: "i" }; // Case-insensitive username search
    if (email) query.email = { $regex: email, $options: "i" }; // Case-insensitive email search
    if (phone) query.phone = { $regex: phone, $options: "i" }; // Case-insensitive phone search

    // Fetch users from the database
    const users = await User.find(query).select("id username email phone");

    // Return the results
    res.status(200).json(users);
  } catch (err) {
    console.error("Error searching users:", err);
    res.status(500).json({ message: "Failed to search users." });
  }
});

// Route to toggle active status
router.patch("/:userId/toggle-active",  async (req, res) => {
  const { userId } = req.params;

  try {
    // Find the user by ID
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Toggle the active status
    user.active = !user.active;
    await user.save();

    res.status(200).json({
      message: `User ${user.active ? "activated" : "deactivated"} successfully.`,
      active: user.active,
    });
  } catch (error) {
    console.error("Error toggling user active status:", error);
    res.status(500).json({ message: "Failed to toggle user active status." });
  }
});


router.post("/:userId/enroll-course",  async (req, res) => {
  const { userId } = req.params;
  const { courseId, amount, purchaseType, subscriptionPeriod, totalCredits } = req.body;

  try {
    console.log("API Request Received");
    console.log("User ID:", userId);
    console.log("Request Body:", req.body);

    // Step 1: Verify User
    console.log("Verifying user...");
    const user = await User.findById(userId);
    if (!user) {
      console.log("User not found");
      return res.status(404).json({ message: "User not found." });
    }
    console.log("User verified:", user);

    // Step 2: Verify Course
    console.log("Verifying course...");
    const course = await Course.findById(courseId).populate("quizzes lessons");
    if (!course) {
      console.log("Course not found");
      return res.status(404).json({ message: "Course not found." });
    }
    console.log("Course verified:", course);

    // Step 3: Calculate Subscription Dates
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + subscriptionPeriod * 24 * 60 * 60 * 1000);
    console.log("Subscription start date:", startDate, "end date:", endDate);

    // Step 4: Create Subscription
    console.log("Creating subscription...");
    const subscription = await Subscription.create({
      userId,
      courseId,
      subscriptionDate: startDate,
      expirationDate: endDate,
      isActive: true,
    });
    console.log("Subscription created:", subscription);

    // Step 5: Prepare Quiz Registrations
    console.log("Preparing quiz registrations...");
    const registrations = [];
    // Register for course quizzes
    if (Array.isArray(course.quizzes)) {
      course.quizzes.forEach((quiz) => {
        registrations.push({
          userId,
          quizId: quiz._id,
          startDate,
          endDate,
          creditPoints: totalCredits,
        });
      });
    } else {
      console.log("No quizzes found for the course.");
    }


    // Register for lesson quizzes
    if (Array.isArray(course.lessons)) {
      course.lessons.forEach((lesson) => {
        if (Array.isArray(lesson.quizzes)) {
          lesson.quizzes.forEach((quiz) => {
            registrations.push({
              userId,
              quizId: quiz._id,
              startDate,
              endDate,
              creditPoints: totalCredits,
            });
          });
        } else {
          console.log(`No quizzes found for lesson ${lesson._id}`);
        }
      });
    } else {
      console.log("No lessons found for the course.");
    }

    // Step 6: Create Registrations
    if (registrations.length > 0) {
      console.log("Inserting registrations...");
      await Registration.insertMany(registrations);
      console.log("Registrations created successfully");
    }

    // Step 7: Create a Purchase Record
    console.log("Creating purchase record...");
    const purchase = await Purchase.create({
      userId,
      creditsPurchased: totalCredits,
      amount,
      paymentMethod: purchaseType,
      transactionDate: startDate,
    });
    console.log("Purchase record created:", purchase);

    // Step 8: Send Success Response
    console.log("Sending success response...");
    res.status(200).json({
      message: "User enrolled successfully.",
      courseName: course.title,
      subscriptionId: subscription._id,
      purchaseId: purchase._id,
    });
  } catch (error) {
    console.error("Error enrolling user:", error);
    res.status(500).json({ message: "Failed to enroll user in the course." });
  }

  
});


router.post("/:userId/register-quiz", async (req, res) => {
  const { userId } = req.params;
  const { quizId, amount, purchaseType, subscriptionPeriod, totalCredits } = req.body;

  try {
    console.log("API Request Received for Quiz Registration");
    console.log("User ID:", userId);
    console.log("Request Body:", req.body);

    // Validate request data
    if (!quizId) {
      return res.status(400).json({ message: "Quiz ID is required." });
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: "Invalid amount provided." });
    }

    if (!purchaseType || typeof purchaseType !== "string") {
      return res.status(400).json({ message: "Invalid purchase type provided." });
    }

    if (!subscriptionPeriod || isNaN(subscriptionPeriod) || subscriptionPeriod <= 0) {
      return res.status(400).json({ message: "Invalid subscription period provided." });
    }

    if (!totalCredits || isNaN(totalCredits) || totalCredits <= 0) {
      return res.status(400).json({ message: "Invalid total credits provided." });
    }

    // Verify the user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Verify the quiz exists
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found." });
    }

    // Calculate registration dates
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + subscriptionPeriod * 24 * 60 * 60 * 1000);

    if (isNaN(endDate.getTime())) {
      return res.status(400).json({ message: "Failed to calculate end date." });
    }

    // Create the registration
    const registration = await Registration.create({
      userId,
      quizId,
      startDate,
      endDate,
      creditPoints: totalCredits,
      isActive: true,
    });

    // Create the purchase record
    const purchase = await Purchase.create({
      userId,
      creditsPurchased: totalCredits,
      amount,
      paymentMethod: purchaseType,
      transactionDate: startDate,
    });

    res.status(200).json({
      message: "Quiz registered successfully.",
      quizTitle: quiz.title,
      registrationId: registration._id,
      purchaseId: purchase._id,
    });
  } catch (error) {
    console.error("Error registering quiz:", error);
    res.status(500).json({ message: "Failed to register quiz." });
  }
});

router.get("/user-quizzes", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id; // User ID from the token payload

    // Fetch registrations for the user
    const registrations = await Registration.find({ userId }).populate("quizId");

    // Extract quiz details from registrations
    const quizzes = registrations.map((reg) => reg.quizId);

    res.status(200).json(quizzes);
  } catch (error) {
    console.error("Error fetching user quizzes:", error);
    res.status(500).json({ message: "Failed to fetch registered quizzes." });
  }
});



router.get("/:userId/registered-data", verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;

    console.log("Fetching data for user:", userId);

    // Step 1: Fetch all quiz registrations
    const registrations = await Registration.find({ userId })
      .populate("quizId", "title description") // Populate quiz details
      .exec();

    console.log(`Found ${registrations.length} quiz registrations.`);

    const registeredQuizzes = registrations.map((registration) => {
      return {
        quizId: registration.quizId?._id,
        quizTitle: registration.quizId?.title,
        description: registration.quizId?.description,
        startDate: registration.startDate,
        endDate: registration.endDate,
        creditPoints: registration.creditPoints,
        isActive: registration.isActive,
      };
    });

    // Step 2: Fetch all course subscriptions
    const subscriptions = await Subscription.find({ userId })
      .populate("courseId", "title description") // Populate course details
      .exec();

    console.log(`Found ${subscriptions.length} course subscriptions.`);

    const subscribedCourses = subscriptions.map((subscription) => {
      return {
        courseId: subscription.courseId?._id,
        courseTitle: subscription.courseId?.title,
        description: subscription.courseId?.description,
        subscriptionDate: subscription.subscriptionDate,
        expirationDate: subscription.expirationDate,
        isActive: subscription.isActive,
      };
    });

    // Step 3: Fetch all purchases
    const purchases = await Purchase.find({ userId }).exec();

    console.log(`Found ${purchases.length} purchase records.`);

    const purchaseRecords = purchases.map((purchase) => {
      return {
        purchaseId: purchase._id,
        creditsPurchased: purchase.creditsPurchased,
        amount: purchase.amount,
        paymentMethod: purchase.paymentMethod,
        transactionDate: purchase.transactionDate,
      };
    });

    // Step 4: Send the combined response
    res.status(200).json({
      userId,
      registeredQuizzes,
      subscribedCourses,
      purchaseRecords,
    });
  } catch (error) {
    console.error("Error fetching data for user:", error);
    res.status(500).json({ message: "Failed to fetch data for user." });
  }
});


router.get("/:userId/registered-quizzes", verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;

    console.log("Fetching registered quizzes for user:", userId);

    // Fetch quiz registrations for the user
    const registrations = await Registration.find({ userId })
      .populate("quizId", "title description") // Populate quiz details
      .exec();

    console.log(`Found ${registrations.length} registered quizzes.`);

    // Prepare response
    const registeredQuizzes = registrations.map((registration) => ({
      quizId: registration.quizId?._id,
      quizTitle: registration.quizId?.title,
      description: registration.quizId?.description,
      startDate: registration.startDate,
      endDate: registration.endDate,
      creditPoints: registration.creditPoints,
      isActive: registration.isActive,
    }));

    res.status(200).json({ registeredQuizzes });
  } catch (error) {
    console.error("Error fetching registered quizzes:", error);
    res.status(500).json({ message: "Failed to fetch registered quizzes." });
  }
});

router.get("/:userId/subscribed-courses", verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;

    console.log("Fetching subscribed courses for user:", userId);

    // Fetch course subscriptions for the user
    const subscriptions = await Subscription.find({ userId })
      .populate("courseId", "title description") // Populate course details
      .exec();

    console.log(`Found ${subscriptions.length} subscribed courses.`);

    // Prepare response
    const subscribedCourses = subscriptions.map((subscription) => ({
      courseId: subscription.courseId?._id,
      courseTitle: subscription.courseId?.title,
      description: subscription.courseId?.description,
      subscriptionDate: subscription.subscriptionDate,
      expirationDate: subscription.expirationDate,
      isActive: subscription.isActive,
    }));

    res.status(200).json({ subscribedCourses });
  } catch (error) {
    console.error("Error fetching subscribed courses:", error);
    res.status(500).json({ message: "Failed to fetch subscribed courses." });
  }
});

router.get("/:userId/purchase-records", verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;

    console.log("Fetching purchase records for user:", userId);

    // Fetch purchase records for the user
    const purchases = await Purchase.find({ userId }).exec();

    console.log(`Found ${purchases.length} purchase records.`);

    // Prepare response
    const purchaseRecords = purchases.map((purchase) => ({
      purchaseId: purchase._id,
      creditsPurchased: purchase.creditsPurchased,
      amount: purchase.amount,
      paymentMethod: purchase.paymentMethod,
      transactionDate: purchase.transactionDate,
    }));

    res.status(200).json({ purchaseRecords });
  } catch (error) {
    console.error("Error fetching purchase records:", error);
    res.status(500).json({ message: "Failed to fetch purchase records." });
  }
});



module.exports = router;