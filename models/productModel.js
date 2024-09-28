const mongoose = require("mongoose");
const { Schema } = mongoose; // Extract Schema from mongoose

const productSchema = new Schema({
    Description: { type: String, required: true },
    CategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    Name: { type: String, required: true, unique: true },
    Author:{ type: String, required: true },
    Images: [{ type: String, required: true }],
    Quantity: { type: Number, required: true },
    Price: { type: Number, required: true },
    CreatedAt: { type: Date, required: true },
    UpdatedAt: { type: Date, required: true },
    Is_list: { type: Boolean, required: true },
    Offers: [{
        OfferId: { type: mongoose.Schema.Types.ObjectId, ref: 'Offer', required: false }, 
        DiscountPercentage: { type: Number, required: false,}
    }]
});

module.exports = mongoose.model("Product", productSchema);
