const mongoose = require('mongoose');

const CouponSchema = new mongoose.Schema({
  UpdatedAt: { type: Date, required: true, default: Date.now },
  CreatedAt: { type: Date, required: true, default: Date.now },
  ExpirationDate: { type: Date, required: true },
  DiscountPercentage: { type: Number, required: true }, // Changed from Double to Number
  MinimumPrice: { type: Number, required: true }, // Changed from Double to Number
  CoupenCode: { type: String, required: true, unique: true },
  IsActive: { type: Boolean, required: true, default: true }, // Default to true
  UsedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }] // Array of User IDs who have used this coupon
});

const Coupon = mongoose.model('Coupon', CouponSchema);