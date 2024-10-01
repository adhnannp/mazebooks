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
const Offer = require("../models/offerModel")


const getValidOffers = async () => {
    const currentDate = new Date(); // Get the current date

    return await Offer.find({
        IsActive: true,
        StartDate: { $lte: currentDate }, // Offer has started
        EndDate: { $gt: currentDate } // Offer has not ended
    }).select('_id Title DiscountPercentage TargetId TargetType'); // Select relevant fields
};
//registration

// Email configuration (update with your SMTP settings)
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: 'adhnanusman1234@gmail.com',
      pass: process.env.GOODLE_MAIL_PASS_KEY,
    }
});

//load home
const loadHome = async (req, res) => {
    try {
        // Fetch categories that are listed
        const listedCategories = await Category.find({ Is_list: true }).select('_id'); // Only selecting the _id field

        // Extract the category IDs into an array
        const listedCategoryIds = listedCategories.map(category => category._id);

        // Calculate total products and pages
        const totalProducts = await Product.countDocuments({
            CategoryId: { $in: listedCategoryIds },
            Is_list: true // Categories that are listed
        });

        // Fetch products with pagination and populate category
        const products = await Product.find({
            CategoryId: { $in: listedCategoryIds },
            Is_list: true // Categories that are listed
        })
            .populate('CategoryId')
            .limit(12);

        // Fetch the user's wishlist if logged in
        let wishlistItems = [];
        if (req.session.user_id) {
            const wishlist = await Wishlist.findOne({ UserId: req.session.user_id }).select('Products.ProductId');
            if (wishlist) {
                wishlistItems = wishlist.Products.map(item => item.ProductId.toString());
            }
        }

         // Fetch valid offers
         const validOffers = await getValidOffers();

         // Calculate discounted prices and include valid offers
         const productsWithDiscounts = products.map(product => {
             let discountPrice = product.Price; // Start with the original price
             let applicableOffers = []; // Array to hold applicable offers
 
             // Check for valid offers associated with the product
             if (product.Offers.length > 0) {
                 // Filter offers to find those that are applicable to this product
                 applicableOffers = validOffers.filter(offer => 
                     product.Offers.some(prodOffer => prodOffer.OfferId.toString() === offer._id.toString())
                 );
 
                 // If there are applicable offers, calculate the highest discount percentage
                 if (applicableOffers.length > 0) {
                     const discountPercentages = applicableOffers.map(offer => offer.DiscountPercentage || 0);
                     const maxDiscountPercentage = Math.max(...discountPercentages); // Find the maximum percentage
 
                     discountPrice = product.Price - (product.Price * maxDiscountPercentage / 100); // Calculate discounted price
                 }
             }
 
             return {
                 ...product.toObject(), // Convert to plain object
                 DiscountPrice: discountPrice, // Add the discount price
                 ValidOffers: applicableOffers // Include the valid offers in the product object
             };
         });

        // Render the products or send them as a response
        res.render("home", {
            products: productsWithDiscounts, // Pass the modified products array
            cartItemCount: req.session.cartItemCount,
            wishlistItemCount: req.session.wishlistItemCount,
            user: req.session.user_id,
            wishlistItems,
        });
    } catch (error) {
        console.log(error.message);
    }
};

//load Shop Page
const loadShop = async (req, res) => {
    try {
        // Fetch categories that are listed
        const listedCategories = await Category.find({ Is_list: true }).select('_id CategoryName'); // Select _id and CategoryName

        // Extract the category IDs into an array and prepare genres
        const listedCategoryIds = listedCategories.map(category => category._id);
        const genres = [...new Set(listedCategories.map(category => category.CategoryName))]; // Get unique genres

        // Get current page, default to 1
        const currentPage = parseInt(req.query.page) || 1;
        const itemsPerPage = 12; // Number of items per page

        // Get the selected genre and sort option from query parameters
        const selectedGenre = req.query.genre || '';
        const selectedSort = req.query.sort || 'featured'; // Default to 'featured'

        // Prepare filter for products
        const productFilter = {
            CategoryId: { $in: listedCategoryIds },Is_list:true, // Categories that are listed
        };

        if (selectedGenre) {
            // Find category ID for the selected genre
            const category = await Category.findOne({ CategoryName: selectedGenre });
            if (category) {
                productFilter.CategoryId = category._id;
            }
        }

        // Prepare sort option
        let sortOption = {};
        let collation = {}; // Initialize empty collation

        switch (selectedSort) {
            case 'low-to-high':
                sortOption = { Price: 1 };
                break;
            case 'high-to-low':
                sortOption = { Price: -1 };
                break;
            case 'a-to-z':
                sortOption = { Name: 1 };
                collation = { locale: 'en', strength: 2 }; // Case-insensitive collation
                break;
            case 'z-to-a':
                sortOption = { Name: -1 };
                collation = { locale: 'en', strength: 2 }; // Case-insensitive collation
                break;
            case 'featured':
            default:
                sortOption = {}; // No sorting for the default case
        }

        // Calculate total products and pages
        const totalProducts = await Product.countDocuments(productFilter);
        const totalPages = Math.ceil(totalProducts / itemsPerPage);

        // Fetch products with sorting and collation
        const products = await Product.find(productFilter)
            .populate('CategoryId')
            .sort(sortOption)
            .collation(collation) // Apply collation for case-insensitive sorting
            .skip((currentPage - 1) * itemsPerPage)
            .limit(itemsPerPage);
        

        let wishlistItems = [];
        if (req.session.user_id) {
            const wishlist = await Wishlist.findOne({ UserId: req.session.user_id }).select('Products.ProductId');
            if (wishlist) {
                wishlistItems = wishlist.Products.map(item => item.ProductId.toString());
            }
        }

         const validOffers = await getValidOffers()

        // Calculate discounted prices and include valid offers
        const productsWithDiscounts = products.map(product => {
            let discountPrice = product.Price; // Start with the original price
            let applicableOffers = []; // Array to hold applicable offers

            // Check for valid offers associated with the product
            if (product.Offers.length > 0) {
                // Filter offers to find those that are applicable to this product
                applicableOffers = validOffers.filter(offer => 
                    product.Offers.some(prodOffer => prodOffer.OfferId.toString() === offer._id.toString())
                );

                // If there are applicable offers, calculate the highest discount percentage
                if (applicableOffers.length > 0) {
                    const discountPercentages = applicableOffers.map(offer => offer.DiscountPercentage || 0);
                    const maxDiscountPercentage = Math.max(...discountPercentages); // Find the maximum percentage

                    discountPrice = product.Price - (product.Price * maxDiscountPercentage / 100); // Calculate discounted price
                }
            }

            return {
                ...product.toObject(), // Convert to plain object
                DiscountPrice: discountPrice, // Add the discount price
                ValidOffers: applicableOffers // Include the valid offers in the product object
            };
        });

        // Render the products or send them as a response
        res.render("shopPage", {
            products:productsWithDiscounts,
            genres,
            selectedGenre, // Pass selected genre to the view
            selectedSort,  // Pass selected sort to the view
            currentPage,
            totalPages,
            cartItemCount: req.session.cartItemCount,
            wishlistItemCount: req.session.wishlistItemCount,
            wishlistItems,
            user:req.session.user_id
        });
    } catch (error) {
        console.log(error.message);
    }
};

//load accountOverview
const loadAccountOverview = async(req,res)=>{
    try {
        if(req.session.is_admin){
            return res.redirect('/admin');
        }
        if (req.session.user_id && req.session.is_block){
            req.session.destroy();
            return res.render('myAccount',{
                user:"",
                cartItemCount: req.session.cartItemCount,
                wishlistItemCount: req.session.wishlistItemCount,
            });
        }
        if (req.session.user_id && req.session.is_verified && !req.session.is_block) {
            const user = await User.findOne({_id:req.session.user_id})
            return res.render('myAccount',{
                user:user,
                cartItemCount: req.session.cartItemCount,
                wishlistItemCount: req.session.wishlistItemCount,
                });
        }else if (req.session.user_id && !req.session.is_verified && !req.session.is_block){
            return res.redirect('/verify-otp');
        }else {
            return res.render('myAccount',{
                user:"",
                cartItemCount: req.session.cartItemCount,
                wishlistItemCount: req.session.wishlistItemCount,
            });
        }
    } catch (error) {
        console.log(error.message);
    }
} 

//render registration view
const loadRegister = async(req,res)=>{
    try {
        res.render('userRegister',{
            message:'',
            cartItemCount: req.session.cartItemCount,
            wishlistItemCount: req.session.wishlistItemCount,
            user:req.session.user_id
        });
    } catch (error) {
        console.log(error.message);
    }
}

//hashing password
const securePassword = async (password)=>{
    try {
        const passwordHash = await bcrypt.hash(password,10)  
        return passwordHash; 
    } catch (error) {
        console.log(error.massage);
    }
}

// insert user to db
const insertUser = async (req, res) => {
    try {
        // Check if user already exists based on email, name, or phone number
        const existingUser = await User.findOne({
            $or: [
                { Email: req.body.email },
                { MobileNo: req.body.mno }
            ]
        });

        if (existingUser) {
            // User already exists, render registration page with error message
            return res.render('userRegister', { 
                message: 'User with this credential already exists',
                cartItemCount: req.session.cartItemCount,
                wishlistItemCount: req.session.wishlistItemCount,
                user:req.session.user_id
            });
        }
        const otp = crypto.randomInt(100000, 999999).toString(); // Generate 6-digit OTP

        // If user does not exist, proceed with registration
        const spassword = await securePassword(req.body.password);
        const user = new User({
            Email: req.body.email,
            LastName: req.body.lname,
            FirstName:  req.body.fname,
            MobileNo: req.body.mno,
            UpdatedAt: Date.now(),
            CreatedAt: Date.now(),
            Password: spassword,
            DOB: req.body.dob,
            OTP: otp
        });

        const userData = await user.save();

         // Send OTP via email
         const mailOptions = {
            from: 'adhnanusman1234@gmail.com',
            to: userData.Email,
            subject: 'Your OTP Code',
            text: `Your OTP code is ${otp}`
        };

        await transporter.sendMail(mailOptions);

        req.session.is_block = user.Is_block;
        req.session.user_id = user._id;
        req.session.is_verified = user.Is_verified;
        req.session.is_admin = userData.Is_admin;

        res.redirect('/verify-otp');
    } catch (error) {
        console.log(error.message);
        res.render('userRegister', {
            message: 'An error occurred during registration',
            cartItemCount: req.session.cartItemCount,
            wishlistItemCount: req.session.wishlistItemCount,
            user:req.session.user_id
        });
    }
};


//login user methode started

const loginLoad = async(req ,res)=>{
    try {
        res.render('userLogin',{
            message:"",
            cartItemCount: req.session.cartItemCount,
            wishlistItemCount: req.session.wishlistItemCount,
            user:req.session.user_id
        });
    } catch (error) {
        console.log(error.message);
    }
}

//get count of listed products whose category is also listed for wish list and cart
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


//varify login
const varifyLogin = async(req,res)=>{
    try {
        const email= req.body.email;
        const password= req.body.password;
        const userData = await User.findOne({Email:email})
        if (userData) {
            const passwordMatch = await bcrypt.compare(password,userData.Password);
            if (passwordMatch) {
                if (userData.Is_admin || userData.Is_block) {
                    res.render('userLogin',{
                        message:"Enternig restricted",
                        user:req.session.user_id,
                        cartItemCount: req.session.cartItemCount,
                        wishlistItemCount: req.session.wishlistItemCount,
                    });
                }else if(!userData.Is_verified){
                    // Generate a new OTP
                    const newOtp = crypto.randomInt(100000, 999999).toString(); // Generate a 6-digit OTP 
                    //Update the user's OTP in the database
                    userData.OTP = newOtp;
                    userData.otpExpires = Date.now() + 5 * 60 * 1000; // 5 minutes from now
                    await userData.save();
                    // Send OTP via email
                     const mailOptions = {
                        from: 'adhnanusman1234@gmail.com',
                        to: userData.Email,
                        subject: 'Your OTP Code',
                        text: `Your OTP code is ${newOtp}`
                    };

                    await transporter.sendMail(mailOptions);
                    
                    req.session.user_id = userData._id;
                    req.session.is_admin = userData.Is_admin;
                    req.session.is_verified = userData.Is_verified
                    req.session.is_block = userData.Is_block;

                    const counts = await getCounts(userData._id);
                    req.session.cartItemCount = counts.cartItemCount;
                    req.session.wishlistItemCount = counts.wishlistItemCount;

                    res.redirect('/verify-otp')

                }else {
                    req.session.user_id = userData._id;
                    req.session.is_admin = userData.Is_admin;
                    req.session.is_verified = userData.Is_verified;
                    req.session.is_block = userData.Is_block;

                    const counts = await getCounts(userData._id);
                    req.session.cartItemCount = counts.cartItemCount;
                    req.session.wishlistItemCount = counts.wishlistItemCount;

                    res.redirect('/myAccount');
                }
            } else {
                res.render('userLogin',{
                    message:"incorrect password",
                    cartItemCount: req.session.cartItemCount,
                    wishlistItemCount: req.session.wishlistItemCount,
                    user:req.session.user_id
                });
            }
        } else {
            res.render('userLogin',{
                message:"no user found",
                cartItemCount: req.session.cartItemCount,
                wishlistItemCount: req.session.wishlistItemCount,
                user:req.session.user_id
            });
        }
    } catch (error) {
        console.log(error.message);
    }
}

//load otp verification page

const otpPage = async(req,res)=>{
    try{
        const user = await User.findOne({_id:req.session.user_id})
        res.render('otpSection',{
            tipmessage:'Please verify your eamil',
            user:user,
            cartItemCount: req.session.cartItemCount,
            wishlistItemCount: req.session.wishlistItemCount,
        });
    } catch (error) {
    console.log(error.message);
    }
}

const verifyOtp = async (req, res) => {
    try {
        const user_id = req.session.user_id;  // Using session-stored user ID
        const enteredOtp = req.body.otp;

        const user = await User.findById(user_id);

        // Check if OTP is valid and not expired
        if (!user) {
            return res.render('otpSection', { tipmessage: 'User not found.', user: user });
        }

        // Check if OTP has expired
        if (Date.now() > user.otpExpires) {
            return res.render('otpSection', {
                tipmessage: 'OTP has expired. Please request a new OTP.',
                user: user,
                cartItemCount: req.session.cartItemCount,
                wishlistItemCount: req.session.wishlistItemCount,
            });
        }

        // Validate OTP if not expired
        if (user.OTP === enteredOtp) {
            user.OTP = null; // Clear OTP after successful verification
            user.Is_verified = true; // Set user as verified
            await user.save();

            // Update session variables
            req.session.is_verified = true;

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

            let cart = await Cart.findOne({ UserId: user_id });
            if (!cart) {
                cart = await Cart.create({ UserId: user_id, Products: [] });
            }

            let wishlist = await Wishlist.findOne({ UserId: user_id });
            if (!cart) {
                wishlist = await Wishlist.create({ UserId: user_id, Products: [] });
            }

            // Redirect to the account page after successful verification
            res.redirect('/myaccount');
        } else {
            res.render('otpSection', { 
                tipmessage: 'Invalid OTP', 
                user: user,
                cartItemCount: req.session.cartItemCount,
                wishlistItemCount: req.session.wishlistItemCount,
            });
        }
    } catch (error) {
        console.log(error.message);
        res.render('otpSection', { 
            tipmessage: 'Try again, refresh the page',
            user: req.session.user_id,
            cartItemCount: req.session.cartItemCount,
            wishlistItemCount: req.session.wishlistItemCount, });
    }
};


//resend otp

const resendOtp = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (user) {
            const newOtp = crypto.randomInt(100000, 999999).toString();
            user.OTP = newOtp;
            user.otpExpires = Date.now() + 5 * 60 * 1000; // 5 minutes from now
            await user.save();

            // Send OTP via email
            const mailOptions = {
                from: 'adhnanusman1234@gmail.com',
                to: user.Email,
                subject: 'Your Resent OTP Code',
                text: `Your new OTP code is ${newOtp}`
            };

            await transporter.sendMail(mailOptions);
            res.json({ success: true });
        } else {
            res.json({ success: false });
        }
    } catch (error) {
        console.log(error.message);
        res.json({ success: false });
    }
};


//delete user if user click cancel button 
const deleteUser = async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        req.session.destroy();
        res.sendStatus(200); // Send a status code indicating success
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error'); // Send status code indicating failure
    }
};

//logout the user 

const userLogout = async(req,res)=>{
    try {
        req.session.destroy();
        res.redirect('/');
    } catch (error) {
        console.log(error.massage)
        res.redirect('/home');
    }
}

const listProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        
        // Fetch the product with populated category
        const product = await Product.findById(productId).populate('CategoryId');

        // Fetch valid offers
        const validOffers = await getValidOffers();

        // Calculate the discount price
        let discountPrice = product.Price; // Start with the original price
        let applicableOffers = []; // Array to hold applicable offers

        // Check if there are any offers associated with the product
        if (product.Offers && product.Offers.length > 0) {
            // Filter offers to find those that are applicable to this product
            applicableOffers = validOffers.filter(offer => 
                product.Offers.some(prodOffer => prodOffer.OfferId.toString() === offer._id.toString())
            );

            // If there are applicable offers, calculate the highest discount percentage
            if (applicableOffers.length > 0) {
                const discountPercentages = applicableOffers.map(offer => offer.DiscountPercentage || 0); // Extract percentages
                const maxDiscountPercentage = Math.max(...discountPercentages); // Find the maximum percentage

                discountPrice = product.Price - (product.Price * maxDiscountPercentage / 100); // Calculate discounted price
            }
        }

        // Check if user is logged in
        const isLoggedIn = req.session && req.session.user_id;

        // Fetch user's wishlist if logged in
        let wishlistItems = [];
        if (isLoggedIn) {
            const wishlist = await Wishlist.findOne({ UserId: req.session.user_id }).select('Products.ProductId');
            if (wishlist) {
                wishlistItems = wishlist.Products.map(item => item.ProductId.toString());
            }
        }

        // Prepare the product details to render
        const productDetails = {
            ...product.toObject(), // Convert to plain object
            DiscountPrice: discountPrice, // Add the discount price
            ValidOffers: applicableOffers // Include the valid offers in the product object
        };

        // Render the product overview with the relevant details
        res.render('productOverView', { 
            book: productDetails, // Pass the single product object
            isLoggedIn,
            cartItemCount: req.session.cartItemCount,
            wishlistItemCount: req.session.wishlistItemCount,
            wishlistItems,
            user: req.session.user_id
        });
    } catch (error) {
        console.log(error.message); // Log error message
        res.redirect('/home'); // Redirect to home on error
    }
}

//when clicking the forgot password link modal show and generate token for the perticular email
const forgotPassword = async (req, res) => {
    const { email } = req.body;
  
    try {
      // Check if the email exists in the database
      const user = await User.findOne({ Email:email});
      if (!user) {
        return res.status(200).json({ success: false, message: 'No account with that email exists.' });
      }
      //if user is admin then 
      if (user && user.Is_admin || user.Is_block) {
        return res.status(200).json({ success: false, message: 'restricted account'});
      }
  
      // Generate a secure token using crypto
      const resetToken = crypto.randomBytes(20).toString('hex');
  
      // Set token expiration time (10 minutes from now)
      const resetTokenExpiration = Date.now() + 10 * 60 * 1000; // 10 minutes in milliseconds
  
      // Save token and expiration to the user record
      user.resetPasswordToken = resetToken;
      user.resetPasswordExpires = resetTokenExpiration;
      await user.save();
  
      // Send the reset email
      const mailOptions = {
        from: 'adhnanusman1234@gmail.com',
        to: email,
        subject: 'Password Reset',
        text: `You are receiving this email because you (or someone else) have requested a password reset for your account.\n\n
               Please click on the following link, or paste this into your browser to complete the process:\n\n
               http://${req.headers.host}/reset-password/${resetToken}\n\n
               This link is valid for 10 minutes.\n\n
               If you did not request this, please ignore this email and your password will remain unchanged.\n`
      };
  
      await transporter.sendMail(mailOptions);
  
      return res.json({ success: true, message: 'Reset link has been sent to your email.' });
    } catch (error) {
      console.error('Error in forgot password route:', error);
      res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
    }
};


//afetr selecting the link form your mail the page for resetting the password will show
const resetPasswordLoad = async (req, res) => {
    const { token } = req.params;
  
    try {
      // Find the user by the token and check if the token has expired
      const user = await User.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() } // Ensure the token hasn't expired
      });
  
      if (!user) {
        return res.status(400).json({ success: false, message: 'Token expired.go back and Try again' });
      }
  
      // If token is valid, render a password reset page (You can implement this page)
      res.render('reset-password',{message:'',token});
    } catch (error) {
      console.error('Error in reset password validation route:', error);
      res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
    }
};
  
  // Reset Password (POST) - Handle the password reset
  
const resetPassword = async (req, res) => {
    const { token } = req.params;
    const password = req.body.newPassword;
  
    try {
      // Find the user by token and ensure it's not expired
      const user = await User.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() }
      });
  
      if (!user) {
        return res.render('reset-password',{message:'Token expired.go back and Try again',token});
      }
      
       // Check if new password is the same as the old password
       const isMatch = await bcrypt.compare(password, user.Password);
       if (isMatch) {
           return res.render('reset-password',{message:'New password cannot be the same as the old password.',token});
       }
       const newPassword = await securePassword(password);
      // Update the password and clear the reset token and expiration
        user.Password = newPassword; 
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();
       
        res.redirect('/myAccount');
    } catch (error) {
      console.error('Error in password reset:', error);
      res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
    }
}

const editUser = async(req,res)=>{
    try {
        const { firstName, lastName, mobileNumber } = req.body;
        const id = req.params.id; // Get userId from the query parameters

        // Find the current user
        const currentUser = await User.findById(id);

        if (!currentUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if the mobile number has changed
        if (currentUser.MobileNo !== mobileNumber) {
            // Check if another user already has the same mobile number
            const existingUser = await User.findOne({ MobileNo: mobileNumber });

            // If the mobile number exists, return an error
            if (existingUser) {
                return res.status(400).json({ message: 'Mobile number already exists' });
            }
        }

        // Update the user's first name, last name, and mobile number if valid
        currentUser.FirstName = firstName;
        currentUser.LastName = lastName;
        currentUser.MobileNo = mobileNumber;

        const updatedUser = await currentUser.save();

        // If the user is updated successfully, redirect to my account
        return res.status(200).json({ success: true, redirectUrl: '/myaccount' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error' });
    }
}

const addressLoad = async(req,res)=>{ 
    try {
        
        const userId = req.session.user_id;

        // Find all addresses for the current user
        const addresses = await Address.find({ UserId: userId });

        // Render the addressBook.ejs template with the addresses
        res.render('addressBook', { 
            addresses,
            userId,
            cartItemCount: req.session.cartItemCount,
            wishlistItemCount: req.session.wishlistItemCount,
            user:req.session.user_id
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
};

//add address

const addAddress = async (req, res) => {
    try {
        const { UserId, FullName, MobileNo, Address: addressLine, Landmark, Pincode, FlatNo, AddressType, District, State, Country, City } = req.body;

        if (!UserId || !FullName || !MobileNo || !addressLine || !Pincode || !District || !State || !Country || !City) {
            return res.status(400).json({ message: 'Please fill in all required fields.' });
        }
        // Validate User
        const user = await User.findById(UserId);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Create new address
        const newAddress = new Address({
            UserId,
            FullName,
            MobileNo,
            Address: addressLine,
            Landmark,
            Pincode,
            FlatNo,
            AddressType,
            District,
            State,
            Country,
            City
        });

        // Save the address to the database
        await newAddress.save();

        // Respond with success message
        res.status(201).json({ message: 'Address added successfully.' });
    } catch (error) {
        console.error('Error adding address:', error);
        res.status(500).json({ message: 'Server error. Please try again later.' });
    }
};

//delete address
const deleteAddress = async (req, res) => {
    try {
        const addressId = req.params.id;

        // Find and delete the address
        const result = await Address.findByIdAndDelete(addressId);

        if (!result) {
            return res.status(404).json({ message: 'Address not found.' });
        }

        // Respond with success message
        res.status(200).json({ message: 'Address deleted successfully.' });
    } catch (error) {
        console.error('Error deleting address:', error);
        res.status(500).json({ message: 'Server error. Please try again later.' });
    }
};

const editAddress = async (req, res) => {
    try {
        const { FullName, MobileNo, Address: addressLine, Landmark, Pincode, FlatNo, AddressType, District, State, Country, City } = req.body;
        const AddressId = req.params.id;
        // Validation logic (if not handled client-side or for additional server-side checks)
        if (!FullName || !MobileNo || !addressLine || !Pincode || !District || !State || !Country || !City) {
            return res.status(400).json({ message: 'Please fill in all required fields.' });
        }

        // Check if address exists in the database
        const address = await Address.findById(AddressId);
        if (!address) {
            return res.status(404).json({ message: 'Address not found.' });
        }

        // Update the address fields
        address.FullName = FullName;
        address.MobileNo = MobileNo;
        address.Address = addressLine;
        address.Landmark = Landmark;
        address.Pincode = Pincode;
        address.FlatNo = FlatNo;
        address.AddressType = AddressType;
        address.District = District;
        address.State = State;
        address.Country = Country;
        address.City = City;

        // Save the updated address to the database
        await address.save();

        // Respond with success message
        res.status(200).json({ message: 'Address updated successfully.' });
    } catch (error) {
        console.error('Error updating address:', error);
        res.status(500).json({ message: 'An error occurred while updating the address.' });
    }
};

// Add product to cart
const addToCart = async(req,res)=>{
    try {
        const { productId, quantity } = req.body;
        const userId = req.session.user_id;
        
        // Check if the product exists
        const product = await Product.findById(productId);
        if (!product) {
            return res.json({ success: false, message: 'Product not found' });
        }
    
        // Find or create a cart for the user
        let cart = await Cart.findOne({ UserId: userId });
        if (!cart) {
            cart = new Cart({ UserId: userId, Products: [] });
        }
    
        // Check if the product is already in the cart
        const itemIndex = cart.Products.findIndex(item => item.ProductId.equals(productId));
    
        if (itemIndex > -1) {
            // Existing item in the cart
            let newQuantity = cart.Products[itemIndex].Quantity + parseInt(quantity);
    
            if (newQuantity > 0) {
                return res.json({ success: false, message: 'Product allready in the Cart' });
            }
    
            // Update quantity and price for the existing product in the cart
            cart.Products[itemIndex].Quantity = newQuantity;
            cart.Products[itemIndex].Price = product.Price; // Update price if required
        } else {
            // New product in cart, ensure quantity doesn't exceed 8
            if (quantity > 8) {
                return res.json({ success: false, message: 'You cannot add more than 8 units of this product.' });
            }
    
            // Add new product to cart
            cart.Products.push({ ProductId: productId, Quantity: parseInt(quantity), Price: product.Price });
        }
    
        // Save the cart and respond with success
        await cart.save();

        const cartItemCount = cart ? cart.Products.length : 0;
        req.session.cartItemCount=cartItemCount;

        res.json({ success: true, message: 'Product added to cart successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
}

//edit password load
const editPasswordLoad = async(req,res)=>{
    try {
        const userData = await User.findById(req.session.user_id)
        res.render('editPassword',{
            message:"",
            user:userData,
            cartItemCount: req.session.cartItemCount,
            wishlistItemCount: req.session.wishlistItemCount,  
        });
    } catch (error) {
        console.log(error.message);
    }
}

//edit the users's passsowrd if user is loggen in only
const editPassword = async (req, res) => {
    try {
        const userId = req.session.user_id; // Get user ID from session
        const { oldPassword, newPassword } = req.body;

        // Fetch user from the database using the userId
        const user = await User.findById(userId); // Assuming you're using Mongoose

        // Check if user exists
        if (!user) {
            return res.render('editPassword', { message: "User not found.",user});
        }

        // Compare old password with the stored hashed password
        const isMatch = await bcrypt.compare(oldPassword, user.Password);
        if (!isMatch) {
            // Old password doesn't match
            return res.render('editPassword', { message: "Old password is incorrect.",user});
        }
        
        // if user enter the same password as the older password then show error
        const isSame = await bcrypt.compare(newPassword, user.Password);
        if (isSame) {
            return res.render('editPassword', { message: "New password is same as the Old Password",user});
        }

        // Hash the new password
        const hashedNewPassword = await securePassword(newPassword);

        // Update the user's password in the database
        user.Password = hashedNewPassword;
        user.UpdatedAt = Date.now()
        await user.save();

        res.render('editPassword', { 
            message: "Password updated successfully",
            user,
            cartItemCount: req.session.cartItemCount,
            wishlistItemCount: req.session.wishlistItemCount,
        });
    } catch (error) {
        const user = await User.findById(req.session.user_id);
        console.log(error.message);
        res.render('editPassword', { message: "An error occurred while updating the password.",user});
    }
};

const loadCart = async (req, res) => {
    try {
        // Fetch the user's cart, and only include products and categories that are listed
        const cart = await Cart.findOne({ UserId: req.session.user_id })
            .populate({
                path: 'Products.ProductId',
                match: { Is_list: true }, // Only include listed products
                populate: {
                    path: 'CategoryId',
                    match: { Is_list: true }, // Only include categories that are listed
                },
            })
            .exec();

        // If cart is not found, return empty cart page
        if (!cart) {
            return res.render('cartPage', {
                user: req.session.user_id,
                cartItems: [],
                cartTotal: 0,
                cartItemCount: req.session.cartItemCount,
                wishlistItemCount: req.session.wishlistItemCount,
            });
        }

        // Fetch valid offers
        const validOffers = await getValidOffers();

        // Filter out products that are valid (product and category must both be listed)
        const validCartProducts = cart.Products.filter(product => {
            if (
                product.ProductId && // Ensure the product exists
                product.ProductId.CategoryId // Ensure the product's category exists
            ) {
                return true;
            }
            return false;
        });

        // Calculate the effective price for each product based on the valid offers
        validCartProducts.forEach(product => {
            const applicableOffers = validOffers.filter(offer =>
                product.ProductId.Offers.some(productOffer =>
                    productOffer.OfferId.equals(offer._id)
                )
            );

            // Apply the largest discount if applicable
            if (applicableOffers.length > 0) {
                const maxDiscount = Math.max(...applicableOffers.map(offer => offer.DiscountPercentage));
                product.effectivePrice = product.ProductId.Price - (product.ProductId.Price * (maxDiscount / 100));
            } else {
                product.effectivePrice = product.ProductId.Price; // No discount, original price
            }
        });

        // Calculate cart subtotal based on the effective prices
        const cartSubtotal = validCartProducts.reduce((total, item) => {
            return total + (item.Quantity * item.effectivePrice);
        }, 0);

        // Calculate shipping cost (free if subtotal > 499, otherwise 50)
        const shippingCost = cartSubtotal > 499 ? 0 : 50;

        // Total cart cost including shipping
        const cartTotal = cartSubtotal + shippingCost;

        // Render the cart page with necessary data
        res.render('cartPage', {
            user: req.session.user_id,
            cartItems: validCartProducts,
            cartTotal: cartTotal,
            cartSubtotal,
            cartItemCount: req.session.cartItemCount,
            wishlistItemCount: req.session.wishlistItemCount,
        });

    } catch (error) {
        console.error(error.message);
        res.status(500).send('Internal Server Error');
    }
};

//update cart form cart page
const updateCart = async (req, res) => {
    try {
        const { productId, quantity } = req.body;
        const userId = req.session.user_id;

        // Find the user's cart
        const cart = await Cart.findOne({ UserId: userId }).populate('Products.ProductId');

        if (cart) {
            // Remove any invalid products with null ProductId references
            cart.Products = cart.Products.filter(p => p.ProductId);

            // Find the product in the cart
            const product = cart.Products.find(p => p.ProductId && p.ProductId._id.toString() === productId);

            if (product) {
                product.Quantity = parseInt(quantity); // Update the quantity

                await cart.save(); // Save the updated cart
                
                // Update cart in session
                const updatedCart = await Cart.findOne({ UserId: userId });
                const cartItemCount = updatedCart ? updatedCart.Products.length : 0;
                req.session.cartItemCount = cartItemCount;

                res.json({
                    success: true,
                });
            } else {
                res.json({ success: false, message: "Product not found in cart" });
            }
        } else {
            res.json({ success: false, message: "Cart not found" });
        }
    } catch (error) {
        console.error("Error updating cart:", error.message);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

//remove ptoduct from cart
const removeFromCart = async (req, res) => {
    try {
        const productId = req.params.productId;
        const userId = req.session.user_id; // Assuming you have user authentication

        // Remove the item from the cart
        await Cart.updateOne(
            { UserId: userId },
            { $pull: { Products: { ProductId: productId } } }
        );

        // Fetch the updated cart to calculate the new total
        const cart = await Cart.findOne({ UserId: userId });

        const cartItemCount = cart ? cart.Products.length : 0;
        req.session.cartItemCount = cartItemCount;

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false });
    }
};

const searchResult = async (req, res) => {
    const query = req.query.query;
    try {
        const products = await Product.find({
            $or: [
                { Name: { $regex: new RegExp(query, 'i') } }, // Case-insensitive search for product name
                { Author: { $regex: new RegExp(query, 'i') } } // Case-insensitive search for author name
            ],
            Is_list: true // Only include listed products
        })
        .populate({
            path: 'CategoryId',
            match: { Is_list: true }, // Ensure category is also listed
            select: 'CategoryName' // Optional: you can select the category fields you need
        })
        .limit(5);  // Limit the results to 5 products

        // Filter out products whose category is not listed (in case they don't match the `match` condition)
        const filteredProducts = products.filter(product => product.CategoryId !== null);

        res.json(filteredProducts);  // Send the filtered results as JSON
    } catch (error) {
        console.error('Error fetching search results:', error);
        res.status(500).send('Server error');
    }
};

module.exports = {
    loadHome,
    loadShop,
    loadAccountOverview,
    loadRegister,
    insertUser,
    loginLoad,
    varifyLogin,
    otpPage,
    verifyOtp,
    resendOtp,
    deleteUser,
    userLogout,
    listProduct,
    forgotPassword,
    resetPasswordLoad,
    resetPassword,
    editUser,
    addressLoad,
    addAddress,
    deleteAddress,
    editAddress,
    addToCart,
    editPasswordLoad,
    editPassword,
    loadCart,
    updateCart,
    removeFromCart,
    searchResult,
}