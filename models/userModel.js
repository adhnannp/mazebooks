const mongoose = require("mongoose");

 
const userSchema = new mongoose.Schema({
    Email: { type: String, required: true, unique: true },
    LastName: { type: String, required: true },
    FirstName: { type: String, required: true },
    MobileNo: { type: String, required: false},
    UpdatedAt: { type: Date, required: true },
    CreatedAt: { type: Date, required: true },
    Password: { type: String},
    Is_admin: { type: Boolean, required: true, default: false},
    Is_block: { type: Boolean, required: true, default: false },
    Is_verified: { type: Boolean, required: true ,default: false},
    OTP: { type: String },
    otpExpires: { type: Date }, // Expiration time for the OTP
    resetPasswordToken: { type: String },// Token for resetting the password
    resetPasswordExpires: { type: Date },// Expiration time for the token
    ProfileImage: { type: String, default: null },
    referralCode: { type: String },  
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },  
    referredUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], 
    referralAmount: { type: Number, default: 0 },
})

module.exports = mongoose.model("User", userSchema)