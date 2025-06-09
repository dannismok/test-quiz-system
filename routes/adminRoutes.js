const express = require("express");
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin"); // Import the Admin model
const verifyAdmin = require("../middleware/verifyAdmin");

const router = express.Router();

// Admin login route
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  try {
    const admin = await Admin.findOne({ username });
    if (!admin) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Generate a JWT token
    const token = jwt.sign(
      { id: admin._id, username: admin.username, role: admin.role },
      process.env.SECRET_KEY_FOR_ADMIN || "adminsecret",
      { expiresIn: "1h" }
    );

    res.status(200).json({ message: "Login successful", token });
  } catch (err) {
    console.error("Error during login:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});


// Protected route: Example route for admins only
router.get("/protected", verifyAdmin("admin"), (req, res) => {
  res.status(200).json({
    message: "Welcome, Admin!",
    admin: req.user, // The decoded admin information from the token
  });
});

// Example route for getting the admin profile
router.get("/profile", verifyAdmin("admin"), async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id).select("-password"); // Exclude the password field
    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }
    res.status(200).json({ admin });
  } catch (err) {
    console.error("Error fetching admin profile:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Protected route: Requires at least "admin" role
router.get("/admin-dashboard", verifyAdmin("admin"), (req, res) => {
  res.status(200).json({
    message: "Welcome to the admin dashboard!",
    admin: req.user,
  });
});

// Superadmin-only route
router.get("/superadmin-dashboard", verifyAdmin("superadmin"), (req, res) => {
  res.status(200).json({
    message: "Welcome to the superadmin dashboard!",
    superadmin: req.user,
  });
});

// Export the router
module.exports = router;