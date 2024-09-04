const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
    CategoryName: { type: String, required: true, unique: true },
    CreatedAt: { type: Date, required: true },
    UpdatedAt: { type: Date, required: true },
    Is_list: { type: Boolean, default: true ,required: true },
});

module.exports = mongoose.model("Category", productSchema)