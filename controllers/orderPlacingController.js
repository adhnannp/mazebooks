const mongoose = require('mongoose')
const Razorpay = require('razorpay');
const crypto = require('crypto');
const User = require('../models/userModel');
require('dotenv').config();
const Product = require("../models/productModel");
const Address = require("../models/addressModel");
const Cart = require("../models/cartModel");
const Order = require("../models/orderModel");
const Wallet = require("../models/walletModel");




const loadCheckout = async (req, res) => {
    try {
        // Fetch all addresses and cart information from the database
        const userId = req.session.user_id
        const addresses = await Address.find({ UserId: req.session.user_id }).exec();
        const cart = await Cart.findOne({ UserId: req.session.user_id })
            .populate('Products.ProductId') // Populate ProductId
            .exec();

        // Get selected product IDs from the form submission
        const selectedItems = req.body.selectedItems.split(',').map(id => id.trim()).filter(Boolean);

        // Convert selected items to ObjectId
        const selectedObjectIds = selectedItems.map(id => new mongoose.Types.ObjectId(id));

        // Filter cart products based on selected product IDs
        const selectedProducts = cart.Products.filter(product => {
            const productId = product.ProductId ? product.ProductId._id : null;
            return productId && selectedObjectIds.some(selectedId => selectedId.equals(productId));
        });

        // Calculate subtotal and total for selected products
        const cartSubtotal = selectedProducts.reduce((total, item) => total + (item.Price * item.Quantity), 0);
        const shippingCost = cartSubtotal > 499 ? 0 : 50; // Adjust shipping cost based on total
        const cartTotal = cartSubtotal + shippingCost;

        // Prepare addresses for rendering
        const userAddresses = addresses.map(address => ({
            FullName: address.FullName,
            MobileNo: address.MobileNo,
            Address: address.Address,
            Landmark: address.Landmark,
            Pincode: address.Pincode,
            FlatNo: address.FlatNo,
            State: address.State,
            District: address.District,
            City: address.City,
            Country: address.Country,
            AddressType: address.AddressType
        }));

        // Render the checkout page with all necessary data
        res.render('checkoutPage', {
            addresses: userAddresses,
            cartItems: selectedProducts,
            cartSubtotal,  // Pass subtotal (products only)
            cartTotal, // Pass total (with shipping)
            userId
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};

const razorpay = new Razorpay({
    key_id: process.env.YOUR_RAZORPAY_KEY_ID,
    key_secret: process.env.YOUR_RAZORPAY_KEY_SECRET
});


const placeOrder = async (req, res) => {
    try {
        const { paymentMethod, Products, TotalPrice, Address } = req.body;
        const userId = req.session.user_id; // Assuming user ID is stored in session
        console.log('Incoming Products:', paymentMethod, Products, TotalPrice, Address);

        // If payment method is Online Payment, create a Razorpay order
        let razorpayOrderId = null;
        if (paymentMethod === 'Online Payment') {
            // Create a Razorpay order
            const razorpayOrder = await razorpay.orders.create({
                amount: Math.round(TotalPrice * 100), // Razorpay accepts amount in paise (smallest currency unit)
                currency: 'INR',
                receipt: `receipt_order_${userId}_${Date.now()}`.slice(0, 40),
                payment_capture: 1 // Auto-capture after successful payment
            });

            razorpayOrderId = razorpayOrder.id; // Store the order ID
            req.session.razorpayOrderId = razorpayOrderId; // Store in session

            // Create new order object here to include Razorpay order details
            const newOrder = new Order({
                UserId: userId,
                PaymentMethod: paymentMethod,
                Products: Products.map(item => ({
                    ProductId: new mongoose.Types.ObjectId(item.ProductId), // Convert string ID to ObjectId
                    Quantity: item.Quantity
                })), // Use converted ObjectId array
                TotalPrice: parseFloat(TotalPrice),
                Address: {
                    FullName: Address.FullName,
                    Address: Address.Address,
                    MobileNo: Address.MobileNo,
                    Pincode: Address.Pincode,
                    FlatNo: Address.FlatNo,
                    Country: Address.Country,
                    City: Address.City,
                    District: Address.District,
                    Landmark: Address.Landmark,
                    State: Address.State
                },
                Status: 'Pending', // Default status
                RazorpayOrderId: razorpayOrderId // Ensure it's saved correctly
            });

            // Save the new order
            await newOrder.save();

            // Update product quantities and remove items from cart
            for (const item of Products) {
                await Product.findByIdAndUpdate(
                    item.ProductId,
                    { $inc: { Quantity: -item.Quantity } } // Decrease quantity by the ordered amount
                );
            }

            // Remove the ordered items from the user's cart
            await Cart.findOneAndUpdate(
                { UserId: userId },
                { $pull: { Products: { ProductId: { $in: Products.map(item => item.ProductId) } } } }
            );
            
            req.session.order_id = newOrder.OrderId;
            return res.json({
                razorpayOrderId: razorpayOrder.id,
                amount: razorpayOrder.amount,
                currency: razorpayOrder.currency,
                key: process.env.YOUR_RAZORPAY_KEY_ID
            });
        }

        // For other payment methods (not online payment)
        // Create order object without Razorpay details
        const newOrder = new Order({
            UserId: userId,
            PaymentMethod: paymentMethod,
            Products: Products.map(item => ({
                ProductId: new mongoose.Types.ObjectId(item.ProductId), // Convert string ID to ObjectId
                Quantity: item.Quantity
            })), // Use converted ObjectId array
            TotalPrice: parseFloat(TotalPrice),
            Address: {
                FullName: Address.FullName,
                Address: Address.Address,
                MobileNo: Address.MobileNo,
                Pincode: Address.Pincode,
                FlatNo: Address.FlatNo,
                Country: Address.Country,
                City: Address.City,
                District: Address.District,
                Landmark: Address.Landmark,
                State: Address.State
            },
            Status: 'Pending' // Or whatever status fits your logic for non-online payments
        });

        // Save the new order
        await newOrder.save();

        // Update product quantities and remove items from cart
        for (const item of Products) {
            await Product.findByIdAndUpdate(
                item.ProductId,
                { $inc: { Quantity: -item.Quantity } } // Decrease quantity by the ordered amount
            );
        }

        // Remove the ordered items from the user's cart
        await Cart.findOneAndUpdate(
            { UserId: userId },
            { $pull: { Products: { ProductId: { $in: Products.map(item => item.ProductId) } } } }
        );

        req.session.order_id = newOrder.OrderId;
        res.redirect(`/order-success?orderId=${req.session.order_id}`);
    } catch (error) {
        console.error('Error placing order:', error);
        res.status(500).json({ message: 'Error placing order', error: error.message });
    }
};

//order success page
const successPage = async (req, res) => {
    try {
        const orderId = req.query.orderId;
        if (!orderId) {
            return res.redirect('/'); // Redirect if no orderId is found  
        }
        // Optionally fetch order details to display
        const order = await Order.findOne({ OrderId: orderId }).populate('Products.ProductId');
        req.session.order_id ='';
        res.render('orderSuccessPage', { order }); // Render the order success page
    } catch (error) {
        console.error('Error fetching order:', error);
        res.redirect('/'); // Redirect on error
    }
};

//verify payment
const verifyPayment = async (req, res) => {
    try {
        const { razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;

        console.log('Received:', { razorpayPaymentId, razorpayOrderId, razorpaySignature });

        const crypto = require('crypto');
        const generated_signature = crypto.createHmac('sha256', process.env.YOUR_RAZORPAY_KEY_SECRET)
            .update(razorpayOrderId + "|" + razorpayPaymentId)
            .digest('hex');

        console.log('Generated Signature:', generated_signature);

        if (generated_signature !== razorpaySignature) {
            console.error('Signature mismatch:', { generated_signature, razorpaySignature });
            return res.json({ success: false, message: 'Payment verification failed' });
        }

        const order = await Order.findOneAndUpdate(
            { RazorpayOrderId: razorpayOrderId },
            { RazorpayPaymentId: razorpayPaymentId, PaymentStatus: 'Paid' },
            { new: true }
        );

        if (order) {
            return res.json({ success: true, orderId: order.OrderId });
        }

        res.json({ success: false, message: 'Order not found' });
    } catch (error) {
        console.error('Error verifying payment:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

//load order history
const loadOrderHistory = async (req,res)=>{
    try {
        const error = req.query.error; 
        const userId = req.session.user_id; // Assuming user ID is stored in session

        // Pagination variables
        const currentPage = parseInt(req.query.page) || 1; // Get current page, default to 1
        const itemsPerPage = 5; // Number of items per page

        // Calculate total orders and pages for this user
        const totalOrders = await Order.countDocuments({ UserId: userId });
        const totalPages = Math.ceil(totalOrders / itemsPerPage);

        // Fetch paginated orders
        const orders = await Order.find({ UserId: userId })
            .skip((currentPage - 1) * itemsPerPage)
            .limit(itemsPerPage)
            .populate('Products.ProductId')
            .sort({ createdAt: -1 });

        // Render the orders with pagination
        res.render('orderHistoryPage', {
            orders,
            currentPage,
            totalPages,
            error,
            cartItemCount: req.session.cartItemCount,
            wishlistItemCount: req.session.wishlistItemCount,
            user:req.session.user_id
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).send('Error fetching orders');
    }
}

// Controller for cancelling the order and updating product stock
const cancelOrder = async (req, res) => {
    try {
        const orderId = req.params.orderId;

        // Find the order by its ID
        const order = await Order.findById(orderId).populate('Products.ProductId');

        if (!order) {
            return res.redirect('/myaccount/order-history?error=Order not found');
        }

        // Check if the order is already canceled
        if (order.Status === 'Cancelled') {
            return res.redirect('/myaccount/order-history?error=Order is already cancelled');
        }

        // Update the order status to "Cancelled"
        order.Status = 'Cancelled';
        await order.save();  // Save the updated order

        // Loop through each product in the order and update the stock
        await Promise.all(order.Products.map(async (item) => {
            const product = await Product.findById(item.ProductId._id);
            if (product) {
                product.Quantity += item.Quantity;  // Add the canceled quantity back to the stock
                await product.save();  // Save the updated product
                console.log(product);
            }
        }));

        if (order.PaymentMethod !== 'Cash On Delivery') {
            // Find the user's wallet
            let wallet = await Wallet.findOne({ UserId: order.UserId });

            // If no wallet exists, create a new one
            if (!wallet) {
                wallet = await Wallet.create({
                    UserId: order.UserId,  // Use the correct user ID
                    Balance: 0,
                    Transactions: []
                });
            }

            // Add the amount of the order to the wallet balance
            wallet.Balance += order.TotalPrice; // Assuming order.TotalPrice contains the amount to be added

            // Add a transaction record for the return
            wallet.Transactions.push({
                Type: 'Cancelled Order',
                Amount: order.TotalPrice,
                Date: new Date() // Current date for the transaction
            });

            // Save the updated wallet
            await wallet.save();
        }

        // Redirect back to the order history page
        res.redirect('/myaccount/order-history?success=Order cancelled successfully');
    } catch (error) {
        console.error('Error cancelling order:', error);
        // Redirect back to order history with an error message if something goes wrong
        res.redirect('/myaccount/order-history?error=Could not cancel the order');
    }
};

module.exports = {
    loadCheckout,
    placeOrder,
    successPage,
    loadOrderHistory,
    cancelOrder,
    verifyPayment,
}