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

user_route.get(['/','/home'], auth.isAdminLogin ,userController.loadHome);

user_route.get('/myaccount',auth.isblock,userController.loadAccountOverview);

user_route.get('/login', auth.isAdminLogin, auth.isLogout, userController.loginLoad);

user_route.post('/login',userController.varifyLogin);

user_route.get('/register',auth.isAdminLogin, auth.isLogout, userController.loadRegister);

user_route.post('/register',userController.insertUser);

user_route.get('/verify-otp', auth.isAdminLogin,auth.isVerified ,userController.otpPage);

user_route.post('/verify-otp', userController.verifyOtp);

user_route.delete('/deleteUser/:id', userController.deleteUser);

user_route.post('/resendOtp/:id', userController.resendOtp);

user_route.get('/auth/google',auth.isAnyOne, (req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();},
    passport.authenticate('google', { scope: ['profile', 'email'] }));

user_route.get('/auth/google/callback',auth.isAnyOne,
    passport.authenticate('google', { failureRedirect: '/' }),
    function(req, res) {
        // Successful authentication
        req.session.user_id = req.user._id;
        req.session.is_verified = req.user.Is_verified;
        req.session.is_admin = req.user.Is_admin;
        // redirect home.
        if(req.session.is_admin){
            return res.redirect('/admin/home');
        }
        res.redirect('/myaccount');
    });

user_route.post('/logout', auth.isLogin, userController.userLogout);

user_route.get('/home/product/:id', auth.isAdminLogin, userController.listProduct);


module.exports = user_route;
