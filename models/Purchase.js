const mongoose = require("mongoose");

const purchaseSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, // Reference to the user making the purchase
    ref: "User", 
    required: true 
  },
  creditsPurchased: { 
    type: Number, // Number of credits purchased
    required: true 
  },
  amount: { 
    type: Number, // Total amount paid for the credits
    required: true 
  },
  transactionDate: { 
    type: Date, // Date of the transaction
    default: Date.now 
  },
  paymentMethod: { 
    type: String, // Optional: Payment method used (e.g., "Credit Card", "PayPal")
    default: "Credit Card" 
  },
  transactionId: { 
    type: String, // Optional: Unique identifier for the transaction (from payment gateway)
    required: false 
  }
});

// Export the Purchase model
module.exports = mongoose.model("Purchase", purchaseSchema);