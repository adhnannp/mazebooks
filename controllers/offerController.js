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
        const { title, targetType, discount, startDate, endDate, productIds, categoryIds } = req.body;
        console.log(req.body);
        let targetIds = [];

        // Handle product or category selection based on target type
        if (targetType === 'Product') {
            targetIds = productIds; // Array of product IDs
        } else if (targetType === 'Category') {
            targetIds = categoryIds; // Keep category IDs as targetIds
        }

        // Check for existing offer with the same title (case insensitive)
        const existingOffer = await Offer.findOne({ 
            Title: { $regex: new RegExp(`^${title.trim()}$`, 'i') } // Case insensitive check
        });

        if (existingOffer) {
            // Redirect with an error message in query parameters
            const redirectUrl = `/admin/offers/add?error=Offer with this name already exists.`;
            return res.redirect(redirectUrl);
        }

        // Create a new offer object
        const newOffer = new Offer({
            Title: title.trim(),
            TargetType: targetType,
            TargetId: targetIds, // This now stores category IDs if TargetType is 'Category'
            DiscountPercentage: discount,
            StartDate: startDate,
            EndDate: endDate
        });

        // Save offer to the database
        await newOffer.save();

        // Add the offer details to the selected products
        const offerUpdate = {
            OfferId: newOffer._id,
            DiscountPercentage: discount
        };

        // If TargetType is 'Category', find products in those categories and update them with the offer
        if (targetType === 'Category') {
            const productsInCategories = await Product.find({ CategoryId: { $in: categoryIds } });
            const productIdsInCategories = productsInCategories.map(product => product._id);
            
            // Update products to include the offer details
            await Product.updateMany(
                { _id: { $in: productIdsInCategories } },
                { $push: { Offers: offerUpdate } }
            );
        }

        // If TargetType is 'Product', update those products directly
        if (targetType === 'Product') {
            await Product.updateMany(
                { _id: { $in: targetIds } },
                { $push: { Offers: offerUpdate } }
            );
        }

        // Redirect to offers page with success message
        const successRedirectUrl = `/admin/offers?success=Offer added successfully.`;
        res.redirect(successRedirectUrl);
    } catch (error) {
        console.error('Error adding offer:', error);
        // Handle validation or server error
        const errorRedirectUrl = `/admin/offers?error=Failed to add offer.`;
        res.redirect(errorRedirectUrl);
    }
};

const deactivateOffer = async (req, res) => {
    try {
      await Offer.findByIdAndUpdate(req.params.id, { IsActive: false });
  
      // Redirect with a success status message
      res.redirect('/admin/offers?status=deactivated');
    } catch (error) {
      console.error(error);
      
      // Redirect with an error status
      res.redirect('/admin/offers?status=error');
    }
};

const activateOffer = async (req, res) => {
    try {
      await Offer.findByIdAndUpdate(req.params.id, { IsActive: true });
  
      // Redirect with a success status message
      res.redirect('/admin/offers?status=activated');
    } catch (error) {
      console.error(error);
      
      // Redirect with an error status
      res.redirect('/admin/offers?status=error');
    }
  };

  const editOfferLoad = async (req, res) => {
    try {
        const offerId = req.params.id; // Get the offer ID from the URL
        const offer = await Offer.findById(offerId); // Fetch the offer from the database
        const admin = await User.findById(req.session.user_id);

        if (!offer) {
            // Redirect to the offers page with an error message if the offer is not found
            return res.redirect('/admin/offers?error=Offer not found');
        }

        // Pass the offer data to the edit offer page
        res.render('editOffer', { 
            admin,
            offer: offer,
            products: await Product.find(), // Fetch products to populate checkboxes
            categories: await Category.find() // Fetch categories to populate checkboxes
        });
    } catch (error) {
        console.error(error);
        // Redirect to the offers page with a server error message
        res.redirect('/admin/offers?error=Server error occurred while fetching the offer');
    }
};

const editOffer = async (req, res) => {
    try {
        // Extract form data from request body
        const { title, targetType, discount, startDate, endDate } = req.body;
        const offerId = req.params.id;

        // Validation: Check for empty fields
        let errorMessages = [];
        if (!title) errorMessages.push('Title is required.');
        if (!targetType) errorMessages.push('Target Type is required.');
        if (!discount) errorMessages.push('Discount Percentage is required.');
        if (!startDate) errorMessages.push('Start Date is required.');
        if (!endDate) errorMessages.push('End Date is required.');

        // If there are validation errors, redirect with error messages
        if (errorMessages.length > 0) {
            const errorMessage = errorMessages.join(' ');
            return res.redirect(`/admin/offers/edit/${offerId}?error=${encodeURIComponent(errorMessage)}`);
        }

        // Check if offer with the same title (case-insensitive) already exists, excluding the current offer being edited
        const existingOfferWithSameTitle = await Offer.findOne({
            _id: { $ne: offerId }, // Exclude the current offer being edited
            Title: { $regex: new RegExp(`^${title.trim()}$`, 'i') } // Case-insensitive match
        });

        // If an offer with the same title exists, redirect with an error message
        if (existingOfferWithSameTitle) {
            return res.redirect(`/admin/offers/edit/${offerId}?error=Offer with the same title already exists.`);
        }

        // Find the existing offer by ID
        const existingOffer = await Offer.findById(offerId);

        // Check if the offer exists
        if (!existingOffer) {
            return res.redirect('/admin/offers?error=Offer not found.');
        }

        // Handle product or category selection based on target type
        let targetIds = [];

        // If the target type is Product, get the product IDs from the request
        if (targetType === 'Product') {
            targetIds = req.body.productIds; // Array of product IDs

            // Remove previous offers from the products previously targeted
            await Product.updateMany(
                { _id: { $in: existingOffer.TargetId } },
                { $pull: { Offers: { OfferId: existingOffer._id } } }
            );

            // Add the updated offer details to the selected products
            const offerUpdate = {
                OfferId: offerId,
                DiscountPercentage: discount
            };

            // Update products to include the new offer details
            await Product.updateMany(
                { _id: { $in: targetIds } },
                { $push: { Offers: offerUpdate } }
            );
        } else if (targetType === 'Category') {
            // If target type is Category, save the CategoryId in the Offer collection
            targetIds = req.body.categoryIds; // Array of category IDs

            // Find all products in the selected categories
            const productsInCategory = await Product.find({ CategoryId: { $in: targetIds } }).select('_id');
            const productIdsInCategory = productsInCategory.map(product => product._id);

            // Remove previous offers from the products in those categories
            await Product.updateMany(
                { _id: { $in: existingOffer.TargetId } },
                { $pull: { Offers: { OfferId: existingOffer._id } } }
            );

            // Add the updated offer details to the products in the selected categories
            const offerUpdate = {
                OfferId: offerId,
                DiscountPercentage: discount
            };

            // Update products in the selected categories with the new offer details
            await Product.updateMany(
                { _id: { $in: productIdsInCategory } },
                { $push: { Offers: offerUpdate } }
            );
        }

        // Create a new offer object with updated values
        const updatedOffer = {
            Title: title.trim(),
            TargetType: targetType,
            TargetId: targetType === 'Product' ? targetIds : req.body.categoryIds, // Save CategoryId if targetType is Category
            DiscountPercentage: discount,
            StartDate: startDate,
            EndDate: endDate
        };

        // Update the offer in the database
        await Offer.findByIdAndUpdate(offerId, updatedOffer);

        // Redirect to offers page with success message
        const successRedirectUrl = `/admin/offers?success=Offer updated successfully.`;
        res.redirect(successRedirectUrl);
    } catch (error) {
        console.error('Error editing offer:', error);
        // Handle validation or server error
        const errorRedirectUrl = `/admin/offers?error=Failed to update offer.`;
        res.redirect(errorRedirectUrl);
    }
};

module.exports = {
    offerLoad,
    offerAddLoad,
    addOffer,
    deactivateOffer,
    activateOffer,
    editOfferLoad,
    editOffer,
}