const express = require('express');
const admin_route = express();
const bodyParser = require("body-parser");
const upload = require('../config/multerConfig');
const path = require('path');
const auth = require("../middleware/adminAuth");

admin_route.use(bodyParser.json());
admin_route.use(bodyParser.urlencoded({ extended: true }));

admin_route.set('view engine', 'ejs');
admin_route.set('views', path.join(__dirname, '../views/admin')); 

// controller
const adminController = require('../controllers/adminController');

// routes
admin_route.get('/', auth.isUserLogin, auth.isLogout, adminController.loadLogin);

admin_route.post('/', adminController.varifyLogin);

admin_route.get('/home', auth.isLogin, adminController.loadAdminHome);

admin_route.get('/users', auth.isLogin, adminController.adminUsers);

admin_route.post('/users/unblock/:id', adminController.unblockUser);

admin_route.post('/users/block/:id', adminController.blockUser);

admin_route.get('/products', auth.isLogin, adminController.productsLoad);

admin_route.post('/products/add', upload.array('img', 3), adminController.addProduct);

admin_route.post('/products/unlistproduct/:id',adminController.unlistProduct)

admin_route.post('/products/listproduct/:id',adminController.listProduct)

admin_route.get('/categories', auth.isLogin, adminController.categoriesLoad);

admin_route.post('/categories/unlist/:id',adminController.unlistCategory)

admin_route.post('/categories/list/:id',adminController.listCategory)

admin_route.post('/categories/edit/:id',adminController.editCategory)

admin_route.post('/categories/addcategories',adminController.addCategory)

admin_route.post('/logout', auth.isLogin, adminController.logout);

admin_route.get('*', function (req, res) {
    res.redirect('/admin');
});

module.exports = admin_route;
