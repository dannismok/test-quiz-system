const nodemailer = require("nodemailer");
require("dotenv").config();

const sendTestEmail = async () => {
  try {
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const info = await transporter.sendMail({
      from: process.env.EMAIL,
      to: "dannismok@uec.edu.hk", // Replace with your test recipient
      subject: "Test Email",
      text: "This is a test email sent from Nodemailer using Gmail.",
    });

    console.log("Test email sent successfully:", info.messageId);
  } catch (err) {
    console.error("Error sending test email:", err);
  }
};

sendTestEmail();