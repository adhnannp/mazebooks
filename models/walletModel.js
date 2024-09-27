const mongoose = require('mongoose');
const { Schema } = mongoose;

const walletSchema = new Schema({
    UserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    Balance: {type: Number, required: true, default: 0},
    Transactions: [
        {Type: {type: String, required: true},
        Amount: { type: Number, required: true},
        Date: {type: Date, required: true}}
    ]
},{
    timestamps: true
});

module.exports  = mongoose.model('Wallet', walletSchema);