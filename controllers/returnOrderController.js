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
        const { productId, returnReason, comments } = req.body;
        const orderId = req.params.orderId;

        // Find the order by ID
        const order = await Order.findById(orderId);

        if (!order) {
            return res.redirect(`/myaccount/delivered-orders?error=Order not found`);
        }

        // Find the product in the order
        const productIndex = order.Products.findIndex(product => product.ProductId.toString() === productId);
        if (productIndex === -1) {
            return res.redirect(`/myaccount/delivered-orders?error=Product not found in order`);
        }
        const product = order.Products[productIndex];

        // Check if the product has already been requested for return
        if (product.ProductStatus === 'Return Requested') {
            return res.redirect(`/myaccount/delivered-orders?error=Return request for this product already exists`);
        }

        // Update the product's return information
        product.ProductStatus = 'Return Requested';
        product.ReturnReason = returnReason; // Update return reason
        product.ReturnComments = comments || "No Additional Comments"; // Update additional comments
        product.ReturnRequestedAt = new Date(); // Update the request timestamp

        // Save the updated order
        await order.save();

        // Redirect to the order history page with success message
        res.redirect(`/myaccount/delivered-orders?success=Return request submitted successfully`);
    } catch (error) {
        console.error('Error processing return request:', error);
        res.redirect(`/myaccount/delivered-orders?error=Internal Server Error`);
    }
};

const handleReturnRequest = async (req, res) => {
    const { orderId } = req.params;
    const { action, products } = req.body; // Get action and selected products from form data
    console.log(orderId, action, products); // Log all received data for debugging

    try {
        // Find the order by its ID
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Ensure products is an array
        const selectedProducts = Array.isArray(products) ? products : [products];

        // Initialize variables for price reductions
        let totalProductRefund = 0;
        let totalActualPriceReduction = 0;
        let totalWithoutDeductionReduction = 0;
        let allProductsReturned = true;

        // Handle action based on the request
        if (action === 'reject') {
            // Set the status to 'Return Rejected' for all selected products
            selectedProducts.forEach(productId => {
                const productInOrder = order.Products.find(p => p.ProductId.toString() === productId);
                if (productInOrder) {
                    productInOrder.ProductStatus = 'Return Rejected';
                }
            });
        } else if (action === 'accept') {
            // Process return for each selected product
            selectedProducts.forEach(productId => {
                const productInOrder = order.Products.find(p => p.ProductId.toString() === productId);
                if (productInOrder && productInOrder.ProductStatus === 'Placed') {
                    // Update the product status to 'Returned'
                    productInOrder.ProductStatus = 'Returned';

                    // (price after offer)
                    totalActualPriceReduction += productInOrder.Price * productInOrder.Quantity;

                    // (original price)
                    totalWithoutDeductionReduction += productInOrder.PriceWithoutOffer * productInOrder.Quantity;

                    // Add the refund amount to totalProductRefund
                    totalProductRefund += productInOrder.Price * productInOrder.Quantity;
                }
            });

            // Check if all products are returned
            order.Products.forEach(product => {
                if (product.ProductStatus !== 'Returned') {
                    allProductsReturned = false;
                }
            });

            // Update the order if all products are returned
            if (allProductsReturned) {
                order.Status = 'Returned';
            }

            // Update the order's price fields
            order.TotalPrice -= totalProductRefund;
            order.ActualTotalPrice -= totalActualPriceReduction;
            order.PriceWithoutDeduction -= totalWithoutDeductionReduction;

            // Find the user's wallet
            let wallet = await Wallet.findOne({ UserId: order.UserId });
            if (!wallet) {
                wallet = await Wallet.create({
                    UserId: order.UserId,
                    balance: 0,
                    transactions: []
                });
            }

            // Add the refund amount to the wallet balance
            wallet.Balance += totalProductRefund; // Assuming totalProductRefund is the amount to be returned

            // Add a transaction record for the return
            wallet.Transactions.push({
                Type: 'Return Order',
                Amount: totalProductRefund,
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
        res.status(200).json({ success: true, message: 'Return request updated successfully', order, selectedProducts });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};


module.exports = {
    returnRequest,
    handleReturnRequest,
}