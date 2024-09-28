const mongoose = require('mongoose');
const { Schema } = mongoose;

const CouponSchema = new Schema({
  StartDate: { type: Date, required: true},
  EndDate: { type: Date, required: true },
  DiscountPercentage: { type: Number, required: true }, // Changed from Double to Number
  MaxAmount: { type: Number, required: true }, // Changed from Double to Number
  CouponCode: { type: String, required: true, unique: true },
  IsActive: { type: Boolean, required: true, default: true }, // Default to true
  UsedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }] // Array of User IDs who have used this coupon
},{
  timestamps: true
});

module.exports =mongoose.model('Coupon', CouponSchema);