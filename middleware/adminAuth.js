const isLogin = async (req, res, next) => {
    try {
        if (req.session.user_id && req.session.is_admin) {
            return next();
        } else {
            return res.redirect('/admin');
        }
    } catch (error) {
        console.log(error.message);
        return res.status(500).send('Internal Server Error');
    }
};

const isLogout = async (req, res, next) => {
    try {
        if (req.session.user_id && req.session.is_admin) {
            res.redirect('/admin/home');
        } else {
            next();
        }
    } catch (error) {
        console.log(error.message);
        return res.status(500).send('Internal Server Error');
    }
};

// New middleware to prevent access to admin login if user is logged in
const isUserLogin = async (req, res, next) => {
    try {
        if (req.session.user_id && !req.session.is_admin) {
            res.redirect('/home');
        } else {
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
    isUserLogin,
};
