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
const Offer = require("../models/offerModel")
const Coupon = require("../models/coupenModel")


const getValidOffers = async () => {
    const currentDate = new Date(); // Get the current date

    return await Offer.find({
        IsActive: true,
        StartDate: { $lte: currentDate }, // Offer has started
        EndDate: { $gt: currentDate } // Offer has not ended
    }).select('_id Title DiscountPercentage TargetId TargetType'); // Select relevant fields
}

const getValidCoupons = async (userId) => {
    const currentDate = new Date(); // Get the current date
    return await Coupon.find({
        IsActive: true,
        StartDate: { $lte: currentDate }, // Offer has started
        EndDate: { $gt: currentDate }, // Offer has not ended
        UsedBy: { $ne: userId } // Exclude coupons already used by the current user
    }).select('_id CouponCode DiscountPercentage MaxAmount'); // Select relevant fields
}



const loadCheckout = async (req, res) => {
    try {
        const userId = req.session.user_id;

        // Validate userId
        if (!userId) {
            return res.status(400).send('User ID not found in session');
        }

        // Retrieve addresses associated with the user
        const addresses = await Address.find({ UserId: userId }).exec();

        // Parse selected items from the request body
        const selectedItems = req.body.selectedItems
            ? req.body.selectedItems.split(',').map(id => id.trim()).filter(Boolean)
            : [];

        // Retrieve the user's cart with populated product details
        const cart = await Cart.findOne({ UserId: userId })
            .populate('Products.ProductId') // Populate ProductId
            .exec();

        // Check if cart exists
        if (!cart) {
            return res.status(404).send('Cart not found');
        }

        // Map selected items to ObjectId
        const selectedObjectIds = selectedItems.map(id => new mongoose.Types.ObjectId(id));

        // Filter cart products based on selected product IDs
        const selectedProducts = cart.Products.filter(item =>
            selectedObjectIds.some(selectedId => selectedId.equals(item.ProductId._id))
        );

        // Get valid offers
        const validOffers = await getValidOffers();

        let cartSubtotal = 0;
        let actualPriceTotal = 0;
        const updatedProducts = selectedProducts.map(item => {
            let itemPrice = item.ProductId.Price; // Access price from ProductId

            // Check for applicable offers
            const applicableOffers = validOffers.filter(offer =>
                item.ProductId.Offers && item.ProductId.Offers.some(productOffer =>
                    productOffer.OfferId && productOffer.OfferId.equals(offer._id)
                )
            );

            // Calculate price after applicable offers
            if (applicableOffers.length > 0) {
                const maxDiscount = Math.max(...applicableOffers.map(offer => offer.DiscountPercentage));
                itemPrice -= (itemPrice * maxDiscount / 100);
            }

            const itemTotalPrice = itemPrice * item.Quantity;
            cartSubtotal += itemTotalPrice;

             // Calculate the actual price total (without discount)
            actualPriceTotal += item.ProductId.Price * item.Quantity; // Sum up actual prices
            return {
                ...item.toObject(), // Convert to plain object if needed
                Price: itemPrice // Keep price fixed to 2 decimal places
            };
        });

        // Calculate shipping cost
        const shippingCost = cartSubtotal > 499 ? 0 : 50;
        const cartTotal = cartSubtotal + shippingCost;

        // Format addresses for rendering
        const userAddresses = addresses.map(({ FullName, MobileNo, Address, Landmark, Pincode, FlatNo, State, District, City, Country, AddressType }) => ({
            FullName,
            MobileNo,
            Address,
            Landmark,
            Pincode,
            FlatNo,
            State,
            District,
            City,
            Country,
            AddressType
        }));
        
        const validCoupons = await getValidCoupons(req.session.user_id);

        // Render the checkout page
        res.render('checkoutPage', {
            addresses: userAddresses,
            cartItems: updatedProducts,
            cartSubtotal: cartSubtotal, // Ensure subtotal is fixed to 2 decimal places
            cartTotal: cartTotal, // Ensure total is fixed to 2 decimal places
            userId,
            actualPriceTotal,
            validCoupons,
        });
    } catch (error) {
        console.error("Error in loadCheckout:", error);
        res.status(500).send('Internal Server Error');
    }
};


const razorpay = new Razorpay({
    key_id: process.env.YOUR_RAZORPAY_KEY_ID,
    key_secret: process.env.YOUR_RAZORPAY_KEY_SECRET
});


const placeOrder = async (req, res) => {
    try {
        const { paymentMethod, Products, TotalPrice, Address, actualTotalPrice, appliedCouponCode, priceWithoutDedection } = req.body;
        console.log(req.body);
        const userId = req.session.user_id; // Assuming user ID is stored in session
        console.log('Incoming Products:', paymentMethod, Products, TotalPrice, Address, priceWithoutDedection);

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
                ActualTotalPrice: parseFloat(actualTotalPrice),
                AppliedCoupon: appliedCouponCode ? appliedCouponCode:null,
                PriceWithoutDedection: priceWithoutDedection,
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

            // Check and update the coupon usage if an applied coupon code is present
            if (appliedCouponCode) {
                const coupon = await Coupon.findOne({ CouponCode: appliedCouponCode });
                if (coupon) {
                    coupon.UsedBy.push(userId); // Add the user ID to the UsedBy array
                    await coupon.save(); // Save the updated coupon
                }
            }

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
            ActualTotalPrice: parseFloat(actualTotalPrice),
            AppliedCoupon: appliedCouponCode?appliedCouponCode:null,
            PriceWithoutDedection:priceWithoutDedection,
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

        // Check and update the coupon usage if an applied coupon code is present
        if (appliedCouponCode) {
            const coupon = await Coupon.findOne({ CouponCode: appliedCouponCode });
            if (coupon) {
                coupon.UsedBy.push(userId); // Add the user ID to the UsedBy array
                await coupon.save(); // Save the updated coupon
            }
        }

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

const retryPayment = async (req, res) => {
    try {
        const OrderId = req.params.orderId;
        const order = await Order.findOne({OrderId});
        console.log("reeach here")
        console.log(order)
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // Check if the payment is already completed
        if (order.PaymentStatus === 'Paid') {
            return res.status(400).json({ success: false, message: 'Payment already completed' });
        }

        // If the order is still pending, send the order details for payment
        req.session.order_id = order.OrderId;
        return res.json({
            success: true,
            razorpayOrderId: order.RazorpayOrderId,
            amount: order.TotalPrice * 100, // Convert to paise
            currency: 'INR',
            key: process.env.YOUR_RAZORPAY_KEY_ID
        });
    } catch (error) {
        console.error('Error retrying payment:', error);
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
    retryPayment,
}