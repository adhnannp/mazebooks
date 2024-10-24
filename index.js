require('dotenv').config();
const path = require('path');
const mongoose = require('mongoose');
mongoose.connect(process.env.DB_URI)
const express= require('express');
const session = require('express-session');
const morgan = require('morgan');
const config = require("./config/config");

//set port
const PORT = 3000;
const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views/errorPages'));

//cache controle
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});
// Serving static files.
app.use("/static", express.static(path.join(__dirname, "public")));


// session middlewares
app.use(session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false
}));

// Use Morgan middleware
app.use(morgan('common')); // You can replace 'combined' with other formats like 'dev', 'common', etc.


//for user route
const userRoute = require('./routes/userRoute')
app.use('/',userRoute);

// for Admin route
const adminRoute = require('./routes/adminRoute')
app.use('/admin',adminRoute);

//500 error handling function
app.use((err, req, res, next) => {
  if (req.originalUrl.startsWith('/admin')) {
    // Admin error handling
    console.error('Admin Error:', err.stack);
    return res.status(500).render('admin-error-500', { error: err.message }); 
  } else {
    // User error handling
    console.error('User Error:', err.stack);
    return res.status(500).render('user-error-500', { error: err.message }); 
  }
});

// 404 Error handling for Admin and User
app.use((req, res, next) => {
  if (req.originalUrl.startsWith('/admin')) {
    // Render admin 404 page
    return res.status(404).render('admin-error-404'); 
  } else {
    // Render user 404 page
    return res.status(404).render('user-error-404');
  }
});


//interal error handling function
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('internalServerError');
});


app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});