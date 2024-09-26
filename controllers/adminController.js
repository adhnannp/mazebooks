const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const User = require("../models/userModel");
const bcrypt = require("bcrypt");
const Product = require("../models/productModel");
const Category = require("../models/categoryModel");
const Order = require("../models/orderModel");

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

const loadAdminHome = async(req,res)=>{
    try {
        const userData = await User.findById({_id:req.session.user_id});
        res.render('index',{admin:userData})
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
        // Find the currently logged-in admin
        const admin = await User.findById(req.session.user_id);

        const currentPage = parseInt(req.query.page) || 1; // Get current page, default to 1
        const itemsPerPage = 5; // Adjust as needed
        const totalUsers = await User.countDocuments({ Is_admin: false });
        const totalPages = Math.ceil(totalUsers / itemsPerPage);
        const usersData = await User.find({ Is_admin: false })
            .skip((currentPage - 1) * itemsPerPage)
            .limit(itemsPerPage);

        res.render('users.ejs', {
            admin,
            user: usersData,
            currentPage,
            totalPages,
        });
    } catch (error) {
        console.log(error.message);
        res.redirect('/home');
    }
}

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
        const categories = await Category.find({Is_list:true});
        // Get current page, default to 1
        const currentPage = parseInt(req.query.page) || 1;
        const itemsPerPage = 5; // Number of items per page

        // Calculate total products and pages
        const totalProducts = await Product.countDocuments();
        const totalPages = Math.ceil(totalProducts / itemsPerPage);

        // Fetch products with pagination and populate category
        const products = await Product.find()
            .populate('CategoryId')
            .skip((currentPage - 1) * itemsPerPage)
            .limit(itemsPerPage)

        // Render the products or send them as a response
        res.render("products", {
            products,
            admin,
            currentPage,
            totalPages,
            categories,
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

        // Extract and validate productId
        const Id = req.params.id;
        if (!mongoose.isValidObjectId(Id)) {
            console.error(`Invalid product ID: ${Id}`);
            return res.status(400).json({ success: false, message: 'Invalid product ID' });
        }

        const existingProduct = await Product.findOne({ 
            Name: new RegExp(`^${req.body.name}$`, 'i'), 
            _id: { $ne: req.params.id }  // Exclude the product with the current ID
        });
        if (existingProduct) {
            return res.json({ success: false, message: "Product already exists" });
        }
        const productId = req.params.id;
        const { name, author, description, categoryId, quantity, price, imageToReplace } = req.body;
        
        // Find the product
        let product = await Product.findById(productId);
        if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

        // Update product fields
        product.Name = name;
        product.Author = author;
        product.Description = description;
        product.CategoryId = categoryId;
        product.Quantity = quantity;
        product.Price = price;
        product.UpdatedAt= new Date();

       // Handle image replacement
       if (req.file) {
        // Delete the existing image if it exists
        if (product.Images[0]) {
            fs.unlinkSync(path.join(__dirname, '../public/uploads', product.Images[0])); // Adjust the path as needed
        }

        // Add the new image
        const fileName = req.file.filename; // Get the filename from Multer
        product.Images[0] = fileName; // Update the image URL in the product array
        }

        // Save updated product
        await product.save();
        res.json({ success: true, message: "Product Added Successfully" });

    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ success: false, message: 'Server error,Please try again' });
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
        const itemsPerPage = 5; // Number of items per page

        // Calculate total categories and pages
        const totalCategories = await Category.countDocuments();
        const totalPages = Math.ceil(totalCategories / itemsPerPage);

        // Fetch categories with pagination
        const categories = await Category.find()
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
            categories: categoryProductCounts,
            admin,
            currentPage,
            totalPages,
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
        const itemsPerPage = 5; // Number of items per page

        // Calculate total orders and pages
        const totalOrders = await Order.countDocuments();
        const totalPages = Math.ceil(totalOrders / itemsPerPage);

        // Fetch orders with pagination
        const orders = await Order.find()
            .skip((currentPage - 1) * itemsPerPage)
            .limit(itemsPerPage)
            .sort({ createdAt: -1 })
            .populate({
                path: 'Products.ProductId',
                select: 'Name Images' // Select only the fields you need
            })
            .exec();
        // Render the orders with pagination
        res.render("orders.ejs", {
            orders,
            admin,
            currentPage,
            totalPages,
        });
    } catch (error) {
        console.error("Error loading orders:", error);
        res.status(500).send("Server Error");
    }
};

const cancelOrder = async (req,res)=>{
    try {
        const orderId = req.params.orderId;

        // Find the order by its ID
        const order = await Order.findById(orderId).populate('Products.ProductId');

        if (!order) {
            return res.status(404).send('Order not found');
        }

        // Check if the order is already canceled
        if (order.Status === 'Cancelled') {
            res.status(404).send('it is allready cancelled');
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

        // Redirect back to the order history page
        res.redirect('/orders');
    } catch (error) {
        console.error('Error cancelling order:', error);
        // Redirect back to order history with an error message if something goes wrong
        res.redirect('/orders');
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
    loadAdminHome,
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