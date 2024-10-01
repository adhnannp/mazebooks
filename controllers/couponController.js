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

const couponLoad = async (req, res) => {
    try {
        const admin = await User.findById(req.session.user_id); 
        const allCoupons = await Coupon.find()

        const currentPage = parseInt(req.query.page) || 1; // Get current page, default to 1
        const itemsPerPage = 5; 

        // Calculate total coupons and pages
        const totalCoupons = await Coupon.countDocuments();
        const totalPages = Math.ceil(totalCoupons / itemsPerPage);

        // Fetch coupons with pagination
        const coupons = await Coupon.find()
            .skip((currentPage - 1) * itemsPerPage)
            .limit(itemsPerPage)
            .exec();

        // Render the coupons
        res.render("coupons", {
            allCoupons,
            coupons,
            admin,
            currentPage,
            totalPages,
        });
    } catch (error) {
        console.error("Error loading coupons:", error);
        res.status(500).send("Server Error");
    }
};

const addCoupon = async (req, res) => {
    try {
      const { CouponCode, MaxAmount, DiscountPercentage, StartDate, EndDate } = req.body;

      // Validate that the start date is earlier than the end date
      if (new Date(StartDate) > new Date(EndDate)) {
        return res.status(400).redirect('/admin/coupons?error=StartDateMustBeEarlier');
      }

      // Check if a coupon with the same code already exists
      const existingCoupon = await Coupon.findOne({ CouponCode: CouponCode });
      if (existingCoupon) {
        return res.status(400).redirect('/admin/coupons?error=CouponCodeExists');
      }

      // Create new coupon
      const newCoupon = new Coupon({
        CouponCode: CouponCode,
        MaxAmount: parseFloat(MaxAmount), // Convert input to number
        DiscountPercentage: parseFloat(DiscountPercentage), // Convert input to number
        StartDate: new Date(StartDate),
        EndDate: new Date(EndDate),
      });

      await newCoupon.save();

      // Redirect to the coupons page with success query
      return res.status(200).redirect('/admin/coupons?success=CouponAdded');
    } catch (error) {
      console.error('Error adding coupon:', error);
      return res.status(500).redirect('/admin/coupons?error=ServerError');
    }
};

//  for deactivating a coupon
const deactivateCoupon = async (req, res) => {
  try {
      await Coupon.findByIdAndUpdate(req.params.id, { IsActive: false });
      res.redirect('/admin/coupons?success=coupondeactivated');
  } catch (error) {
      console.error(error);
      res.redirect('/admin/coupons?error=servererror');
  }
};

//  for activating a coupon
const activateCoupon = async (req, res) => {
  try {
      await Coupon.findByIdAndUpdate(req.params.id, { IsActive: true });
      res.redirect('/admin/coupons?success=couponactivated');
  } catch (error) {
      console.error(error);
      res.redirect('/admin/coupons?error=servererror');
  }
};

//  for editing a coupon
const editCoupon = async (req, res) => {
  const couponId = req.params.id;
  const {
      CouponCode,
      MaxAmount,
      DiscountPercentage,
      StartDate,
      EndDate,
  } = req.body;

  try {
      const updatedCoupon = await Coupon.findByIdAndUpdate(
          couponId,
          {
              CouponCode,
              MaxAmount,
              DiscountPercentage,
              StartDate,
              EndDate,
          },
          { new: true, runValidators: true } 
      );

      if (!updatedCoupon) {
          return res.redirect('/admin/coupons?error=nocouponfound');
      }

      res.redirect('/admin/coupons?success=couponedited');
  } catch (error) {
      console.error(error);
      res.redirect('/admin/coupons?error=servererror');
  }
};

const applyCoupon = async (req, res) => {
    const { couponCode, cartTotal } = req.body; // Get coupon code and user info from request body
    const userId = req.session.user_id;
    try {
        // Find the coupon
        const coupon = await Coupon.findOne({ CouponCode: couponCode, IsActive: true });
        const currentDate = new Date();
        
        if (!coupon || coupon.StartDate > currentDate || coupon.EndDate < currentDate) {
            return res.status(400).json({ message: 'Invalid coupon' });
        }

        // Check if the user has already used the coupon
        if (coupon.UsedBy.includes(userId)) {
            return res.status(400).json({ message: 'Coupon has already been used by this user' });
        }

        // Calculate discount
        const discountAmount = (cartTotal * coupon.DiscountPercentage) / 100;
        const totalDiscountedPrice = cartTotal - discountAmount;

        // Send back the updated total price
        res.json({ totalPrice: totalDiscountedPrice.toFixed(2), message: 'Coupon applied successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'An error occurred while applying the coupon' });
    }
};

const removeCoupon = async (req, res) => {
    const { couponCode,cartTotal } = req.body;

    try {
        const coupon = await Coupon.findOne({ CouponCode: couponCode });

        if (!coupon) {
            return res.status(404).json({ message: 'Coupon not found' });
        }
        
        // Calculate the new cart total without the discount
        const totalPrice = cartTotal; /* Your logic to calculate the price without the coupon discount */;

        res.json({ message: 'Coupon removed successfully', totalPrice });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    couponLoad,
    addCoupon,
    activateCoupon,
    deactivateCoupon,
    editCoupon,
    applyCoupon,
    removeCoupon,
}