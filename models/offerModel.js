const mongoose = require("mongoose");
const { Schema } = mongoose;

const offerSchema = new Schema({
    Title: { type: String, required: true },
    DiscountPercentage: { type: Number, required: true, min: 0, max: 100 },
    StartDate: { type: Date, required: true }, 
    EndDate: { type: Date, required: true }, 
    TargetId: [{ type: Schema.Types.ObjectId, required: true }],
    IsActive: { type: Boolean, required: true, default: true },
    TargetType: { 
        type: String, 
        enum: ['Product', 'Category'],
        required: true 
    }, 
}, {
    timestamps: true 
});


module.exports = mongoose.model('Offer', offerSchema);