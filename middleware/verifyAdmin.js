const jwt = require("jsonwebtoken");

const SECRET_KEY_FOR_ADMIN = process.env.SECRET_KEY_FOR_ADMIN || "adminsecret";

// Middleware to verify admin and superadmin roles
const verifyAdmin = (requiredRole = "admin") => {
  return (req, res, next) => {
    const authHeader = req.headers["authorization"];
    if (!authHeader) {
      return res.status(403).json({ message: "No token provided. Admin access required." });
    }

    const token = authHeader.split(" ")[1]; // Extract the token

    try {
      const decoded = jwt.verify(token, SECRET_KEY_FOR_ADMIN); // Verify the token using admin-specific secret
      req.user = decoded; // Attach the decoded payload to req.user

      // Check if the user's role meets the required role
      if (requiredRole === "superadmin" && decoded.role !== "superadmin") {
        return res.status(403).json({ message: "Access denied. Superadmin privileges required." });
      }

      if (requiredRole === "admin" && !["admin", "superadmin"].includes(decoded.role)) {
        return res.status(403).json({ message: "Access denied. Admin privileges required." });
      }

      // If validation passes, proceed to the next middleware or route
      next();
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({ message: "Token expired. Please log in again." });
      }
      return res.status(400).json({ message: "Invalid admin token." });
    }
  };
};

module.exports = verifyAdmin;