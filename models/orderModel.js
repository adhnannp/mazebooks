const mongoose = require("mongoose");
const { Schema } = mongoose;

const orderSchema = new Schema({
    OrderId: { type: String, unique: true },
    PaymentMethod: { type: String, required: true },
    PaymentStatus: { type: String, required: true ,default:'pending'},
    RazorpayPaymentId :{ type: String, unique: true, required :false },
    RazorpayOrderId: { type: String, required :false },
    UserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    Products: [{
       ProductId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
       Quantity: { type: Number, required: true },
    }],
    TotalPrice: { type: Number, required: true },
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
    Status: { type: String, required: true ,default:'pending'}
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