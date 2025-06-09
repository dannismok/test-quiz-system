const mongoose = require("mongoose");
const Question = require("./models/Question"); // Adjust the path as needed

// Connect to MongoDB
mongoose
  .connect("mongodb://localhost:27017/quizSystem", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Sample questions
const sampleQuestions =[
  {
    "question": "What is the capital of France?",
    "type": "multiple_choice",
    "options": [
      { "text": "Paris", "graphic": null },
      { "text": "London", "graphic": null },
      { "text": "Berlin", "graphic": null },
      { "text": "Rome", "graphic": null }
    ],
    "correctAnswers": ["Paris"],
    "explanation": "Paris is the capital of France.",
    "vimeoId": null,
    "background": {
      "text": "France is a country in Western Europe.",
      "graphic": null
    },
    "status": "active",
    "tags": ["geography", "capitals"]
  },
  {
    "question": "Which planet is known as the Red Planet?",
    "type": "single_choice",
    "options": [
      { "text": "Mars", "graphic": null },
      { "text": "Earth", "graphic": null },
      { "text": "Jupiter", "graphic": null },
      { "text": "Saturn", "graphic": null }
    ],
    "correctAnswers": ["Mars"],
    "explanation": "Mars is called the Red Planet due to its reddish appearance.",
    "vimeoId": null,
    "background": {
      "text": "Mars is the fourth planet from the Sun.",
      "graphic": null
    },
    "status": "active",
    "tags": ["space", "planets"]
  },
  {
    "question": "Which is the largest ocean on Earth?",
    "type": "multiple_choice",
    "options": [
      { "text": "Pacific Ocean", "graphic": null },
      { "text": "Atlantic Ocean", "graphic": null },
      { "text": "Indian Ocean", "graphic": null },
      { "text": "Arctic Ocean", "graphic": null }
    ],
    "correctAnswers": ["Pacific Ocean"],
    "explanation": "The Pacific Ocean is the largest ocean on Earth, covering more than 60 million square miles.",
    "vimeoId": null,
    "background": {
      "text": "The oceans cover about 71% of the Earth's surface.",
      "graphic": null
    },
    "status": "active",
    "tags": ["geography", "oceans"]
  },
  {
    "question": "What is the chemical symbol for water?",
    "type": "fill_in_the_blank",
    "options": [],
    "correctAnswers": ["H2O"],
    "explanation": "Water is represented by the chemical formula H2O, consisting of two hydrogen atoms and one oxygen atom.",
    "vimeoId": null,
    "background": {
      "text": "Water is essential for all known forms of life.",
      "graphic": null
    },
    "status": "active",
    "tags": ["chemistry", "science"]
  },
  {
    "question": "Match the countries with their capitals.",
    "type": "matching",
    "options": [],
    "correctAnswers": [],
    "pairs": [
      { "key": "France", "value": "Paris" },
      { "key": "Germany", "value": "Berlin" },
      { "key": "Italy", "value": "Rome" },
      { "key": "Spain", "value": "Madrid" }
    ],
    "explanation": "Each country is matched with its respective capital city.",
    "vimeoId": null,
    "background": {
      "text": "Capitals are the administrative centers of countries.",
      "graphic": null
    },
    "status": "active",
    "tags": ["geography", "capitals"]
  },
  {
    "question": "Which of the following are prime numbers?",
    "type": "multiple_choice",
    "options": [
      { "text": "2", "graphic": null },
      { "text": "4", "graphic": null },
      { "text": "5", "graphic": null },
      { "text": "9", "graphic": null }
    ],
    "correctAnswers": ["2", "5"],
    "explanation": "Prime numbers are numbers greater than 1 that have no divisors other than 1 and themselves.",
    "vimeoId": null,
    "background": {
      "text": "Prime numbers are fundamental in mathematics.",
      "graphic": null
    },
    "status": "active",
    "tags": ["math", "numbers"]
  },
  {
    "question": "What is the powerhouse of the cell?",
    "type": "single_choice",
    "options": [
      { "text": "Mitochondria", "graphic": null },
      { "text": "Nucleus", "graphic": null },
      { "text": "Ribosome", "graphic": null },
      { "text": "Golgi apparatus", "graphic": null }
    ],
    "correctAnswers": ["Mitochondria"],
    "explanation": "Mitochondria are known as the powerhouse of the cell because they generate most of the cell's energy.",
    "vimeoId": null,
    "background": {
      "text": "Cells require energy to function, which is produced by mitochondria.",
      "graphic": null
    },
    "status": "active",
    "tags": ["biology", "cells"]
  },
  {
    "question": "Which gas do plants absorb during photosynthesis?",
    "type": "single_choice",
    "options": [
      { "text": "Oxygen", "graphic": null },
      { "text": "Carbon Dioxide", "graphic": null },
      { "text": "Nitrogen", "graphic": null },
      { "text": "Hydrogen", "graphic": null }
    ],
    "correctAnswers": ["Carbon Dioxide"],
    "explanation": "Plants absorb carbon dioxide during photosynthesis to produce oxygen and glucose.",
    "vimeoId": null,
    "background": {
      "text": "Photosynthesis is the process by which plants make their own food.",
      "graphic": null
    },
    "status": "active",
    "tags": ["biology", "photosynthesis"]
  },
  {
    "question": "Arrange the planets in order of their distance from the Sun.",
    "type": "matching",
    "options": [],
    "correctAnswers": [],
    "pairs": [
      { "key": "1", "value": "Mercury" },
      { "key": "2", "value": "Venus" },
      { "key": "3", "value": "Earth" },
      { "key": "4", "value": "Mars" }
    ],
    "explanation": "The planets are arranged in order of increasing distance from the Sun.",
    "vimeoId": null,
    "background": {
      "text": "The inner planets are closer to the Sun than the outer planets.",
      "graphic": null
    },
    "status": "active",
    "tags": ["space", "planets"]
  },
  {
    "question": "What is the speed of light in a vacuum?",
    "type": "fill_in_the_blank",
    "options": [],
    "correctAnswers": ["299,792,458 meters per second"],
    "explanation": "The speed of light in a vacuum is approximately 299,792,458 meters per second.",
    "vimeoId": null,
    "background": {
      "text": "Light travels at its fastest speed in a vacuum.",
      "graphic": null
    },
    "status": "active",
    "tags": ["physics", "light"]
  }
]

// Insert sample questions into the database
async function addSampleQuestions() {
  try {
    await Question.insertMany(sampleQuestions);
    console.log("Sample questions added successfully!");
  } catch (err) {
    console.error("Error adding sample questions:", err);
  } finally {
    mongoose.connection.close(); // Close the database connection
  }
}

// Run the function
addSampleQuestions();

