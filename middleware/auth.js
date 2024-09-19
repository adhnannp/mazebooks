const User = require('../models/userModel');

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

module.exports = {
    isLogin,
    isLogout,
    isAdminLogin,
    isVerified,
    isblock,
    isAnyOne,
};