const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const User = require("../models/userModel");
const bcrypt = require("bcrypt");
const Product = require("../models/productModel");
const Category = require("../models/categoryModel");
const Order = require("../models/orderModel");
const Wallet = require("../models/walletModel");

//login setup
const loadLogin = async(req,res)=>{
    try {
        res.render('login')
    } catch (error) {
        console.log(error.message);
    }
}

const varifyLogin = async(req,res)=>{
    try {
        const email = req.body.email;
        const password = req.body.password;

        const adminData = await User.findOne({Email:email})
        if(adminData){
           const passwordMatch = await bcrypt.compare(password,adminData.Password)
           if(passwordMatch){
            if(!adminData.Is_admin){
                res.render('login',{message:"No Admin found"});
            }else{
                req.session.is_admin = adminData.Is_admin
                req.session.user_id = adminData._id;
                res.redirect('/admin/home');
            }
           }else{
            res.render('login',{message:"incorrect email or password"});
           }
        }else{
            res.render('login',{message:"No Admin found"})
        }

    } catch (error) {
        console.log(error.message);
    }
}

const logout = async(req,res)=>{
    try {
        req.session.destroy();
        res.redirect('/admin');
    } catch (error) {
        console.log(error.message)
        res.redirect('/home');
    }
}

//show users
const adminUsers = async (req, res) => {
    try {
        const admin = await User.findById(req.session.user_id);
        const query = req.query.query || '';
        const currentPage = parseInt(req.query.page) || 1;
        const itemsPerPage = 10;
        
        let usersData, totalUsers;

        // If there is a search query, prioritize search results
        if (query) {
            const regex = new RegExp(query, 'i');
            usersData = await User.find({
                Is_admin: false,
                $or: [
                    { FirstName: regex },
                    { LastName: regex },
                    { Email: regex }
                ]
            }).limit(itemsPerPage);
        } else {
            totalUsers = await User.countDocuments({ Is_admin: false });
            usersData = await User.find({ Is_admin: false })
                .skip((currentPage - 1) * itemsPerPage)
                .limit(itemsPerPage);
        }

        if (req.xhr) { // Check if request is AJAX (xhr)
            return res.json({
                users: usersData,
                totalPages: Math.ceil(totalUsers / itemsPerPage), // Only return the user data as JSON
                query,
                noResults: usersData.length === 0
            });
        }

        const totalPages = Math.ceil(totalUsers / itemsPerPage);

        res.render('users.ejs', {
            admin,
            user: usersData,
            currentPage,
            totalPages,
            query,
            noResults: usersData.length === 0
        });
    } catch (error) {
        console.log(error.message);
        res.redirect('/home');
    }
};

// Unblock User
const unblockUser = async (req, res) => {
    try {
        const userId = req.params.id;
        // Find the user by ID and update the `Is_block` field to `false`
        await User.findByIdAndUpdate(userId, { Is_block: false });
        res.redirect('/admin/users');
    } catch (error) {
        console.log('Error unblocking user:', error.message);
        res.redirect('/admin/users');
    }
};

// Block User
const blockUser = async (req, res) => {
    try {
        const userId = req.params.id;
        // Find the user by ID and update the `Is_block` field to `true`
        await User.findByIdAndUpdate(userId, { Is_block: true });
        res.redirect('/admin/users');
    } catch (error) {
        console.log('Error blocking user:', error.message);
        res.redirect('/admin/users');
    }
};

//display products
const productsLoad = async (req, res) => {
    try {
        const admin = await User.findById(req.session.user_id);
        const categories = await Category.find({ Is_list: true });
        
        // Get current page, default to 1
        const currentPage = parseInt(req.query.page) || 1;
        const itemsPerPage = 10; // Number of items per page

        // Fetch the search query
        const query = req.query.query ? req.query.query.trim() : '';

        // Create the search filter
        const searchFilter = query ? { Name: { $regex: query, $options: 'i' } } : {};

        // Calculate total products and pages
        const totalProducts = await Product.countDocuments(searchFilter);
        const totalPages = Math.ceil(totalProducts / itemsPerPage);

        // Fetch products with pagination, filtering by search query, and populate category
        const products = await Product.find(searchFilter)
            .populate('CategoryId')
            .sort({ Name: 1 }) // Sort by product name
            .skip((currentPage - 1) * itemsPerPage)
            .limit(itemsPerPage);

        // Render the products or send them as a response
        res.render("products", {
            products,
            admin,
            currentPage,
            totalPages,
            categories,
            query // Pass the query to the view for the search input
        });
    } catch (error) {
        console.error("Error loading products:", error);
        res.status(500).send("Server Error");
    }
};

const addProductLoadPage = async(req,res)=>{
    try {
        const categories = await Category.find();
        const admin = await User.findById(req.session.user_id);
        res.render('addProductPage',{admin,categories})
    } catch (error) {
        console.log(error.message);
    }
}

const addProduct = async (req, res) => {
    try {
        // Check if the product already exists by name and author
        const existingProduct = await Product.findOne({ Name: new RegExp(`^${req.body.name}$`, 'i') });
        if (existingProduct) {
            return res.json({ success: false, message: "Product already exists" });
        }

        // Define the image fields and cropped fields
        const imageFields = ['img1', 'img2', 'img3'];
        const croppedImageFields = ['croppedImage0', 'croppedImage1', 'croppedImage2'];
        const imageUrls = [];

        // Loop through image fields to populate imageUrls
        imageFields.forEach((field, index) => {
            // Check if a cropped image exists for this field
            if (req.files[croppedImageFields[index]]) {
                // Use cropped image
                imageUrls.push(req.files[croppedImageFields[index]][0].filename); 
            } else if (req.files[field]) {
                // Use original image if no cropped version
                imageUrls.push(req.files[field][0].filename); 
            }
        });

        // Check if at least one image was added
        if (imageUrls.length === 0) {
            return res.json({ success: false, message: "At least one image is required" });
        }

        // Limit to three images
        if (imageUrls.length > 3) {
            return res.json({ success: false, message: "Only three images can be uploaded" });
        }
        // Create new product with images
        const newProduct = new Product({
            Name: req.body.name,
            Description: req.body.description,
            CategoryId: req.body.categoryId,
            Author: req.body.author,
            Images: imageUrls,
            Quantity: req.body.quantity,
            Price: req.body.price,
            CreatedAt: new Date(),
            UpdatedAt: new Date(),
            Is_list: true
        });

        await newProduct.save();

        //delete the images wich are not used
        // Get the uploads directory path
        const uploadsDir = path.join(__dirname, '../public/uploads'); // Adjust path if necessary
        // Loop through the uploaded files in req.files
        Object.keys(req.files).forEach(field => {
            const uploadedFiles = req.files[field];

            uploadedFiles.forEach(file => {
                // Check if the file is NOT in imageUrls
                if (!imageUrls.includes(file.filename)) {
                    // Delete the file
                    fs.unlinkSync(path.join(uploadsDir, file.filename));
                    console.log(`Deleted unused file: ${file.filename}`);
                }
            });
        });

        res.json({ success: true }); // Send success response
    } catch (error) {
        console.error('Error adding product:', error);
        res.status(500).json({ success: false, message: 'Server Error, Please try again' });
    }
};

//edit product page load
const editProductLoadPage = async (req, res) => {
    try {
        const categories = await Category.find();
        const admin = await User.findById(req.session.user_id);
        const productId = req.params.id;
        const product = await Product.findById(productId); // Fetch product by ID

        if (!product) {
            return res.status(404).send('Product not found');
        }

        res.render('editProductPage', { admin, categories, product });
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');
    }
};

//edit product
const editProduct = async (req, res) => {
    try {
        const Id = req.params.id;

        // Validate ObjectId
        if (!mongoose.isValidObjectId(Id)) {
            console.error(`Invalid product ID: ${Id}`);
            return res.status(400).json({ success: false, message: 'Invalid product ID' });
        }

        // Check if product name already exists
        const existingProduct = await Product.findOne({
            Name: new RegExp(`^${req.body.name}$`, 'i'),
            _id: { $ne: Id }
        });

        if (existingProduct) {
            return res.json({ success: false, message: "Product already exists" });
        }

        // Destructure the product data from the request body
        const { name, author, description, categoryId, quantity, price } = req.body;

        // Fetch the existing product
        let product = await Product.findById(Id);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        // Update product fields
        product.Name = name;
        product.Author = author;
        product.Description = description;
        product.CategoryId = categoryId;
        product.Quantity = quantity;
        product.Price = price;
        product.UpdatedAt = new Date();

        // Handle image replacement if new images are uploaded
        const imageFields = ['croppedImage1', 'croppedImage2', 'croppedImage3'];
        console.log(req.files);

        for (const [index, field] of imageFields.entries()) {
            if (req.files[field] && req.files[field].length > 0) {
                // Only keep the last image if there are multiple uploads
                const lastImage = req.files[field][req.files[field].length - 1];
                
                // Unlink all previous images (except the last one)
                for (let i = 0; i < req.files[field].length - 1; i++) {
                    const oldImage = req.files[field][i];
                    fs.unlinkSync(path.join(__dirname, '../public/uploads', oldImage.filename));
                }
                
                // Unlink the existing image in the database if it exists
                if (product.Images[index]) {
                    fs.unlinkSync(path.join(__dirname, '../public/uploads', product.Images[index]));
                }
                
                // Replace with the last image
                product.Images[index] = lastImage.filename; // Get the filename
            }
        }

        // Save the updated product
        await product.save();
        res.json({ success: true, message: "Product updated successfully" });

    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ success: false, message: 'Server error, please try again' });
    }
};



// unlist product
const unlistProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        await Product.findByIdAndUpdate(productId, { Is_list: false });
        res.redirect('/admin/products');
    } catch (error) {
        console.log('Error unlisting product:', error.message);
        res.redirect('/admin/products');
    }
};

// list product
const listProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        await Product.findByIdAndUpdate(productId, { Is_list: true });
        res.redirect('/admin/products');
    } catch (error) {
        console.log('Error listing product:', error.message);
        res.redirect('/admin/products');
    }
};


//display categories
const categoriesLoad = async (req, res) => {
    try {
        const admin = await User.findById(req.session.user_id); // Fetch admin details if needed

        // Pagination variables
        const currentPage = parseInt(req.query.page) || 1; // Get current page, default to 1
        const itemsPerPage = 10; // Number of items per page

        // Fetch the search query
        const query = req.query.query ? req.query.query.trim() : '';

        // Create the search filter for category name
        const searchFilter = query ? { CategoryName: { $regex: query, $options: 'i' } } : {};

        // Calculate total categories and pages based on search filter
        const totalCategories = await Category.countDocuments(searchFilter);
        const totalPages = Math.ceil(totalCategories / itemsPerPage);

        // Fetch all categories for hidden input fields (if needed)
        const allCategories = await Category.find();

        // Fetch categories with pagination and search filter
        const categories = await Category.find(searchFilter)
            .skip((currentPage - 1) * itemsPerPage)
            .limit(itemsPerPage)
            .exec();

        // Count products for each category
        const categoryProductCounts = await Promise.all(
            categories.map(async (category) => {
                const productCount = await Product.countDocuments({ CategoryId: category._id });
                return { ...category.toObject(), productCount }; // Add product count to each category object
            })
        );

        // Render the categories with the product counts
        res.render("category", {
            allCategories,
            categories: categoryProductCounts,
            admin,
            currentPage,
            totalPages,
            query // Pass the query to the view for the search input
        });
    } catch (error) {
        console.error("Error loading categories:", error);
        res.status(500).send("Server Error");
    }
};

//add New category
const addCategory = async (req, res) => {
    try {
        const newCategory = req.body.CategoryName.trim(); // Get and trim the category name
        const item = await Category.findOne({ 
            CategoryName: new RegExp(`^${newCategory}$`, 'i') 
          });// Check if the category already exists

        if (item) {
            // If the category already exists, show an error message
            return res.redirect('/admin/categories');
        }

        // If the category doesn't exist, create a new one
        const category = new Category({
            CategoryName: newCategory,
            CreatedAt: new Date(),
            UpdatedAt: new Date(),
        });

        await category.save(); // Save the new category to the database

        // Redirect to the categories page after adding the category
        res.redirect('/admin/categories');
    } catch (error) {
        console.log('Error adding category:', error.message);
        res.redirect('/admin/categories');
    }
};


// unlist category
const unlistCategory = async (req, res) => {
    try {
        const categoryId = req.params.id;
        // unlist the category
        await Category.findByIdAndUpdate(categoryId, { Is_list: false });
        res.redirect('/admin/categories');
    } catch (error) {
        console.log('Error unlisting category:', error.message);
        res.redirect('/admin/categories');
    }
};

// list category
const listCategory = async (req, res) => {
    try {
        const categoryId = req.params.id;
        // Find the category by ID and update the `Is_list` field to `true`
        await Category.findByIdAndUpdate(categoryId, { Is_list: true });
        res.redirect('/admin/categories');
    } catch (error) {
        console.log('Error listing category:', error.message);
        res.redirect('/admin/categories');
    }
};

// Edit category
const editCategory = async (req, res) => {
    try {
        const categoryId = req.params.id;
        const newName = req.body.CategoryName;
        await Category.findByIdAndUpdate(categoryId,{CategoryName:newName,UpdatedAt:Date.now()});
        res.redirect('/admin/categories');
    } catch (error) {
        console.log('Error listing category:', error.message);
        res.redirect('/admin/categories');
    }
};

const ordersLoad = async (req, res) => {
    try {
        const admin = await User.findById(req.session.user_id); // Fetch admin details if needed

        // Pagination variables
        const currentPage = parseInt(req.query.page) || 1; // Get current page, default to 1
        const itemsPerPage = 10; // Number of items per page

        // Get the filter option from the query
        const filterOption = req.query.filter;
        let query = {}; // Initialize the query object

        // Determine the query based on the selected filter option
        if (filterOption) {
            if (filterOption === "New") {
                query = {}; // Fetch all orders for "New" (recently placed orders)
            } else if (filterOption === "Rejected" || filterOption === "Requested") {
                query["ReturnRequest.status"] = filterOption; // Find orders with return requests
            } else if (filterOption === "Cancelled"){
                query = {
                    $or: [
                        { "Products.ProductStatus": "Cancelled" },
                        { "Status": "Cancelled" }
                    ]
                };
            }else {
                query["Status"] = filterOption; // For regular order statuses
            }
        }

        // Calculate total orders and pages after applying filter
        const totalOrders = await Order.countDocuments(query);
        const totalPages = Math.ceil(totalOrders / itemsPerPage);

        // Fetch orders with pagination and filtering
        const orders = await Order.find(query)
            .skip((currentPage - 1) * itemsPerPage)
            .limit(itemsPerPage)
            .sort({ createdAt: -1 }) // Sort by createdAt for "New" orders
            .populate({
                path: 'Products.ProductId',
                select: 'Name Images' // Select only the fields you need
            })
            .exec();

        // Render the orders with pagination and filtering
        res.render("orders.ejs", {
            orders,
            admin,
            currentPage,
            totalPages: totalPages > 1 ? totalPages : 0, // Show pagination only if there are multiple pages
            filterOption // Send the selected filter option to the template
        });
    } catch (error) {
        console.error("Error loading orders:", error);
        res.status(500).send("Server Error");
    }
};

const cancelOrder = async (req,res)=>{
    try {
        const orderId = req.params.orderId;
        const { selectedProducts } = req.body; // Only the selected products
        console.log(selectedProducts);
        
        const order = await Order.findById(orderId).populate('Products.ProductId');
        if (!order) {
            return res.redirect('/admin/orders?error=Order not found');
        }

        let wallet = await Wallet.findOne({ UserId: order.UserId });
        if (!wallet) {
            wallet = await Wallet.create({
                UserId: order.UserId,
                Balance: 0,
                Transactions: []
            });
        }

        if (selectedProducts && selectedProducts.length > 0) {
            const productsToCancel = Array.isArray(selectedProducts) ? selectedProducts : [selectedProducts];
            let totalProductRefund = 0;
            let totalActualPriceReduction = 0;
            let totalWithoutDeductionReduction = 0;
            let allProductsCancelled = true;
            let discountPercentage = 0;
            // Check if an applied coupon is present
            if (order.AppliedCoupon) {
                // Fetch the coupon from the database
                const coupon = await Coupon.findOne({ CouponCode: order.AppliedCoupon });
                if (coupon) {
                    discountPercentage = coupon.DiscountPercentage;
                }
            }
            // Update each selected product's status to "Cancelled"
            await Promise.all(productsToCancel.map(async (productId) => {
                const productInOrder = order.Products.find(p => p.ProductId._id.toString() === productId); // Ensure _id is accessed correctly
                if (productInOrder && productInOrder.ProductStatus === 'Placed') {
                    productInOrder.ProductStatus = 'Cancelled';

                    // (price after Coupon)
                    // Calculate the refund considering the discount
                    const productTotal = productInOrder.Price * productInOrder.Quantity;
                    let refundAmount = productTotal;

                    if (discountPercentage > 0) {
                        // Calculate the discount only if the discount percentage is greater than 0
                        refundAmount = productTotal - (productTotal * (discountPercentage / 100));
                    }

                    totalProductRefund += refundAmount;

                    //  (price after offer)
                    totalActualPriceReduction += productInOrder.Price * productInOrder.Quantity;

                    // (original price)
                    totalWithoutDeductionReduction += productInOrder.PriceWithoutOffer * productInOrder.Quantity;

                    // Return product quantity to stock
                    const product = await Product.findById(productInOrder.ProductId._id);
                    if (product) {
                        product.Quantity += productInOrder.Quantity;
                        await product.save();
                    }
                }
            }));

            // Adjust order amounts based on cancellations
            order.ActualTotalPrice -= totalActualPriceReduction; // Reduce ActualTotalPrice
            order.TotalPrice -= totalProductRefund; // Reduce TotalPrice
            order.PriceWithoutDedection -= totalWithoutDeductionReduction; // Reduce PriceWithoutDeduction

            // Check if all products have been cancelled
            order.Products.forEach(product => {
                if (product.ProductStatus !== 'Cancelled') {
                    allProductsCancelled = false;
                }
            });

            if (allProductsCancelled) {
                if (order.PaymentMethod !== 'Cash On Delivery' && order.PaymentStatus === 'Paid') {
                    // Add the refund amount to the user's wallet
                    wallet.Balance += totalProductRefund+50;
                    wallet.Transactions.push({
                        Type: 'Cancelled Order',
                        Amount: totalProductRefund+50,
                        Date: new Date()
                    });
                    await wallet.save(); // Save updated wallet
                }  
                order.TotalPrice = order.ReferencePrice.TotalPrice;
                order.ActualTotalPrice = order.ReferencePrice.ActualTotalPrice;
                order.PriceWithoutDedection = order.ReferencePrice.PriceWithoutDeduction;
                order.Status = 'Cancelled';
                
            }
            await order.save();

            // Add the partial product refund to the user's wallet
            if (totalProductRefund > 0 && !allProductsCancelled) {
                wallet.Balance += totalProductRefund;
                wallet.Transactions.push({
                    Type: 'Cancelled Products',
                    Amount: totalProductRefund,
                    Date: new Date()
                });
                await wallet.save(); // Save the updated wallet
            }

            return res.redirect('/admin/orders?success=Selected products cancelled successfully');
        }
        return res.redirect('/admin/orders?error=No products selected for cancellation');
    } catch (error) {
        console.error('Error cancelling order:', error);
        return res.redirect('/admin/orders?error=Could not cancel the order');
    }
}

const statusChangeOrder = async (req,res)=>{
    try {
        const { orderId } = req.params;
        const newStatus = req.body.status; // Assuming you're sending the status in the request body
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).send('Order not found');
        }

        // Check if status is being updated to 'Placed' and the status was not already 'Placed'
        if (newStatus === 'Placed' && order.Status !== 'Placed') {
            order.PaymentStatus = 'Paid';
            order.PlacedAt = new Date(); // Set PlacedAt only when status changes to 'Placed'
        }

        // Update the order status
        order.Status = newStatus;
        await order.save();

        res.redirect('/admin/orders'); // Redirect to the orders page after update
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
}

module.exports = {
    loadLogin,
    varifyLogin,
    logout,
    adminUsers,
    unblockUser,
    blockUser,
    productsLoad,
    addProductLoadPage,
    addProduct,
    editProductLoadPage,
    editProduct,
    unlistProduct,
    listProduct,
    categoriesLoad,
    listCategory,
    unlistCategory,
    addCategory,
    editCategory,
    ordersLoad,
    cancelOrder,
    statusChangeOrder,
}