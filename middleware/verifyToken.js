const jwt = require("jsonwebtoken");

const SECRET_KEY = process.env.SECRET_KEY;
if (!SECRET_KEY) {
  throw new Error("SECRET_KEY is not set in environment variables."); // Ensure SECRET_KEY is mandatory
}

const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  console.log("Authorization Header:", authHeader); // Debug the Authorization header

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Invalid token format. Bearer token expected." });
  }

  const token = authHeader.split(" ")[1]; // Extract the token
  console.log("Extracted Token:", token); // Debug the extracted token

  try {
    const decoded = jwt.verify(token, SECRET_KEY); // Verify the token
    console.log("SECRET_KEY during token verification:", SECRET_KEY);
    console.log("Decoded Token:", decoded); // Debug the decoded token

    req.user = {
      id: decoded.id, // Attach user ID to the request
      role: decoded.role, // Attach user role to the request
    };
    next(); // Proceed to the next middleware or route
  } catch (err) {
    console.error("Error Verifying Token:", err.message); // Debug the error
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired. Please log in again." });
    } else if (err.name === "JsonWebTokenError") {
      return res.status(400).json({ message: "Invalid token. Please provide a valid token." });
    } else {
      return res.status(500).json({ message: "Token verification failed. Please try again later." });
    }
  }
};

module.exports = verifyToken;