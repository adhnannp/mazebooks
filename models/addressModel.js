const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema({
    UserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    MobileNo: { type: String, required: true },
    FullName: { type: String, required: true },
    Address: { type: String, required: true },
    Landmark: { type: String },
    Pincode: { type: Number, required: true },
    FlatNo: { type: String },
    State: { type: String, required: true },
    District: { type: String, required: true },
    City: { type: String, required: true },
    Country: { type: String, required: true },
    AddressType: { type: String}
}, { timestamps: true }); 

module.exports = mongoose.model("Address", addressSchema);