const express = require('express');
const user_route = express();
const bodyParser = require('body-parser');
const path = require('path');
const auth = require('../middleware/auth');
const passport = require('passport');
const upload = require('../config/multerConfig');
require('../config/passportConfig');

user_route.set('view engine', 'ejs');
user_route.set('views', path.join(__dirname, '../views/users')); 



user_route.use(bodyParser.json());
user_route.use(bodyParser.urlencoded({ extended: true }));

// Initialize Passport and session
user_route.use(passport.initialize());
user_route.use(passport.session());


const userController = require('../controllers/userController');
const wishListController = require('../controllers/userWishList');
const orderPlacingController = require('../controllers/orderPlacingController');
const returnOrder = require('../controllers/returnOrderController');
const walletController = require('../controllers/walletController');
const couponController = require('../controllers/couponController');

user_route.get(['/','/home'], auth.isAdminLogin ,auth.isblock,auth.ifNotVerified,auth.updateCartAndWishlistCounts,userController.loadHome);

user_route.get('/shop', auth.isAdminLogin ,auth.isblock,auth.ifNotVerified,auth.updateCartAndWishlistCounts,userController.loadShop);

user_route.get('/myaccount',auth.isblock,auth.ifNotVerified,auth.updateCartAndWishlistCounts,userController.loadAccountOverview);

user_route.get('/login', auth.isAdminLogin, auth.isblock, auth.isLogout, userController.loginLoad);

user_route.post('/login',auth.isLogout,userController.varifyLogin);

user_route.get('/register',auth.isAdminLogin, auth.isblock ,auth.isLogout, userController.loadRegister);

user_route.post('/register',auth.isLogout,userController.insertUser);

user_route.get('/verify-otp', auth.isAdminLogin, auth.isblock ,auth.isVerified ,auth.updateCartAndWishlistCounts,userController.otpPage);

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

user_route.get('/home/product/:id', auth.isAdminLogin,auth.isblock,auth.updateCartAndWishlistCounts, userController.listProduct);

user_route.post('/myaccount/edit-user/:id',auth.isLogin,userController.editUser);

user_route.get('/myaccount/address-book',auth.isAdminLogin,auth.isblock,auth.isLogin,auth.ifNotVerified,auth.updateCartAndWishlistCounts,userController.addressLoad);

user_route.post('/myaccount/add-address',auth.isLogin,userController.addAddress);

user_route.delete('/myaccount/delete-address/:id',auth.isLogin,userController.deleteAddress);

user_route.post('/myaccount/edit-address/:id',auth.isLogin,userController.editAddress);

user_route.get("/myaccount/set-default-address/:addressId",auth.isAdminLogin,auth.isblock,auth.isLogin,auth.ifNotVerified,userController.setDefaultAddress);

user_route.post('/cart/add',auth.isLogin,auth.ifNotVerified,userController.addToCart);

user_route.get('/myaccount/edit-password',auth.isAdminLogin,auth.isLogin,auth.isblock,auth.ifNotVerified,auth.updateCartAndWishlistCounts,userController.editPasswordLoad);

user_route.post('/myaccount/edit-password',auth.isLogin,userController.editPassword);

user_route.get('/cart',auth.isAdminLogin,auth.isblock,auth.ifNotVerified,auth.updateCartAndWishlistCounts,userController.loadCart);

user_route.post('/cart/update-cart',auth.isAdminLogin,userController.updateCart);

user_route.delete('/cart/remove/:productId',auth.isAdminLogin,userController.removeFromCart);

user_route.post('/product/checkout',auth.isAdminLogin,auth.isLogin,auth.isblock,auth.ifNotVerified,orderPlacingController.loadCheckout)

user_route.post('/verify-payment',auth.isAdminLogin,auth.ifNotVerified,orderPlacingController.verifyPayment)

user_route.post('/place-order',auth.isAdminLogin,auth.ifNotVerified,orderPlacingController.placeOrder)

user_route.get('/order-success',auth.isAdminLogin,auth.isLogin,auth.isblock,auth.isLogin,auth.haveOrderId,orderPlacingController.successPage)

user_route.get('/myaccount/order-history',auth.isAdminLogin,auth.isLogin,auth.isblock,auth.ifNotVerified,auth.updateCartAndWishlistCounts,orderPlacingController.loadOrderHistory)

user_route.get('/myaccount/cancelled-orders',auth.isAdminLogin,auth.isLogin,auth.isblock,auth.ifNotVerified,auth.updateCartAndWishlistCounts,orderPlacingController.loadCancelledOrders)

user_route.get('/myaccount/delivered-orders',auth.isAdminLogin,auth.isLogin,auth.isblock,auth.ifNotVerified,auth.updateCartAndWishlistCounts,orderPlacingController.loadDeliveredOrders)

user_route.get('/myaccount/returned-orders',auth.isAdminLogin,auth.isLogin,auth.isblock,auth.ifNotVerified,auth.updateCartAndWishlistCounts,orderPlacingController.loadReturnedOrders)

user_route.post('/myaccount/cancel-order/:orderId',auth.isAdminLogin,orderPlacingController.cancelOrder);

user_route.post('/wishlist/toggle',auth.isLogin,auth.ifNotVerified,wishListController.toggleWishlist);

user_route.get('/wishlist',auth.isAdminLogin,auth.isblock,auth.ifNotVerified,auth.updateCartAndWishlistCounts,wishListController.loadWishlist);

user_route.delete('/wishlist/remove/:id',auth.isLogin,wishListController.removeFromWishlist);

user_route.post('/myaccount/return-order/:orderId',auth.isAdminLogin, auth.isLogin,auth.ifNotVerified, returnOrder.returnRequest)

user_route.get('/myaccount/wallet',auth.isAdminLogin,auth.isLogin,auth.isblock,auth.ifNotVerified,auth.updateCartAndWishlistCounts,walletController.loadWallet)

user_route.get('/search',userController.searchResult) 

user_route.post('/checkout/apply-coupon',auth.isAdminLogin, auth.isLogin,auth.ifNotVerified,couponController.applyCoupon)

user_route.post('/checkout/remove-coupon',auth.isAdminLogin, auth.isLogin,auth.ifNotVerified,couponController.removeCoupon)

user_route.post('/myaccount/retry-payment/:orderId',auth.isAdminLogin,auth.ifNotVerified,orderPlacingController.retryPayment)

user_route.get('/myaccount/download-invoice/:orderId', auth.isAdminLogin,auth.isLogin,auth.isblock,auth.ifNotVerified,orderPlacingController.downloadInvoice);

user_route.get('/about',auth.isAdminLogin,auth.isblock,auth.ifNotVerified,auth.updateCartAndWishlistCounts,userController.aboutLoad);

user_route.get('/contact',auth.isAdminLogin,auth.isblock,auth.ifNotVerified,auth.updateCartAndWishlistCounts,userController.contactLoad);

user_route.post('/myaccount/uploadProfileImage',auth.isAdminLogin,auth.ifNotVerified, upload.single('profileImage'), userController.uploadProfileImage);

module.exports = user_route;
