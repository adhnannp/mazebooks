const User = require("../models/userModel");
const bcrypt = require("bcrypt");
const Product = require("../models/productModel");
const Category = require("../models/categoryModel");


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

const addProduct = async (req, res) => {
    try {
        // Extract file paths
        const imageUrls = req.files.map(file => `${file.filename}`); // Adjust path to reflect the public folder

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
        res.redirect('/admin/products');
    } catch (error) {
        console.error('Error adding product:', error);
        res.status(500).send('Server Error');
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
        // Render the categories or send them as a response
        res.render("category", {
            categories,
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
        const item = await Category.findOne({ CategoryName: newCategory }); // Check if the category already exists

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


module.exports = {
    loadLogin,
    varifyLogin,
    loadAdminHome,
    logout,
    adminUsers,
    unblockUser,
    blockUser,
    productsLoad,
    addProduct,
    unlistProduct,
    listProduct,
    categoriesLoad,
    listCategory,
    unlistCategory,
    addCategory,
    editCategory,
}