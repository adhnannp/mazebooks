const User = require('../models/userModel');
const bcrypt = require('bcrypt');
require('dotenv').config();
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const Product = require("../models/productModel");
const Category = require("../models/categoryModel");


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
const loadHome = async(req,res)=>{
    try {
        // Fetch categories that are listed
        const listedCategories = await Category.find({ Is_list: true }).select('_id'); // Only selecting the _id field

        // Extract the category IDs into an array
        const listedCategoryIds = listedCategories.map(category => category._id);

        // Calculate total products and pages
        const totalProducts = await Product.countDocuments({
            CategoryId: { $in: listedCategoryIds } // Categories that are listed
        });

        // Fetch products with pagination and populate category
        const products = await Product.find({
            CategoryId: { $in: listedCategoryIds } // Categories that are listed
        })
            .populate('CategoryId')
            .limit(12);

        // Render the products or send them as a response
        res.render("home", {
            products,
        });
    } catch (error) {
        console.log(error.message);
    }
} 

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
            CategoryId: { $in: listedCategoryIds }, // Categories that are listed
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
        switch (selectedSort) {
            case 'low-to-high':
                sortOption = { Price: 1 };
                break;
            case 'high-to-low':
                sortOption = { Price: -1 };
                break;
            case 'a-to-z':
                sortOption = { Name: 1 };
                break;
            case 'z-to-a':
                sortOption = { Name: -1 };
                break;
            case 'featured':
            default:
                // No sorting, default case
                sortOption = {}; 
        }

        // Calculate total products and pages
        const totalProducts = await Product.countDocuments(productFilter);
        const totalPages = Math.ceil(totalProducts / itemsPerPage);

        // Fetch products with pagination, sorting, and populate category
        const products = await Product.find(productFilter)
            .populate('CategoryId')
            .sort(sortOption) // Apply sorting
            .skip((currentPage - 1) * itemsPerPage)
            .limit(itemsPerPage);

        // Render the products or send them as a response
        res.render("shopPage", {
            products,
            genres,
            selectedGenre, // Pass selected genre to the view
            selectedSort,  // Pass selected sort to the view
            currentPage,
            totalPages,
        });
    } catch (error) {
        console.log(error.message);
    }
};

//load accountOverview
const loadAccountOverview = async(req,res)=>{
    try {
        if (req.session.user_id && req.session.is_block){
            req.session.destroy();
            res.render('myAccount',{user:""});
        }
        if (req.session.user_id && req.session.is_verified && !req.session.is_block) {
            const user = await User.findOne({_id:req.session.user_id})
            res.render('myAccount',{user:user});
        }else if (req.session.user_id && !req.session.is_verified && !req.session.is_block){
            res.redirect('/verify-otp');
        }else {
            res.render('myAccount',{user:""});
        }
    } catch (error) {
        console.log(error.message);
    }
} 

//render registration view
const loadRegister = async(req,res)=>{
    try {
        res.render('userRegister',{message:''});
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
            return res.render('userRegister', { message: 'User with this credential already exists'});
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
        res.render('userRegister', {message: 'An error occurred during registration'});
    }
};


//login user methode started

const loginLoad = async(req ,res)=>{
    try {
        res.render('userLogin',{message:""});
    } catch (error) {
        console.log(error.message);
    }
}

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
                    res.render('userLogin',{message:"Enternig restricted"});
                }else if(!userData.Is_verified){
                    // Generate a new OTP
                    const newOtp = crypto.randomInt(100000, 999999).toString(); // Generate a 6-digit OTP 
                    //Update the user's OTP in the database
                    userData.OTP = newOtp;
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

                    res.redirect('/verify-otp')

                }else {
                    req.session.user_id = userData._id;
                    req.session.is_admin = userData.Is_admin;
                    req.session.is_verified = userData.Is_verified;
                    req.session.is_block = userData.Is_block;

                    res.redirect('/myAccount');
                }
            } else {
                res.render('userLogin',{message:"incorrect password"});
            }
        } else {
            res.render('userLogin',{message:"no user found"});
        }
    } catch (error) {
        console.log(error.message);
    }
}

//load otp verification page

const otpPage = async(req,res)=>{
    try{
        const user = await User.findOne({_id:req.session.user_id})
        res.render('otpSection',{tipmessage:'Please verify your eamil',user:user});
    } catch (error) {
    console.log(error.message);
    }
}

const verifyOtp = async (req, res) => {
    try {
        const user_id = req.session.user_id;  // Using session-stored user ID
        const enteredOtp = req.body.otp;

        const user = await User.findById(user_id);

        if (user && user.OTP === enteredOtp) {
            user.OTP = null; // Clear OTP after successful verification

            // Set user is_verified and save
            user.Is_verified = true;
            await user.save();

            // Update session variables
            req.session.is_verified = true;

            // Redirect to the account page after successful verification
            res.redirect('/myaccount');
        } else {
            res.render('otpSection', {tipmessage: 'Invalid OTP', user: user });
        }
    } catch (error) {
        console.log(error.message);
        res.render('otpSection', {tipmessage: 'try again, refresh the page', user: req.session.user_id});
    }
};


//resend otp

const resendOtp = async(req,res)=>{
    try {
        const user = await User.findById(req.params.id);
        if (user) {
            const newOtp = crypto.randomInt(100000, 999999).toString();
            user.OTP = newOtp;
            await user.save();

            // Send OTP via email
            const mailOptions = {
                from: 'adhnanusman1234@gmail.com',
                to: user.Email,
                subject: 'Your Resent OTP Code',
                text: `Your new OTP code is ${newOtp}`
            };
            res.json({success: true})
            await transporter.sendMail(mailOptions);
        } else {
            res.json({success: false})
        }
    } catch (error) {
        console.log(error.message);
        res.json({ success: false });
    }
}


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

const listProduct = async(req,res)=>{
    try {
        const productId = req.params.id;
        const book = await Product.findById(productId).populate('CategoryId'); // Populate the Category details

        res.render('productOverView', {book});
    } catch (error) {
        console.log(error.massage)
        res.redirect('/home');
    }
}

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
}