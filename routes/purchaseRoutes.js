const express = require("express");
const axios = require("axios");
const router = express.Router();
const Purchase = require("../models/Purchase");
const User = require("../models/User"); // Import the User model

// PayPal credentials from .env
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_SECRET = process.env.PAYPAL_SECRET;
const PAYPAL_API_BASE_URL = process.env.PAYPAL_API_BASE_URL;

// Endpoint to create a PayPal order (unchanged)
router.post("/paypal/create-order", async (req, res) => {
  const { amount } = req.body; // Amount sent from the client

  if (!amount || isNaN(amount)) {
    return res.status(400).json({ error: "Invalid or missing amount." });
  }

  try {
    // Step 1: Get PayPal Access Token
    const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString("base64");
    const tokenResponse = await axios.post(
      `${PAYPAL_API_BASE_URL}/v1/oauth2/token`,
      "grant_type=client_credentials",
      {
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    const accessToken = tokenResponse.data.access_token;

    // Step 2: Create a PayPal order
    const orderResponse = await axios.post(
      `${PAYPAL_API_BASE_URL}/v2/checkout/orders`,
      {
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: {
              currency_code: "USD",
              value: amount, // Total amount sent from the client
            },
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    // Step 3: Return the order ID to the client
    res.json(orderResponse.data);
  } catch (error) {
    console.error("PayPal order creation error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to create PayPal order." });
  }
});

// New Endpoint to Handle Successful PayPal Payments
router.post("/paypal/validate-payment", async (req, res) => {

  // Log the request body
  console.log("Request body received:", req.body);

  const { transactionId, payerEmail, payerName, amount, currency, creditsPurchased } = req.body;

  // Validate request body
  if (!transactionId || !payerEmail || !amount || !creditsPurchased) {
    return res.status(400).json({ error: "Invalid or missing payment details." });
  }

  try {
    // Step 1: Get PayPal Access Token
    const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString("base64");
    const tokenResponse = await axios.post(
      `${PAYPAL_API_BASE_URL}/v1/oauth2/token`,
      "grant_type=client_credentials",
      {
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    console.log("PayPal Access Token Response:", tokenResponse.data);
    const accessToken = tokenResponse.data.access_token;

    // Step 2: Validate the transaction with PayPal
    const validationResponse = await axios.get(
      `${PAYPAL_API_BASE_URL}/v2/checkout/orders/${transactionId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("PayPal Transaction Validation Response:", validationResponse.data);
    const transactionDetails = validationResponse.data;

    // Step 3: Check transaction status
    if (transactionDetails.status !== "COMPLETED") {
      console.error("Transaction not completed. Status:", transactionDetails.status);
      return res.status(400).json({ error: "Payment is not completed." });
    }

    console.log("Transaction validated successfully. Details:", transactionDetails);

    // Step 4: Find or Create User
    let user = await User.findOne({ email: payerEmail });
    if (!user) {
      console.log("User not found. Creating new PayPal user...");
      user = new User({
        email: payerEmail,
        name: payerName,
        password: null, // Password is not required for PayPal users
        isPayPalUser: true, // Mark as a PayPal user
      });
      await user.save();
      console.log("New PayPal user created:", user);
    } else {
      console.log("User found:", user);
    }

    // Step 5: Save Purchase Record
    const purchase = new Purchase({
      userId: user._id,
      creditsPurchased,
      amount,
      currency,
      paymentMethod: "PayPal",
      transactionId,
    });

    await purchase.save();
    console.log("Purchase saved successfully:", purchase);

    // Step 6: Respond with success
    res.status(201).json({
      message: "Payment validated and purchase logged successfully!",
      purchase,
    });
  } catch (error) {

    console.error("Error validating PayPal payment:", error.response?.data || error.message);

    // Add more logs for debugging
    if (error.response) {
      console.error("Error response data:", error.response.data);
      console.error("Error response status:", error.response.status);
      console.error("Error response headers:", error.response.headers);
    }

    res.status(500).json({ error: "Failed to validate PayPal payment." });
  }
});

// Other existing routes (unchanged)
router.post("/add", async (req, res) => {
  const { userId, creditsPurchased, amount, paymentMethod, transactionId } = req.body;

  try {
    const purchase = new Purchase({
      userId,
      creditsPurchased,
      amount,
      paymentMethod,
      transactionId,
    });

    await purchase.save();
    res.status(201).json({ message: "Purchase added successfully!", purchase });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add purchase." });
  }
});

router.get("/history/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const purchases = await Purchase.find({ userId }).sort({ transactionDate: -1 });
    res.status(200).json({ purchases });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch purchase history." });
  }
});

router.delete("/delete/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const purchase = await Purchase.findByIdAndDelete(id);

    if (!purchase) {
      return res.status(404).json({ error: "Purchase not found." });
    }

    res.status(200).json({ message: "Purchase deleted successfully!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete purchase." });
  }
});

router.put("/update/:id", async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    const purchase = await Purchase.findByIdAndUpdate(id, updates, {
      new: true, // Return the updated document
      runValidators: true, // Ensure validation is run on updates
    });

    if (!purchase) {
      return res.status(404).json({ error: "Purchase not found." });
    }

    res.status(200).json({ message: "Purchase updated successfully!", purchase });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update purchase." });
  }
});

// Fetch all purchases
router.get("/", async (req, res) => {
  try {
    const purchases = await Purchase.find()
      .populate("userId", "username email")
      .sort({ transactionDate: -1 });
    res.status(200).json(purchases);
  } catch (error) {
    console.error("Error fetching purchases:", error);
    res.status(500).json({ message: "Failed to fetch purchases." });
  }
});

router.post("/purchase-course", async (req, res) => {
  const { users, courses, paymentDetails } = req.body;

  try {
    for (const user of users) {
      for (const course of courses) {
        // Create purchase record
        const purchase = new Purchase({
          userId: user.id,
          creditsPurchased: 0,
          amount: paymentDetails.amount,
          paymentMethod: paymentDetails.method,
          transactionId: paymentDetails.transactionId,
        });
        await purchase.save();

        // Create subscription
        const subscription = new Subscription({
          userId: user.id,
          courseId: course.id,
          period: paymentDetails.subscriptionPeriod,
        });
        await subscription.save();

        // Register for quizzes
        const quizzes = await Quiz.find({ courseId: course.id });
        for (const quiz of quizzes) {
          const registration = new Registration({
            userId: user.id,
            quizId: quiz.id,
          });
          await registration.save();
        }
      }
    }

    res.status(201).json({ message: "Purchase and related records created successfully!" });
  } catch (error) {
    console.error("Error processing purchase:", error);
    res.status(500).json({ message: "Failed to process purchase." });
  }
});

module.exports = router;