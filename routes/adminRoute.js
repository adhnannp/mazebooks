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
const returnOrder = require('../controllers/returnOrderController');
const couponController = require('../controllers/couponController');
const offerController = require('../controllers/offerController');

// routes
admin_route.get('/', auth.isUserLogin, auth.isLogout, adminController.loadLogin);

admin_route.post('/', adminController.varifyLogin);

admin_route.get('/home', auth.isLogin, adminController.loadAdminHome);

admin_route.get('/users', auth.isLogin, adminController.adminUsers);

admin_route.post('/users/unblock/:id', adminController.unblockUser);

admin_route.post('/users/block/:id', adminController.blockUser);

admin_route.get('/products', auth.isLogin, adminController.productsLoad);

admin_route.get('/products/add',auth.isLogin, adminController.addProductLoadPage);

admin_route.post('/products/add', upload.fields([{ name: 'img1' }, { name: 'img2' }, { name: 'img3' }, { name: 'croppedImage0' }, { name: 'croppedImage1' }, { name: 'croppedImage2' }]), adminController.addProduct);

admin_route.get('/products/edit/:id',auth.isLogin, adminController.editProductLoadPage);

admin_route.post('/products/edit/:id',upload.single('croppedImage'), adminController.editProduct);

admin_route.post('/products/unlistproduct/:id',adminController.unlistProduct)

admin_route.post('/products/listproduct/:id',adminController.listProduct)

admin_route.get('/categories', auth.isLogin, adminController.categoriesLoad);

admin_route.post('/categories/unlist/:id',adminController.unlistCategory)

admin_route.post('/categories/list/:id',adminController.listCategory)

admin_route.post('/categories/edit/:id',adminController.editCategory)

admin_route.post('/categories/addcategories',adminController.addCategory)

admin_route.post('/logout', auth.isLogin, adminController.logout);

admin_route.get('/orders', auth.isLogin, adminController.ordersLoad);

admin_route.post('/orders/cancel-order/:orderId', adminController.cancelOrder);

admin_route.post('/orders/change-status/:orderId', adminController.statusChangeOrder);

admin_route.post('/orders/handle-return-request/:orderId', returnOrder.handleReturnRequest);

admin_route.get('/coupons', auth.isLogin, couponController.couponLoad);

admin_route.post('/coupons/add-coupons', couponController.addCoupon);

admin_route.post('/coupons/deactivate/:id',couponController.deactivateCoupon)

admin_route.post('/coupons/activate/:id',couponController.activateCoupon)

admin_route.post('/coupons/edit/:id',couponController.editCoupon)

admin_route.get('/offers', auth.isLogin, offerController.offerLoad);

admin_route.get('/offers/add',auth.isLogin,offerController.offerAddLoad)

admin_route.post('/offers/add',auth.isLogin,offerController.addOffer)

admin_route.get('*', function (req, res) {
    res.render('error-404');
});

module.exports = admin_route;
