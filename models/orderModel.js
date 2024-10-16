const mongoose = require("mongoose");
const { Schema } = mongoose;

const orderSchema = new Schema({
    OrderId: { type: String, unique: true },
    PaymentMethod: { type: String, required: true },
    PaymentStatus: { type: String, required: true ,default:'Pending'},
    RazorpayPaymentId :{ type: String, unique: true, required :false },
    RazorpayOrderId: { type: String, required :false },
    UserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    Products: [{
       ProductId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
       Quantity: { type: Number, required: true },
    }],
    TotalPrice: { type: Number, required: true },
    ActualTotalPrice: {type: Number,required: false},
    AppliedCoupon: {type: String, required: false},
    PriceWithoutDedection:{type: Number, required: false},
    Address: {
      FullName: { type: String, required: true },
      Address: { type: String, required: true },
      MobileNo: { type: String, required: true },
      Pincode: { type: Number, required: true },
      FlatNo: { type: String, required: false },
      Country: { type: String, required: true },
      City: { type: String, required: true },
      District: { type: String, required: true },
      Landmark: { type: String, required: false },
      State: { type: String, required: true }
    },
    Status: { type: String, required: true ,default:'Pending'},
    PlacedAt: { type: Date, required:false},  // Date when the order is placed
    ReturnRequest: {
      reason: { type: String, required: false, default: null }, // Reason for return
      comments: { type: String, required: false, default: null }, // Additional comments
      requestedAt: { type: Date, required: false, default: null }, // Date when the return was requested
      status: { type: String, default: null, required:false } // Status of the return request
    }
    },
    {
      timestamps: true
});

orderSchema.pre('save', function (next) {
  if (this.isNew) {
      this.OrderId = `ORDER-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  }
  next();
})

module.exports =mongoose.model('Order', orderSchema);