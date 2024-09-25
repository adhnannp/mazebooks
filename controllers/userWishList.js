const mongoose = require('mongoose')
const User = require('../models/userModel');
const Product = require("../models/productModel");
const Category = require("../models/categoryModel");
const Wishlist = require("../models/wishlistModel");
const Cart = require("../models/cartModel");

//add product to whishList
const toggleWishlist = async (req, res) => {
    try {
        const { productId } = req.body; 
        const userId = req.session.user_id; 

        // Check if the product exists
        const product = await Product.findById(productId);
        if (!product) {
            return res.json({ success: false, message: 'Product not found' });
        }

        // Find or create a wishlist for the user
        let wishlist = await Wishlist.findOne({ UserId: userId });
        if (!wishlist) {
            wishlist = new Wishlist({ UserId: userId, Products: [] });
        }

        // Check if the product is already in the wishlist
        const productIndex = wishlist.Products.findIndex(item => item.ProductId.equals(productId));

        let isInWishlist = false;

        if (productIndex > -1) {
            // Product is in wishlist, so remove it
            wishlist.Products.splice(productIndex, 1);
        } else {
            // Product not in wishlist, so add it
            wishlist.Products.push({ ProductId: productId });
            isInWishlist = true;
        }

        // Save the updated wishlist
        await wishlist.save();

        // Update the session's wishlist item count
        req.session.wishlistItemCount = wishlist.Products.length;

        // Respond with the current state and message
        res.json({ success: true, isInWishlist, message: isInWishlist ? 'Product added to wishlist.' : 'Product removed from wishlist.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

//whish list load
const loadWishlist = async (req, res) => {
    try {
        // Fetch the user's wishlist
        const wishlist = await Wishlist.findOne({ UserId: req.session.user_id })
            .populate({
                path: 'Products.ProductId',
                match: { Is_list: true }, // Only include listed products
                populate: {
                    path: 'CategoryId',
                    match: { Is_list: true }, // Only include categories that are listed
                },
            })
            .exec();

        // Fetch the user's cart
        const cart = await Cart.findOne({ UserId: req.session.user_id })
            .populate({
                path: 'Products.ProductId',
            })
            .exec();

        // If wishlist is not found, return empty wishlist page
        if (!wishlist) {
            return res.render('wishlistPage', {
                user: req.session.user_id,
                wishlistItems: [], // Pass an empty wishlistItems array
                cartProducts: [], // Pass an empty array for cart products
            });
        }

        // Flag to check if the wishlist needs updating
        let wishlistUpdated = false;

        // Filter out products that are valid (product and category must both be listed)
        const validWishlistProducts = wishlist.Products.filter(product => {
            if (
                product.ProductId && // Ensure the product exists
                product.ProductId.CategoryId // Ensure the product's category exists
            ) {
                return true;
            }
            // If the product is not valid, it will be removed from the wishlist
            wishlistUpdated = true;
            return false;
        });

        // Update wishlist in database if there were changes
        if (wishlistUpdated) {
            wishlist.Products = validWishlistProducts;
            await wishlist.save();
        }

        // Extract product IDs from the cart
        const cartProductIds = cart ? cart.Products.map(item => item.ProductId._id.toString()) : [];

        // Render the wishlist page with necessary data
        res.render('wishlistPage', {
            user: req.session.user_id, // Pass the user session
            wishlistItems: validWishlistProducts, // Pass the valid wishlist items
            cartProducts: cartProductIds, // Pass cart product IDs to compare
            cartItemCount: req.session.cartItemCount,
            wishlistItemCount: req.session.wishlistItemCount,
        });

    } catch (error) {
        console.error(error.message);
        res.status(500).send('Internal Server Error');
    }
};

//remove ptoduct from cart
const removeFromWishlist = async (req, res) => {
    try {
        const productId = req.params.id;
        const userId = req.session.user_id; // Assuming you have user authentication

        // Remove the item from the wishlist
        const result = await Wishlist.updateOne(
            { UserId: userId },
            { $pull: { Products: { ProductId: productId } } }
        );

        const updatedWishlist = await Wishlist.findOne({ UserId: userId });

        const wishListItemCount = updatedWishlist ? updatedWishlist.Products.length : 0;
        req.session.wishlistItemCount = wishListItemCount;
        // Check if the update was successful
        if (result.modifiedCount > 0) {
            res.json({ success: true });
        } else {
            res.json({ success: false, message: "No item removed." });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false });
    }
};


module.exports = {
    toggleWishlist,
    loadWishlist,
    removeFromWishlist,
}