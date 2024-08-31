const express = require('express');
const admin_route = express();
const session = require('express-session');
const config = require("../config/config");
const bodyParser = require("body-parser");
const multer = require('multer');
const path = require('path');
const auth = require("../middleware/adminAuth");

// session setup
admin_route.use(session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false
}));

admin_route.use(bodyParser.json());
admin_route.use(bodyParser.urlencoded({ extended: true }));

admin_route.set('view engine', 'ejs');
admin_route.set('views', './views/admin');
admin_route.use(express.static('public'));

// multer setup
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../public/userImages'));
    },
    filename: function (req, file, cb) {
        const name = Date.now() + '-' + file.originalname;
        cb(null, name);
    }
});

const upload = multer({ storage: storage });

// controller
const adminController = require('../controllers/adminController');

// routes
admin_route.get('/', auth.isUserLogin, auth.isLogout, adminController.loadLogin);

admin_route.post('/', adminController.varifyLogin);

admin_route.get('/home', auth.isLogin, adminController.loadDAshboard);

admin_route.get('/logout', auth.isLogin, adminController.logout);

admin_route.get('/dashboard', auth.isLogin, adminController.adminDashboard);

admin_route.get('/add-user', auth.isLogin, adminController.addUserLoad);

admin_route.post('/add-user', upload.single('image'), adminController.addNewUser);

admin_route.get('/edit-user', auth.isLogin, adminController.editUserLoad);

admin_route.post('/edit-user', adminController.updateUser);

admin_route.get('/delete-user',adminController.deleteUser);

admin_route.get('*', function (req, res) {
    res.redirect('/admin');
});

module.exports = admin_route;
