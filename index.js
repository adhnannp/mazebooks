require('dotenv').config();
const path = require('path');
const mongoose = require('mongoose');
mongoose.connect(process.env.DB_URI)
const express= require('express');
const session = require('express-session');
const config = require("./config/config");

//set port
const PORT = 3000;
const app = express();

//cache controle
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});
//Serving static files.
app.use("/static", express.static(path.join(__dirname, "public")));


// middlewares
app.use(session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false
}));

//for user route
const userRoute = require('./routes/userRoute')
app.use('/',userRoute);

// for Admin route
// const adminRoute = require('./routes/adminRoute')
// app.use('/admin',adminRoute);

//error handling function
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});


app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});