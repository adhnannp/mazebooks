const User = require('../models/userModel');
const bcrypt = require('bcrypt');
require('dotenv').config();
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const Product = require("../models/productModel");
const Category = require("../models/categoryModel");
const Address = require("../models/addressModel");
const Cart = require("../models/cartModel");

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
            CategoryId: { $in: listedCategoryIds },Is_list:true // Categories that are listed
        });

        // Fetch products with pagination and populate category
        const products = await Product.find({
            CategoryId: { $in: listedCategoryIds },Is_list:true // Categories that are listed
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
        if(req.session.is_admin){
            return res.redirect('/admin');
        }
        if (req.session.user_id && req.session.is_block){
            req.session.destroy();
            return res.render('myAccount',{user:""});
        }
        if (req.session.user_id && req.session.is_verified && !req.session.is_block) {
            const user = await User.findOne({_id:req.session.user_id})
            return res.render('myAccount',{user:user});
        }else if (req.session.user_id && !req.session.is_verified && !req.session.is_block){
            return res.redirect('/verify-otp');
        }else {
            return res.render('myAccount',{user:""});
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

const listProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const book = await Product.findById(productId).populate('CategoryId'); // Populate the Category details
        const isLoggedIn = req.session && req.session.user_id; // Check if user is logged in

        res.render('productOverView', { book, isLoggedIn });
    } catch (error) {
        console.log(error.message); // Corrected from 'error.massage' to 'error.message'
        res.redirect('/home');
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
        res.render('addressBook', { addresses,userId});
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
    
            if (newQuantity > 8) {
                return res.json({ success: false, message: 'You cannot add more than 8 units of this product.' });
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
        res.render('editPassword',{message:"",user:userData});
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

        res.render('editPassword', { message: "Password updated successfully",user});
    } catch (error) {
        const user = await User.findById(req.session.user_id);
        console.log(error.message);
        res.render('editPassword', { message: "An error occurred while updating the password.",user});
    }
};

const loadCart = async (req, res) => {
    try {
        // Find the user and cart for the logged-in user
        const user = await User.findById(req.session.user_id);
        const cart = await Cart.findOne({ UserId: req.session.user_id }).populate('Products.ProductId');

        // Check if the cart exists and has products
        if (!cart || !cart.Products || cart.Products.length === 0) {
            return res.render('cartPage', { cartItems: [], cartTotal: 0, shippingCost: 0, totalPrice: 0, isEligibleForCOD: false, user });
        }

        // Filter products to include only listed items
        const filteredProducts = cart.Products.filter(product => product.ProductId && product.ProductId.Is_list);
        
        // Handle empty filtered products
        if (filteredProducts.length === 0) {
            return res.render('cartPage', { cartItems: [], cartTotal: 0, shippingCost: 0, totalPrice: 0, isEligibleForCOD: false, user });
        }

        // Calculate the cart total
        let cartTotal = 0;
        filteredProducts.forEach(item => {
            cartTotal += item.Price * item.Quantity;
        });

        const isEligibleForCOD = cartTotal > 499;
        const shippingCost = isEligibleForCOD ? 0 : 50;
        const totalPrice = cartTotal + shippingCost;

        // Render the cart page with the calculated values
        res.render('cartPage', {
            cartItems: filteredProducts,
            cartTotal,
            shippingCost,
            totalPrice,
            isEligibleForCOD,
            user
        });
    } catch (error) {
        console.log(error.message);
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
            // Find the product in the cart and update the quantity
            const product = cart.Products.find(p => p.ProductId._id.toString() === productId);

            if (product) {
                product.Quantity = parseInt(quantity); // Update the quantity

                // Calculate the updated total price for this product
                const updatedProductPrice = product.Quantity*product.ProductId.Price;

                await cart.save(); // Save the updated cart

                // Recalculate the subtotal of the cart
                let newSubtotal = 0;
                cart.Products.forEach(p => {
                    newSubtotal += p.Quantity*p.ProductId.Price;
                });

                // Check for eligibility for Cash on Delivery
                const isEligibleForCOD = newSubtotal > 499;
                const newTotal = isEligibleForCOD ? newSubtotal : newSubtotal+50;

                res.json({
                    success: true,
                    updatedProductPrice, 
                    newSubtotal,         
                    newTotal,            
                    isEligibleForCOD, 
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

        // Calculate the new cart total
        const cart = await Cart.findOne({ UserId: userId });
        const newCartTotal = cart.Products.reduce((total, item) => total + (item.Price * item.Quantity
        ), 0);

        res.json({ success: true, newCartTotal });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false });
    }
};

const loadCheckout = async (req, res) => {
    try {
        // Fetch address and cart information from the database
        const address = await Address.findOne({ UserId: req.session.user_id }).exec();
        const cart = await Cart.findOne({ UserId: req.session.user_id }).populate('Products.ProductId').exec();

        // Get selected product IDs from the form submission
        const selectedItems = req.body.selectedItems.split(',').map(id => id.trim()).filter(Boolean);

        // Filter cart products based on selected product IDs
        const selectedProducts = cart.Products.filter(product => selectedItems.includes(product.ProductId._id.toString()));

        // Calculate subtotal and total for selected products
        const cartSubtotal = selectedProducts.reduce((total, item) => total + (item.Price * item.Quantity), 0);
        const shippingCost = cartSubtotal > 499 ? 0 : 50; // Adjust shipping cost based on total
        const cartTotal = cartSubtotal + shippingCost;

        // Fetch user details for the selected address (if needed)
        const userAddress = address ? {
            fullName: address.FullName,
            address: address.Address,
            city: address.City,
            state: address.State,
            pincode: address.Pincode,
            mobileNo: address.MobileNo
        } : null;

        // Render the checkout page with all necessary data
        res.render('checkoutPage', {
            address: userAddress,
            cartItems: selectedProducts,
            cartSubtotal,  // Pass subtotal (products only)
            cartTotal // Pass total (with shipping)
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
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
    loadCheckout,
}