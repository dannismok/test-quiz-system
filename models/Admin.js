const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

// Define the Admin schema
const adminSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true, // Removes whitespace from both ends of the username
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    required: true,
    default: "admin", // Default role is 'admin'
  },
});

// Hash the password before saving the admin document
adminSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next(); // Skip hashing if the password is not modified
  try {
    const salt = await bcrypt.genSalt(10); // Generate a salt
    this.password = await bcrypt.hash(this.password, salt); // Hash the password
    next();
  } catch (err) {
    next(err); // Pass any errors to the next middleware
  }
});

// Add a method to compare the input password with the hashed password
adminSchema.methods.comparePassword = async function (inputPassword) {
  return await bcrypt.compare(inputPassword, this.password); // Returns true if passwords match
};

// Create the Admin model from the schema
const Admin = mongoose.model("Admin", adminSchema);

module.exports = Admin;