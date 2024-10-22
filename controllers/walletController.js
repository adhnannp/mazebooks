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
        // Fetch current page from query params, default is 1
        const currentPage = parseInt(req.query.page) || 1;

        // Number of transactions to show per page
        const transactionsPerPage = 40;

        // Find the user's wallet
        let wallet = await Wallet.findOne({ UserId: req.session.user_id }).populate('UserId');

        // If no wallet exists, create a new one
        if (!wallet) {
            wallet = await Wallet.create({
                UserId: req.session.user_id,
                balance: 0,
                transactions: []
            });
        }

        // Total transactions and total pages calculation
        const totalTransactions = wallet.Transactions.length;
        const totalPages = Math.ceil(totalTransactions / transactionsPerPage);

        // Calculate start and end index for paginated transactions
        const startIndex = (currentPage - 1) * transactionsPerPage;
        const paginatedTransactions = wallet.Transactions.slice(startIndex, startIndex + transactionsPerPage).reverse();

        // Render the wallet page with pagination data
        res.render('walletPage', {
            wallet,
            paginatedTransactions, // Pass only paginated transactions for current page
            currentPage,
            totalPages,
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