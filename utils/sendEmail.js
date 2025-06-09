const nodemailer = require("nodemailer");

// Create the transporter object
const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL, // Gmail address
    pass: process.env.EMAIL_PASSWORD, // Gmail App Password
  },
  logger: true, // Enable logging
});

// Function to send emails
const sendEmail = async (to, subject, text) => {
  try {
    // Send the email
    await transporter.sendMail({
      from: `"Unisoft Education Centre" <${process.env.EMAIL}>`, // Sender's email address
      to, // Recipient's email address
      subject, // Subject line
      text, // Email body content
    });

    console.log("Email sent successfully");
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Failed to send email.");
  }
};

module.exports = sendEmail;