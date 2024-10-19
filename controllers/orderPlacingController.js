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
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const fs = require('fs');


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
        const userAddresses = addresses.map(({ FullName, MobileNo, Address, Landmark, Pincode, FlatNo, State, District, City, Country, AddressType, IsDefault }) => ({
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
            AddressType,
            IsDefault
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

        //payment method wallet
        // If payment method is wallet
        if (paymentMethod === 'Wallet Payment') {
           // Find the user's wallet
           let wallet = await Wallet.findOne({ UserId: userId });
           if (!wallet) {
               return res.status(400).json({ success: false, message: 'Wallet not found' });
           }
           // Check if wallet balance is sufficient
           if (wallet.Balance < TotalPrice) {
               return res.status(400).json({ success: false, message: 'Insufficient balance in wallet' });
           }
           // Deduct the total price from the wallet balance
           wallet.Balance -= TotalPrice;
           // Add a transaction record for the purchase
           wallet.Transactions.push({
               Type: 'Product Purchase',
               Amount: TotalPrice,
               Date: new Date()
           });
           // Save the updated wallet
           await wallet.save();

           const newOrder = new Order({
                UserId: userId,
                PaymentMethod: paymentMethod,
                Products: Products.map(item => ({
                    ProductId: new mongoose.Types.ObjectId(item.ProductId), // Convert string ID to ObjectId
                    Quantity: item.Quantity
                })), // Use converted ObjectId array
                TotalPrice: parseFloat(TotalPrice),
                PaymentStatus: 'Paid',
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
            return res.status(200).json({success:true , orderId:req.session.order_id})
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
const loadOrderHistory = async (req, res) => {
    try {
        const error = req.query.error; 
        const userId = req.session.user_id; // Assuming user ID is stored in session

        // Get selected category from query string
        const category = req.query.category || 'live'; // Default to 'live' orders if no category is selected

        // Pagination variables
        const currentPage = parseInt(req.query.page) || 1; // Get current page, default to 1
        const itemsPerPage = 5; // Number of items per page

        // Define the query to filter orders based on category
        let orderQuery = { UserId: userId };
        if (category === 'cancelled') {
            orderQuery.Status = 'Cancelled';
        } else if (category === 'returned') {
            orderQuery.Status = 'Returned';
        } else if (category === 'delivered') {
            orderQuery.Status = 'Placed';
        } else {
            // Default to live orders (Pending, Shipped, or Placed)
            orderQuery.Status = { $in: ['Pending', 'Shipped', 'Delivered'] };
        }

        // Calculate total orders and pages for this category and user
        const totalOrders = await Order.countDocuments(orderQuery);
        const totalPages = Math.ceil(totalOrders / itemsPerPage);

        // Fetch paginated orders based on the selected category
        const orders = await Order.find(orderQuery)
            .skip((currentPage - 1) * itemsPerPage)
            .limit(itemsPerPage)
            .populate('Products.ProductId')
            .sort({ createdAt: -1 });

        // Render the orders with pagination
        res.render('orderHistoryPage', {
            orders,
            currentPage,
            totalPages,
            currentCategory: category, // Pass the selected category to the view
            error,
            cartItemCount: req.session.cartItemCount,
            wishlistItemCount: req.session.wishlistItemCount,
            user: req.session.user_id
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).send('Error fetching orders');
    }
};


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

const downloadInvoice = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const order = await Order.findById(orderId).populate('Products.ProductId');

        if (!order) {
            return res.status(404).send('Order not found');
        }

        await generateInvoice(order, res);
    } catch (err) {
        console.error(err);
        res.status(500).send('Could not generate invoice.');
    }
};

const generateInvoice = async (order, res) => {
    try {
        const doc = new PDFDocument({ margin: 50 });

        // Set response headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="invoice-${order.OrderId}.pdf"`);

        // Pipe the PDF to the response
        doc.pipe(res);

        // Add company logo and header
        doc.fontSize(20)
           .text('MAZE BOOKS', 50, 57)
           .moveDown();

        // Invoice title
        doc.fontSize(25)
           .text('INVOICE', 50, 160);
        
        generateHr(doc, 185);

        // Invoice details
        const customerInformationTop = 200;
        doc.fontSize(10)
           .text('Invoice Number:', 50, customerInformationTop)
           .font('Helvetica-Bold')
           .text(order.OrderId, 150, customerInformationTop)
           .font('Helvetica')
           .text('Invoice Date:', 50, customerInformationTop + 15)
           .text(formatDate(order.createdAt), 150, customerInformationTop + 15)
           .text('Payment Method:', 50, customerInformationTop + 30)
           .text(order.PaymentMethod || 'N/A', 150, customerInformationTop + 30) // Handle undefined Payment Method
           .text('Total Amount:', 50, customerInformationTop + 45)
           .text("Rs:" + (order.TotalPrice || 0), 150, customerInformationTop + 45) // Handle undefined Total Price
           .font('Helvetica-Bold')
           .text(order.Address.FullName || 'N/A', 300, customerInformationTop)
           .font('Helvetica')
           .text(order.Address.Address || 'N/A', 300, customerInformationTop + 15)
           .text(`${order.Address.City || 'N/A'}, ${order.Address.State || 'N/A'} ${order.Address.Pincode || 'N/A'}`, 300, customerInformationTop + 30)
           .moveDown();

        generateHr(doc, 265);

        // Product table
        let position = 330; // Set initial position
        let priceWithoutDeduction = 0;
        if (order.Products && order.Products.length > 0) {
            generateTableRow(
                doc,
                position,
                'Item',
                'Unit Cost',
                'Quantity',
                'Line Total'
            );
            generateHr(doc, position + 20);
            position += 30; // Update position after header
            for (let item of order.Products) {
                if (item.ProductId) {
                    priceWithoutDeduction+=(item.ProductId.Price || 0) * (item.Quantity || 0)
                    position = generateTableRow(
                        doc,
                        position,
                        item.ProductId.Name || 'N/A',
                        "Rs:" + (item.ProductId.Price || 0),
                        item.Quantity || 0,
                        "Rs:" + ((item.ProductId.Price || 0) * (item.Quantity || 0))
                    );

                    // Check if position is valid before generating HR
                    if (typeof position === 'number' && !isNaN(position)) {
                        generateHr(doc, position + 20);
                        position += 40; // Increase position for next item
                    } else {
                        console.error('Invalid position after generateTableRow:', position);
                        position = doc.y + 40; // Reset to current y position plus some offset
                    }
                }
            }
        } else {
            doc.fontSize(10).text('No products in this order.', 50, position);
            position += 20;
        }

        // Return status if applicable
        if (order.ReturnRequest && order.ReturnRequest.status) {
            const returnStatusPosition = position + 30;
            doc.fontSize(10).text('Return Status:', 50, returnStatusPosition);
            doc.text(`Reason: ${order.ReturnRequest.reason || 'N/A'}`, 150, returnStatusPosition);
            doc.text(`Requested At: ${order.ReturnRequest.requestedAt ? formatDate(order.ReturnRequest.requestedAt) : 'N/A'}`, 150, returnStatusPosition + 30);
            doc.text('Status: Fund returned to wallet', 150, returnStatusPosition + 45);
            generateHr(doc, returnStatusPosition + 60);
        }

        // Add totals and footer
        const subtotalPosition = position + 60;

        // Calculate discount amount
        const discountAmount = priceWithoutDeduction - (order.TotalPrice || 0);
        generateTableRow(
            doc,
            subtotalPosition,
            '',
            '',
            'Sub Total:',
            "Rs: "+priceWithoutDeduction, // Ensure the amount is formatted to 2 decimal places
            ''
        );
        // Conditional display logic
        if (discountAmount >= 0) {
            // Display Discount Amount
            generateTableRow(
                doc,
                subtotalPosition+30,
                '',
                '',
                'Discount Amount:',
                "Rs: -"+discountAmount, // Ensure the amount is formatted to 2 decimal places
                ''
            );
        } else {
            generateTableRow(
                doc,
                subtotalPosition+30,
                '',
                '',
                'Shipping Charge: (After Discount)',
                "Rs: +"+(discountAmount*-1),// Ensure the amount is formatted to 2 decimal places
                ''
            );
        }
        const paidToDatePosition = subtotalPosition + 60;
        generateTableRow(
            doc,
            paidToDatePosition,
            '',
            '',
            'Total:',
            "Rs: " +(order.TotalPrice || 0),
            ''
        );

        // Add QR code if needed
        const qrCodeDataUrl = await QRCode.toDataURL('http://localhost:3000');
        doc.image(qrCodeDataUrl, 50, doc.page.height - 100, { width: 50 });

        // Footer
        doc.fontSize(10)
           .text('Thank you for your business!', 50, doc.page.height - 50, { align: 'center', width: 500 });

        // Finalize the PDF and end the stream
        doc.end();
    } catch (err) {
        console.error(err);
        res.status(500).send('Could not generate invoice.');
    }
};


function generateHr(doc, y) {
    if (typeof y !== 'number' || isNaN(y)) {
        console.error('Invalid y coordinate for HR:', y);
        throw new Error('Invalid y coordinate for HR');
    }
    
    doc.strokeColor("#aaaaaa")
       .lineWidth(1)
       .moveTo(50, y)
       .lineTo(550, y)
       .stroke();
}

function formatDate(date) {
    const day = date.getDate();
    const month = date.getMonth() + 1; // Adjust for zero-indexing
    const year = date.getFullYear();
    return `${year}/${month}/${day}`;
}

function generateTableRow(doc, y, item, unitCost, quantity, lineTotal) {
    const productNameColumnWidth = 150; // Set a max width for the product name
    const otherColumnWidth = 100; // Set a fixed width for other columns

    // Wrap the product name to the next line if it exceeds the column width
    doc.font('Helvetica')
       .fontSize(10)
       .text(item, 50, y, { width: productNameColumnWidth, align: 'left' }) // Wrap text in product name column
       .text(unitCost, 200, y, { width: otherColumnWidth, align: 'right' }) // Adjust the position for unit cost
       .text(quantity, 300, y, { width: otherColumnWidth, align: 'right' }) // Adjust the position for quantity
       .text(lineTotal, 400, y, { width: otherColumnWidth, align: 'right' }); // Adjust the position for line total
}


module.exports = {
    loadCheckout,
    placeOrder,
    successPage,
    loadOrderHistory,
    cancelOrder,
    verifyPayment,
    retryPayment,
    downloadInvoice,
}