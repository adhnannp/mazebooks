const express = require('express');
const user_route = express();
const bodyParser = require('body-parser');
const path = require('path');
const auth = require('../middleware/auth');
const passport = require('passport');
require('../config/passportConfig');

user_route.set('view engine', 'ejs');
user_route.set('views', path.join(__dirname, '../views/users')); 



user_route.use(bodyParser.json());
user_route.use(bodyParser.urlencoded({ extended: true }));

// Initialize Passport and session
user_route.use(passport.initialize());
user_route.use(passport.session());


const userController = require('../controllers/userController');

user_route.get(['/','/home'], auth.isAdminLogin ,auth.isblock,userController.loadHome);

user_route.get('/shop', auth.isAdminLogin ,auth.isblock,userController.loadShop);

user_route.get('/myaccount',auth.isblock,userController.loadAccountOverview);

user_route.get('/login', auth.isAdminLogin, auth.isblock, auth.isLogout, userController.loginLoad);

user_route.post('/login',auth.isLogout,userController.varifyLogin);

user_route.get('/register',auth.isAdminLogin, auth.isblock ,auth.isLogout, userController.loadRegister);

user_route.post('/register',auth.isLogout,userController.insertUser);

user_route.get('/verify-otp', auth.isAdminLogin, auth.isblock ,auth.isVerified ,userController.otpPage);

user_route.post('/verify-otp',userController.verifyOtp);

user_route.delete('/deleteUser/:id', userController.deleteUser);

user_route.post('/resendOtp/:id', userController.resendOtp);

user_route.get('/auth/google',auth.isAnyOne,auth.isblock, (req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();},
    passport.authenticate('google', { scope: ['profile', 'email'] }));

user_route.get('/auth/google/callback', auth.isAnyOne,auth.isblock,
    passport.authenticate('google', { failureRedirect: '/' }),
    function(req, res) {
        // Successful authentication
        req.session.user_id = req.user._id;
        req.session.is_verified = req.user.Is_verified;
        req.session.is_admin = req.user.Is_admin;

        // Create a simple HTML page that communicates with the main window
        res.send(`
            <script>
                // Notify the main window about successful login
                if (window.opener) {
                    // If admin, redirect to admin dashboard
                    if (${req.session.is_admin}) {
                        window.opener.location.href = '/admin/home';
                    } else {
                        // Otherwise, redirect to user account
                        window.opener.location.href = '/myaccount';
                    }
                    
                    // Close the current pop-up window
                    window.close();
                } else {
                    // If there's no main window, just redirect
                    window.location.href = '${req.session.is_admin ? '/admin/home' : '/myaccount'}';
                }
            </script>
        `);
    }
);
user_route.post('/logout', auth.isLogin, userController.userLogout);

user_route.post('/forgot-password',userController.forgotPassword);

user_route.get('/reset-password/:token',auth.isAdminLogin,auth.isblock, auth.isLogout,userController.resetPasswordLoad)

user_route.post('/reset-password/:token',userController.resetPassword)

user_route.get('/home/product/:id', auth.isAdminLogin,auth.isblock, userController.listProduct);

user_route.post('/myaccount/edit-user/:id',auth.isLogin,userController.editUser);

user_route.get('/myaccount/address-book',auth.isAdminLogin,auth.isblock,auth.isLogin,userController.addressLoad);

user_route.post('/myaccount/add-address',auth.isLogin,userController.addAddress);

user_route.delete('/myaccount/delete-address/:id',auth.isLogin,userController.deleteAddress);

user_route.post('/myaccount/edit-address/:id',auth.isLogin,userController.editAddress);

user_route.post('/cart/add',auth.isLogin,userController.addToCart);

user_route.get('/myaccount/edit-password',auth.isAdminLogin,auth.isblock,auth.isLogin,userController.editPasswordLoad);

user_route.post('/myaccount/edit-password',auth.isLogin,userController.editPassword);

user_route.get('/cart',auth.isAdminLogin,auth.isblock,userController.loadCart);

user_route.post('/cart/update-cart',auth.isAdminLogin,userController.updateCart);

user_route.delete('/cart/remove/:productId',auth.isAdminLogin,userController.removeFromCart);

user_route.post('/product/checkout',auth.isAdminLogin,auth.noOrderId,userController.loadCheckout)

user_route.post('/place-order',auth.isAdminLogin,userController.placeOrder)

user_route.get('/order-success',auth.isAdminLogin,auth.isblock,auth.isLogin,auth.haveOrderId,userController.successPage)

user_route.get('/myaccount/order-history',auth.isAdminLogin,auth.isblock,auth.isLogin,userController.loadOrderHistory)

user_route.post('/myaccount/cancel-order/:orderId', userController.cancelOrder);

module.exports = user_route;
