const multer = require('multer');
const path = require('path');

// Configure Multer to save files to the public/uploads folder
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../public/uploads')); // Save to public/uploads
  },
  filename: function (req, file, cb) {
    cb(null, 'product_' + Date.now() + path.extname(file.originalname)); // Unique filename
  }
});

const upload = multer({ storage: storage });

module.exports = upload;
