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
const deactivateCoupon =  async (req, res) => {
    try {
      await Coupon.findByIdAndUpdate(req.params.id, { IsActive: false });
      res.redirect('/admin/coupons');
    } catch (error) {
      console.error(error);
      res.redirect('/admin/coupons');
    }
};
  
  //  for activating a coupon
const activateCoupon = async (req, res) => {
    try {
      await Coupon.findByIdAndUpdate(req.params.id, { IsActive: true });
      res.redirect('/admin/coupons');
    } catch (error) {
      console.error(error);
      res.redirect('/admin/coupons');
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
        // Find the coupon by ID and update its fields
        const updatedCoupon = await Coupon.findByIdAndUpdate(
            couponId,
            {
                CouponCode,
                MaxAmount,
                DiscountPercentage,
                StartDate,
                EndDate,
            },
            { new: true, runValidators: true } // Options to return the updated document and run validators
        );

        if (!updatedCoupon) {
            // If coupon not found, redirect to coupons page
            return res.redirect('/admin/coupons?error=nocouponfound');
        }

        // Redirect back to the coupons page
        res.redirect('/admin/coupons?success=couponedited');
    } catch (error) {
        console.error(error);
        
        // Redirect back to the coupons page in case of an error
        res.redirect('/admin/coupons?error=servererror');
    }
};

module.exports = {
    couponLoad,
    addCoupon,
    activateCoupon,
    deactivateCoupon,
    editCoupon,
}