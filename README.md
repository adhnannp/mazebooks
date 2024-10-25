MAZE BOOKS 📚

A full-stack e-commerce platform for books built with Node.js, Express, EJS, and MongoDB

🌟 Features

User Authentication & Authorization
Book Catalog Management
Shopping Cart Functionality
Order Processing
online payment
Admin Dashboard
Responsive Design
Payment Integration
User refferal
offer,coupon
sales report
invoice


🔧 Tech Stack

Backend: Node.js, Express.js
Frontend: EJS, JavaScript, HTML5, CSS3
Database: MongoDB
Authentication: Passport.js
Payment: Rzorpay
Other Tools: Mongoose, Multer (file uploads), pdfkit, xlxs

📋 Prerequisites

Node.js (v14 or higher)
MongoDB
Git

🚀 Installation & Setup

Clone the repository

bashCopygit clone https://github.com/adhnannp/mazebooks.git
cd mazebooks

Install dependencies

bashCopynpm install

Environment Variables
Create a .env file in the root directory:

envCopyPORT=3000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
STRIPE_SECRET_KEY=your_stripe_secret_key

Start the application

bashCopy# Development mode
npm run dev

# Production mode
npm start
📁 Project Structure
Copymaze-books/
├── config/
│   ├── config.js
│   └── passport.js
|   |__multer.config
|
├── controllers/
│   ├── userController.js
│   ├── adminController.js
│   ├── cartController.js
│   └── orderController.js
├── models/
│   ├── productmodel.js
│   ├── Cartmodel.js
│   ├── Ordermodel.js
│   └── Usermodel.js
├── views/
│   ├── partials/
│   ├── users/
│   ├── admins/
│   └── errors/
├── public/
│   ├── css/
│   ├── js/
│   └── images/
├── routes/
│   ├── userRoute.js
│   ├── adminRoute.js
│  
├── middleware/
│   ├── auth.js
│   └── adminAuth.js
├── app.js
├── package.json
└── README.md


🛣️ API Routes
Authentication

GET /login - Load login page
POST /login - User login
GET /register - Load registration page
POST /register - Register new user
GET /verify-otp - Load OTP verification page
POST /verify-otp - Verify OTP
POST /resendOtp/:id - Resend OTP
GET /auth/google - Google OAuth login
GET /auth/google/callback - Google OAuth callback
POST /logout - User logout
POST /forgot-password - Request password reset
GET /reset-password/:token - Load password reset page
POST /reset-password/:token - Reset password

User Profile & Management

GET /myaccount - Account overview
POST /myaccount/edit-user/:id - Edit user profile
GET /myaccount/edit-password - Load password edit page
POST /myaccount/edit-password - Update password
POST /myaccount/uploadProfileImage - Upload profile picture

Address Management

GET /myaccount/address-book - View addresses
POST /myaccount/add-address - Add new address
DELETE /myaccount/delete-address/:id - Delete address
POST /myaccount/edit-address/:id - Edit address
GET /myaccount/set-default-address/:addressId - Set default address

Product & Shop

GET /home - Home page
GET /shop - Shop page
GET /home/product/:id - View single product
GET /search - Search products
GET /about - About page
GET /contact - Contact page

Cart Management

POST /cart/add - Add to cart
GET /cart - View cart
POST /cart/update-cart - Update cart quantities
DELETE /cart/remove/:productId - Remove from cart

Wishlist

POST /wishlist/toggle - Toggle wishlist item
GET /wishlist - View wishlist
DELETE /wishlist/remove/:id - Remove from wishlist

Order Management

POST /product/checkout - Proceed to checkout
POST /verify-payment - Verify payment
POST /place-order - Place order
GET /order-success - Order success page
GET /myaccount/order-history - View order history
GET /myaccount/cancelled-orders - View cancelled orders
GET /myaccount/delivered-orders - View delivered orders
GET /myaccount/returned-orders - View returned orders
POST /myaccount/cancel-order/:orderId - Cancel order
POST /myaccount/return-order/:orderId - Request return
POST /myaccount/retry-payment/:orderId - Retry failed payment
POST /verify-retry-payment - Verify retry payment
GET /myaccount/download-invoice/:orderId - Download invoice

Wallet & Coupons

GET /myaccount/wallet - View wallet
POST /checkout/apply-coupon - Apply coupon
POST /checkout/remove-coupon - Remove coupon

Admin Authentication

GET /admin - Admin login page
POST /admin - Admin login verification
POST /admin/logout - Admin logout
GET /admin/home - Admin dashboard

Admin User Management

GET /admin/users - View all users
POST /admin/users/block/:id - Block user
POST /admin/users/unblock/:id - Unblock user

Admin Product Management

GET /admin/products - View all products
GET /admin/products/add - Add product page
POST /admin/products/add - Add new product
GET /admin/products/edit/:id - Edit product page
POST /admin/products/edit/:id - Update product
POST /admin/products/unlistproduct/:id - Unlist product
POST /admin/products/listproduct/:id - List product

Admin Category Management

GET /admin/categories - View all categories
POST /admin/categories/addcategories - Add new category
POST /admin/categories/edit/:id - Edit category
POST /admin/categories/unlist/:id - Unlist category
POST /admin/categories/list/:id - List category

Admin Order Management

GET /admin/orders - View all orders
POST /admin/orders/cancel-order/:orderId - Cancel order
POST /admin/orders/change-status/:orderId - Update order status
POST /admin/orders/handle-return-request/:orderId - Handle return requests

Admin Coupon Management

GET /admin/coupons - View all coupons
POST /admin/coupons/add-coupons - Add new coupon
POST /admin/coupons/edit/:id - Edit coupon
POST /admin/coupons/activate/:id - Activate coupon
POST /admin/coupons/deactivate/:id - Deactivate coupon

Admin Offer Management

GET /admin/offers - View all offers
GET /admin/offers/add - Add offer page
POST /admin/offers/add - Add new offer
GET /admin/offers/edit/:id - Edit offer page
POST /admin/offers/edit/:id - Update offer
POST /admin/offers/activate/:id - Activate offer
POST /admin/offers/deactivate/:id - Deactivate offer

Admin Dashboard & Reports

GET /admin/home/excel - Generate Excel report
GET /admin/home/pdf - Generate PDF report
GET /admin/home/dashboard-data - Get dashboard chart data

👥 Contributing

Fork the repository
Create your feature branch (git checkout -b feature/AmazingFeature)
Commit your changes (git commit -m 'Add some AmazingFeature')
Push to the branch (git push origin feature/AmazingFeature)
Open a Pull Request

📧 Contact
Your Name - your.email@example.com
Project Link: https://github.com/adhnannp/mazebooks