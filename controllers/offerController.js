const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const User = require("../models/userModel");
const bcrypt = require("bcrypt");
const Product = require("../models/productModel");
const Category = require("../models/categoryModel");
const Order = require("../models/orderModel");
const Wallet = require("../models/walletModel");
const Coupon = require("../models/coupenModel")
const Offer = require("../models/offerModel")

const offerLoad = async (req, res) => {
    try {
        const admin = await User.findById(req.session.user_id); 
        
        const currentPage = parseInt(req.query.page) || 1; 
        const itemsPerPage = 5; // Items per page

        const totalOffers = await Offer.countDocuments();
        const totalPages = Math.ceil(totalOffers / itemsPerPage);

        // Fetch offers with pagination
        const offers = await Offer.find()
            .skip((currentPage - 1) * itemsPerPage)
            .limit(itemsPerPage);

        // Populate each offer based on its TargetType
        const populatedOffers = await Promise.all(
            offers.map(async (offer) => {
                let targets = []; 
                if (offer.TargetType === 'Product') {
                    targets = await Product.find({ _id: { $in: offer.TargetId } }).select('Name');
                } else if (offer.TargetType === 'Category') {
                    targets = await Category.find({ _id: { $in: offer.TargetId } }).select('CategoryName');
                }

                return { ...offer.toObject(), Targets: targets }; // Attach targets information
            })
        );

        res.render('offers', {
            offers: populatedOffers,
            admin,
            currentPage,
            totalPages,
        });
    } catch (error) {
        console.error("Error fetching offers:", error);
        res.status(500).send("Internal Server Error");
    }
};

const offerAddLoad = async (req, res) => {
    try {
        const categories = await Category.find();
        const products = await Product.find();
        const admin = await User.findById(req.session.user_id);

        res.render('addOffer', {
            admin,
            categories,
            products,
        });
    } catch (error) {
        console.error("Error loading add offer page:", error);
        res.status(500).send("Internal Server Error");
    }
};

const addOffer = async (req, res) => {
    try {
        // Extract form data from request body
        const { title, targetType, discount, startDate, endDate } = req.body;
        console.log(req.body)
        let targetIds = [];

        // Handle product or category selection based on target type
        if (targetType === 'Product') {
            targetIds = req.body.productIds; // Array of product IDs
        } else if (targetType === 'Category') {
            targetIds = req.body.categoryIds; // Array of category IDs
        }

        // Create a new offer object
        const newOffer = new Offer({
            Title : title.trim(),
            TargetType: targetType,
            TargetId: targetIds,
            DiscountPercentage: discount,
            StartDate: startDate,
            EndDate: endDate
        });

        // Save offer to the database
        await newOffer.save();

        // Redirect or send success response
        res.redirect('/admin/offers')
    } catch (error) {
        console.error('Error adding offer:', error);
        // Handle validation or server error
        res.status(500).json({ success: false, message: 'Failed to add offer.' });
    }
};

module.exports = {
    offerLoad,
    offerAddLoad,
    addOffer,
}