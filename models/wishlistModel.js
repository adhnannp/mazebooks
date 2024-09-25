const mongoose = require("mongoose");
const { Schema } = mongoose;

const wishlistSchema = new Schema({
    Products: [{
        ProductId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        // You can add more fields if needed, for example, for price or notes about the product
    }],
    UserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, {
    timestamps: true // This will automatically add createdAt and updatedAt fields
});

module.exports = mongoose.model("Wishlist", wishlistSchema);