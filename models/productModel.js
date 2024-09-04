const mongoose = require("mongoose");
const { Schema } = mongoose; // Extract Schema from mongoose

const productSchema = new Schema({
    Description: { type: String, required: true },
    CategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    Name: { type: String, required: true },
    Images: [{ type: String, required: false }],
    Quantity: { type: Number, required: true },
    CreatedAt: { type: Date, required: true },
    UpdatedAt: { type: Date, required: true },
    Is_list: { type: Boolean, required: true },
});

module.exports = mongoose.model("Product", productSchema);
