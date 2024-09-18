const mongoose = require("mongoose");
const { Schema } = mongoose;

const cartSchema = new Schema({ 
    Products: [{
    ProductId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    Quantity: { type: Number, required: true },
    Price: { type: Number, required: true } // Added price field
  }],
  UserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, {
  timestamps: true
});

module.exports = mongoose.model("Cart", cartSchema)