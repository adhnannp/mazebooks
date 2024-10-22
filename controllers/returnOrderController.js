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
const Coupon = require("../models/coupenModel");


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
    const { action, products } = req.body; 
    console.log('Action:', action);
    console.log('OrderId:', orderId);
    console.log('Products:', products);

    try {
        const order = await Order.findById(orderId);
        if (!order) {
            console.log('Order not found');
            return res.redirect(`/admin/orders?error=Order not found`);
        }
        console.log(order)

        // Remove duplicate product IDs
        const selectedProducts = Array.isArray(products) ? [...new Set(products)] : [products];
        const uniqueProductIds = selectedProducts.map(productId => new mongoose.Types.ObjectId(productId));
        console.log('Unique Selected Products:', uniqueProductIds);

        let totalProductRefund = 0;
        let totalActualPriceReduction = 0;
        let totalWithoutDeductionReduction = 0;
        let discountPercentage = 0;

        // Check if a coupon was applied
        if (order.AppliedCoupon) {
            const coupon = await Coupon.findOne({ CouponCode: order.AppliedCoupon });
            if (coupon) {
                discountPercentage = coupon.DiscountPercentage;
            }
        }

        if (action === 'reject') {
            // If rejecting the return
            uniqueProductIds.forEach(productId => {
                const productInOrder = order.Products.find(p => p.ProductId.equals(productId));
                if (productInOrder) {
                    productInOrder.ProductStatus = 'Return Rejected';
                    console.log(`Product ${productId} status set to 'Return Rejected'`);
                } else {
                    console.log(`Product ${productId} not found in order`);
                }
            });
        } else if (action === 'accept') {
            await Promise.all(uniqueProductIds.map(async (productId) => {
                const productInOrder = order.Products.find(p => p.ProductId.equals(productId));
                console.log(`Checking product ${productId}:`, productInOrder); // Log the product details
                if (productInOrder) {
                    if (productInOrder.ProductStatus === 'Return Requested') {
                        productInOrder.ProductStatus = 'Returned';

                        const productTotal = productInOrder.Price * productInOrder.Quantity;
                        let refundAmount = productTotal;

                        // Apply coupon discount if applicable
                        if (discountPercentage > 0) {
                            refundAmount = productTotal - (productTotal * (discountPercentage / 100));
                        }

                        // Add the refund amount
                        totalProductRefund += refundAmount;

                        // Price reductions
                        totalActualPriceReduction += productInOrder.Price * productInOrder.Quantity;
                        totalWithoutDeductionReduction += productInOrder.PriceWithoutOffer * productInOrder.Quantity;
                    } else {
                        console.log(`Product ${productId} is not eligible for return. Status: ${productInOrder.ProductStatus}`);
                    }
                } else {
                    console.log(`Product ${productId} is not found in order`);
                }
            }));

            // Check if all products have been returned
            const allProductsReturned = order.Products.every(product => product.ProductStatus === 'Returned');
            const hasPlacedProduct = order.Products.some(product => 
                product.ProductStatus === 'Placed' || 
                product.ProductStatus === 'Return Rejected' || 
                product.ProductStatus === 'Return Requested'
            );
            const hasReturnedProduct = order.Products.some(product => product.ProductStatus === 'Returned');
            // Handle wallet refund if applicable
            let wallet = await Wallet.findOne({ UserId: order.UserId });
            if (!wallet) {
                wallet = await Wallet.create({
                    UserId: order.UserId,
                    Balance: 0,
                    Transactions: []
                });
            }
            //no need to send the shipping charge
            if (allProductsReturned) {
                wallet.Balance += totalProductRefund;
                wallet.Transactions.push({
                    Type: 'Returned Order',
                    Amount: totalProductRefund,
                    Date: new Date()
                });
                await wallet.save();

                order.TotalPrice = order.ReferencePrice.TotalPrice;
                order.ActualTotalPrice = order.ReferencePrice.ActualTotalPrice;
                order.PriceWithoutDedection = order.ReferencePrice.PriceWithoutDeduction;
                order.Status = 'Returned';
            } else if (!hasPlacedProduct && hasReturnedProduct) {
                wallet.Balance += totalProductRefund;
                wallet.Transactions.push({
                    Type: 'Returned Order',
                    Amount: totalProductRefund,
                    Date: new Date()
                });
                await wallet.save();
                order.Status = 'Returned';
            } else {
                order.TotalPrice -= totalProductRefund;
                order.ActualTotalPrice -= totalActualPriceReduction;
                order.PriceWithoutDedection -= totalWithoutDeductionReduction;

                wallet.Balance += totalProductRefund;
                wallet.Transactions.push({
                    Type: 'Returned Products',
                    Amount: totalProductRefund,
                    Date: new Date()
                });

                await wallet.save();
            }
        } else {
            return res.redirect(`/admin/orders?error=Invalid action`);
        }
        await order.save();
        res.redirect(`/admin/orders?success=Product Return Request handled successfully`);
    } catch (error) {
        console.error('Error:', error);
        res.redirect(`/admin/orders?error=Internal server error`);
    }
};





module.exports = {
    returnRequest,
    handleReturnRequest,
}