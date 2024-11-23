# MAZE BOOKS 📚

A full-stack e-commerce platform for book lovers. MAZE BOOKS is designed to bring the joy of reading to your fingertips with features like secure payment integration, user referral rewards, personalized recommendations, and a comprehensive admin dashboard.

## Features 🌟

### User Features
- Authentication & Authorization
  - User login, registration
  - Google OAuth integration
  - OTP-based verification
- Book Catalog Management
  - Browse and search books across multiple categories
- Shopping Cart
  - Add, update, and remove books
- Order Processing
  - Checkout functionality
  - Discount application
  - Order status tracking
- Referral Program
  - Invite friends and earn rewards
- Payment Integration
  - Secure payment with Razorpay
- Wallet & Coupons
  - Digital wallet management
  - Coupon application at checkout
- Wishlist
  - Save favorite books for later

### Admin Features
- Admin Dashboard
  - Manage products, users, orders, and reports
- User Management
  - Block/unblock users
  - Handle user queries
- Product Management
  - Add and edit books
  - List/unlist books
- Category Management
  - Organize books for easy discovery
- Sales & Reports
  - Generate PDF/Excel sales reports
- Offer & Coupon Management
  - Create and manage offers
  - Manage discount coupons
- Order Status Management
  - Track orders
  - Process return requests

## Tech Stack 🔧

- Backend: Node.js, Express.js
- Frontend: EJS, JavaScript, HTML5, CSS3
- Database: MongoDB with Mongoose
- Authentication: Passport.js with Google OAuth
- Payment: Razorpay integration
- Other Tools:
  - Multer for file uploads
  - pdfkit for PDF generation
  - xlsx for Excel report generation

## Prerequisites 📋

Ensure you have the following installed:
- Node.js (v14 or higher)
- MongoDB
- Git

## Installation & Setup 🚀

1. Clone the repository
```bash
git clone https://github.com/adhnannp/mazebooks.git
cd mazebooks
```

2. Install dependencies
```bash
npm install
```

3. Set up Environment Variables
Create a `.env` file in the root directory:
```env
DB_URI= you mongodb uri
SESSION_SECRET= your session secret
GOODLE_MAIL_PASS_KEY= your google mail pass key
YOUR_GOOGLE_CLIENT_ID = your google client id
YOUR_GOOGLE_CLIENT_SECRET = your google client secret
YOUR_RAZORPAY_KEY_ID = your razorpay key id
YOUR_RAZORPAY_KEY_SECRET = your razorpay key secret
```

4. Start the Application
   
Development Mode:
```bash
npm run dev
```
   
Production Mode:
```bash
npm start
```

## Project Structure 📁

```
maze-books/
├── config/
│   ├── config.js
│   ├── passport.js
│   └── multer.config.js
├── controllers/
│   ├── userController.js
│   ├── adminController.js
│   ├── cartController.js
│   └── orderController.js
├── models/
│   ├── productModel.js
│   ├── cartModel.js
│   ├── orderModel.js
│   └── userModel.js
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
│   └── adminRoute.js
├── middleware/
│   ├── auth.js
│   └── adminAuth.js
├── app.js
├── package.json
└── README.md
```

## API Routes 🛣️

### Authentication
- GET /login - Load login page
- POST /login - User login
- GET /register - Registration page
- POST /register - Register new user
- GET /verify-otp - OTP verification
- POST /verify-otp - Verify OTP
- GET /auth/google - Google OAuth login
- POST /forgot-password - Password reset request

### User Profile & Management
- GET /myaccount - Account overview
- POST /myaccount/edit-user/:id - Edit profile
- GET /myaccount/address-book - Address management

### Product & Shop
- GET /home - Home page
- GET /shop - Browse books
- GET /home/product/:id - Single product details
- GET /search - Search products

### Order Management
- POST /product/checkout - Checkout
- POST /place-order - Place order
- GET /order-success - Success page

### Admin Routes
- GET /admin - Admin login
- GET /admin/home - Admin dashboard
- POST /admin/products/add - Add product
- POST /admin/orders/cancel-order/:orderId - Cancel order

## Contributing 👥

1. Fork the repository
2. Create your feature branch:
```bash
git checkout -b feature/AmazingFeature
```
3. Commit your changes:
```bash
git commit -m 'Add some AmazingFeature'
```
4. Push to the branch:
```bash
git push origin feature/AmazingFeature
```
5. Open a Pull Request

## Contact 📧

For any questions or issues, please reach out:

- Name: Adhnan P
- Email: adhnanusman1234@gmail.com
- Project Link: [Maze Books on GitHub](https://github.com/adhnannp/mazebooks)
