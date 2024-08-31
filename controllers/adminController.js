const User = require("../models/userModel");
const bcrypt = require("bcrypt");

//hashingpassword
const securePassword = async (password)=>{
    try {
        const passwordHash = await bcrypt.hash(password,10)  
        return passwordHash; 
    } catch (error) {
        console.log(error.massage);
    }
}


//login setup
const loadLogin = async(req,res)=>{
    try {
        res.render('login')
    } catch (error) {
        console.log(error.massage);
    }
}

const varifyLogin = async(req,res)=>{
    try {
        const email = req.body.email;
        const password = req.body.password;

        const adminData = await User.findOne({email:email})
        if(adminData){
           const passwordMatch = await bcrypt.compare(password,adminData.password)
           if(passwordMatch){
            if(!adminData.is_admin){
                res.render('login',{massage:"No Admin found"});
            }else{
                req.session.is_admin = adminData.is_admin
                req.session.user_id = adminData._id;
                res.redirect('/admin/home');
            }
           }else{
            res.render('login',{massage:"incorrect email or password"});
           }
        }else{
            res.render('login',{massage:"No Admin found"})
        }

    } catch (error) {
        console.log(error.massage);
    }
}

const loadDAshboard = async(req,res)=>{
    try {
        const userData = await User.findById({_id:req.session.user_id});
        res.render('home',{admin:userData})
    } catch (error) {
        console.log(error.massage);
    }
}

const logout = async(req,res)=>{
    try {
        req.session.destroy();
        res.redirect('/admin');
    } catch (error) {
        console.log(error.massage)
        res.redirect('/home');
    }
}

const adminDashboard =  async(req,res)=>{
    try {
        const usersData = await User.find({is_admin:false})
        res.render('dashboard',{ users: usersData})
    } catch (error) {
        console.log(error.massage);
        res.redirect('/home');
    }
}

//add new user page loading
const addUserLoad = async(req,res)=>{
    try {
        res.render('new-user');
    } catch (error) {
        console.log(error.massage);
        res.redirect('/dashboard');
    }
}
//now add user

const addNewUser = async (req, res) => {
    try {
        const spassword = await securePassword(req.body.password);
        const existedEmail = await User.findOne({ email: req.body.email });
        const existedNumber = await User.findOne({ mobile: req.body.mno });

        if (existedEmail || existedNumber) {
            res.render('new-user', { massage: "Already registered. Try using another number and email." });
        } else {
            const user = new User({
                name: req.body.name,
                email: req.body.email,
                mobile: req.body.mno,
                image: req.file.filename,
                password: spassword,
                is_admin: false,
            });
            const userData = await user.save();
            if (userData) {
                res.redirect('/admin/dashboard');
            } else {
                res.render('new-user', { massage: "Your registration has failed." });
            }
        }
    } catch (error) {
        console.log(error.message);
        res.render('new-user', { massage: "An error occurred during registration." });
    }
};


//edit user functionality started
//edit user page load

const editUserLoad = async (req, res) => {
    try {
        const id = req.query.id;
        const editUserData = await User.findById({ _id: id });
        if (editUserData) {
            res.render('edit-user', { user: editUserData });
        } else {
            res.redirect('/admin/dashboard');
        }
    } catch (error) {
        console.log(error.message);
        res.redirect('/admin/dashboard');
    }
};

//post the edited request


const updateUser = async (req, res) => {
    try {
        const { id, name, email, mno } = req.body;

        // Check if the new name, email, or phone number already exist
        const userExists = await User.findOne({
            $or: [
                { name: name, _id: { $ne: id } },
                { email: email, _id: { $ne: id } },
                { mobile: mno, _id: { $ne: id } }
            ]
        });

        if (userExists) {
            // Render the form again with an error message
            res.render('edit-user', {
                user: { _id: id, name, email, mobile: mno },
                massage: 'Name, email, or phone number already exists!'
            });
        } else {
            // Update the user
            await User.findByIdAndUpdate(
                { _id: id },
                { $set: { name, email, mobile: mno } }
            );
            res.redirect('/admin/dashboard');
        }
    } catch (error) {
        console.error(error.message);
        res.status(500).render('edit-user', {
            user: { _id: req.body.id, name: req.body.name, email: req.body.email, mobile: req.body.mno },
            massage: 'Something went wrong! Please try again.'
        });
    }
};

//delete user

const deleteUser = async(req,res)=>{
    try {
        const id = req.query.id;
        await User.deleteOne({_id:id});
        res.redirect('/admin/dashboard')
    } catch (error) {
        console.log(error.massage);
    }
}


module.exports = {
    loadLogin,
    varifyLogin,
    loadDAshboard,
    logout,
    adminDashboard,
    addUserLoad,
    addNewUser,
    editUserLoad,
    updateUser,
    deleteUser
}