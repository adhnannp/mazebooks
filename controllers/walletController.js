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

const loadWallet = async (req, res) => {
    try {
        // Attempt to find the user's wallet
        let wallet = await Wallet.findOne({ UserId: req.session.user_id }).populate('UserId');
        
        // If no wallet exists, create a new one
        if (!wallet) {
            wallet = await Wallet.create({
                UserId: req.session.user_id,
                balance: 0,
                transactions: []
            });
        }

        // Get the last 20 transactions (will be empty if new wallet)
        const recentTransactions = wallet.Transactions.slice(-20).reverse(); // Get last 20 transactions and reverse to show latest on top

        // Render the wallet page with the wallet and transactions
        res.render('walletPage', {
            wallet,
            recentTransactions,
            cartItemCount: req.session.cartItemCount,
            wishlistItemCount: req.session.wishlistItemCount,
            user: req.session.user_id
        });
    } catch (error) {
        console.error('Error loading wallet:', error);
        res.status(500).send('Internal Server Error');
    }
};

module.exports = {
    loadWallet,
}