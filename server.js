const dotenv = require("dotenv");
const path = require("path");

// Load common .env file
dotenv.config({ path: path.resolve(__dirname, ".env") });

// Determine the environment (default to development)
const env = process.env.NODE_ENV || "development";

// Load the corresponding .env.{env} file
dotenv.config({ path: path.resolve(__dirname, `.env.${env}`) });

const express = require("express");

console.log("Environment:", process.env.NODE_ENV);
console.log("Loaded SECRET_KEY:", process.env.SECRET_KEY);

const app = express();
// Middleware to parse JSON request bodies
app.use(express.json()); // This parses `Content-Type: application/json` requests
app.use(express.urlencoded({ extended: true })); // This parses URL-encoded request bodies

const connectDB = require("./database"); // MongoDB connection
const questionRoutes = require("./routes/questionRoutes"); // Import questions routes
const quizRoutes = require("./routes/quizRoutes"); // Import quiz routes
const userRoutes = require("./routes/userRoutes"); // Import user routes
const resultRoutes = require("./routes/resultRoutes"); // Import result routes
const purchaseRoutes = require("./routes/purchaseRoutes"); // Import purchase routes
const courseRoutes = require("./routes/courseRoutes"); // Import course routes
const subscriptionRoutes = require("./routes/subscriptionRoutes"); // Import subscription routes
const registrationRoutes = require("./routes/registrationRoutes"); // Import registration routes
const adminRoutes = require("./routes/adminRoutes"); // Admin routes
const cors = require("cors");


// Enable CORS
app.use(cors());

// Connect to MongoDB
connectDB();

// Serve static files from the 'public' folder
app.use(express.static(path.join(__dirname, "public")));

// Use the routes
app.use("/api/questions", questionRoutes); // Question routes
app.use("/api/quizzes", quizRoutes); // Quiz routes
app.use("/api/user", userRoutes); // User routes
app.use("/api/results", resultRoutes); // Result routes
app.use("/api/courses", courseRoutes); // Course routes
app.use("/api/subscriptions", subscriptionRoutes); // Mount subscription routes
app.use("/api/registrations", registrationRoutes); 
app.use("/api/purchases", purchaseRoutes); // Mount purchase routes at /api/purchases
app.use("/api/admin", adminRoutes); // Admin route for authentication and protected endpoints


// Handle undefined routes
app.use((req, res, next) => {
  res.status(404).json({ message: "Route not found" });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong!", error: err.message });
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));