const mongoose = require('mongoose')
const User = require('../models/userModel');
const bcrypt = require('bcrypt');
require('dotenv').config();
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const Product = require("../models/productModel");
const Category = require("../models/categoryModel");
const Address = require("../models/addressModel");
const Cart = require("../models/cartModel");
const Order = require("../models/orderModel");
const Wishlist = require("../models/wishlistModel");
const Wallet = require("../models/walletModel");


const returnRequest = async (req, res) => {
    try {
        const { returnReason, comments } = req.body;
        const orderId = req.params.orderId;

        // Update the order with return request details
        await Order.findByIdAndUpdate(orderId, {
            ReturnRequest: {
                reason: returnReason, 
                comments: comments || null,
                requestedAt: new Date(), 
                status: 'Requested'
            }
        });
        res.redirect('/myaccount/order-history');
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};

const handleReturnRequest = async (req, res) => {
    const { orderId } = req.params;
    const { action } = req.body;
    console.log(orderId, action);

    try {
        // Find the order by its ID
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Handle action based on the request
        if (action === 'reject') {
            order.ReturnRequest.status = 'Rejected';
        } else if (action === 'accept') {
            order.ReturnRequest.status = 'Returned';
            order.Status = 'Returned'; // Update the order status as well

            // Find the user's wallet
            const wallet = await Wallet.findOne({ UserId: order.UserId });
            if (!wallet) {
                wallet = await Wallet.create({
                    UserId: req.session.user_id,
                    balance: 0,
                    transactions: []
                });
            }

            // Add the amount of the order to the wallet balance
            wallet.Balance += order.TotalPrice; // Assuming order.TotalAmount contains the amount to be returned

            // Add a transaction record for the return
            wallet.Transactions.push({
                Type: 'Return Order',
                Amount: order.TotalPrice,
                Date: new Date() // Current date for the transaction
            });

            // Save the updated wallet
            await wallet.save();
        } else {
            return res.status(400).json({ success: false, message: 'Invalid action' });
        }

        // Save the updated order
        await order.save();

        // Return a success response
        res.status(200).json({ success: true, message: 'Return request updated successfully', order });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

module.exports = {
    returnRequest,
    handleReturnRequest,
}