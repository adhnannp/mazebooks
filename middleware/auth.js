const User = require('../models/userModel');
const Product = require("../models/productModel");
const Category = require("../models/categoryModel");
const Wishlist = require("../models/wishlistModel");
const Cart = require("../models/cartModel");

const isLogin = async (req, res, next) => {
    try {
        if (req.session.user_id && !req.session.is_admin && !req.session.is_block) {
            return next();
        } else {
            return res.redirect('/');
        }
    } catch (error) {
        console.log(error.message);
        return res.status(500).send('Internal Server Error');
    }
};

const isLogout = async (req, res, next) => {
    try {
        if (req.session.user_id && !req.session.is_admin && !req.session.is_block) {
            return res.redirect('/home');
        } else {
            return next();
        }
    } catch (error) {
        console.log(error.message);
        return res.status(500).send('Internal Server Error');
    }
};

const isVerified =  async (req, res, next) => {
    try {
        const user = await User.findById(req.session.user_id)
        req.session.is_verified = user?user.Is_verified:'';
        if (req.session.user_id && !req.session.is_verified && !req.session.is_admin && !req.session.is_block) {
            return next();
        } else {
            return res.redirect('/home');
        }
    } catch (error) {
        console.log(error.message);
        return res.status(500).send('Internal Server Error');
    }
};

const ifNotVerified = async (req, res, next) => {
    try {
        const user = await User.findById(req.session.user_id)
        req.session.is_verified = user?user.Is_verified:'';
        if (req.session.user_id && !req.session.is_verified) {
            return res.redirect('/verify-otp');
        } else {
            return next()
        }
    } catch (error) {
        console.log(error.message);
        return res.status(500).send('Internal Server Error');
    }
};

const isblock =  async (req, res, next) => {
    try {
        const user = await User.findById(req.session.user_id)
        if (user && user.Is_block) {
            req.session.destroy();
            return res.redirect('/home');
        } else {
            next()
        }
    } catch (error) {
        console.log(error.message);
        return res.status(500).send('Internal Server Error');
    }
};

// New middleware to prevent access to user login if admin is logged in
const isAdminLogin = async (req, res, next) => {
    try {
        if (req.session.user_id && req.session.is_admin) {
            return res.redirect('/admin/home');
        } else {
            next();
        }
    } catch (error) {
        console.log(error.message);
        return res.status(500).send('Internal Server Error');
    }
};

// Middleware to protect routes
const isAnyOne = async (req, res, next) => {
    try {
        if (req.session.user_id && req.session.is_admin) {
            return res.redirect('/admin/home');
        } else if(req.session.user_id && !req.session.is_admin){
            return res.redirect('/home');
        }else {
            next();
        }
    } catch (error) {
        console.log(error.message);
        return res.status(500).send('Internal Server Error');
    }
};

// Middleware to protect success page
const haveOrderId = async (req, res, next) => {
    try {
        if (req.session.user_id && req.session.order_id) {
            return next();
        } 
        return res.redirect('/home')
    } catch (error) {
        console.log(error.message);
        return res.status(500).send('Internal Server Error');
    }
};

const noOrderId = async (req, res, next) => {
    try {
        if (req.session.user_id && !req.session.order_id) {
            return next();
        } 
        return res.redirect('/home')
    } catch (error) {
        console.log(error.message);
        return res.status(500).send('Internal Server Error');
    }
};

const getCounts = async (userId) => {
    const cart = await Cart.findOne({ UserId: userId }).populate({
        path: 'Products.ProductId',
        populate: { path: 'CategoryId' },
    });

    const wishlist = await Wishlist.findOne({ UserId: userId }).populate({
        path: 'Products.ProductId',
        populate: { path: 'CategoryId' },
    });

    const cartItemCount = cart ? cart.Products.filter(item => 
        item.ProductId && 
        item.ProductId.Is_list && 
        item.ProductId.CategoryId && 
        item.ProductId.CategoryId.Is_list
    ).length : 0;

    const wishlistItemCount = wishlist ? wishlist.Products.filter(item => 
        item.ProductId && 
        item.ProductId.Is_list && 
        item.ProductId.CategoryId && 
        item.ProductId.CategoryId.Is_list
    ).length : 0;

    return { cartItemCount, wishlistItemCount };
};

const updateCartAndWishlistCounts = async (req, res, next) => {
    try {
        if (req.session.user_id) {
            const userId = req.session.user_id;
            const counts = await getCounts(userId); // Reuse the getCounts function
    
            req.session.cartItemCount = counts.cartItemCount;
            req.session.wishlistItemCount = counts.wishlistItemCount;
        }
        next();
    } catch (error) {
        console.log(error.message);
        return res.status(500).send('Internal Server Error');
    }
    
};

module.exports = {
    isLogin,
    isLogout,
    isAdminLogin,
    isVerified,
    isblock,
    isAnyOne,
    haveOrderId,
    noOrderId,
    updateCartAndWishlistCounts,
    ifNotVerified,
};