const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "profile_pictures",
    allowed_formats: ["jpg", "jpeg", "png", "webp", "gif", "JPG", "JPEG", "PNG", "WEBP", "GIF"],
  },
});

const upload = multer({ storage });

module.exports = upload;