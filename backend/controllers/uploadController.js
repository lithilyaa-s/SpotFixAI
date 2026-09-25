const path = require("path");
const fs = require("fs");
const cloudinary = require("../config/cloudinary");

const saveImageLocally = (file, req) => {
  const uploadsDir = path.join(__dirname, "../uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const ext = path.extname(file.originalname) || ".jpg";
  const filename = `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}${ext}`;
  const filePath = path.join(uploadsDir, filename);

  fs.writeFileSync(filePath, file.buffer);

  const protocol = req.protocol;
  const host = req.get("host");
  return `${protocol}://${host}/uploads/${filename}`;
};

const handleImageUpload = async (file, folder, req) => {
  if (
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_CLOUD_NAME !== "your_cloud_name" &&
    process.env.CLOUDINARY_API_KEY
  ) {
    try {
      const base64Image = `data:${file.mimetype};base64,${file.buffer.toString(
        "base64"
      )}`;
      const result = await cloudinary.uploader.upload(base64Image, {
        folder,
        resource_type: "image",
      });
      return { imageUrl: result.secure_url, publicId: result.public_id };
    } catch (cloudErr) {
      console.warn(
        "⚠️ Cloudinary upload failed, using local storage fallback:",
        cloudErr.message
      );
    }
  }

  const localUrl = saveImageLocally(file, req);
  return { imageUrl: localUrl, publicId: "local" };
};

const uploadImage = async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400);
      throw new Error("No image file uploaded.");
    }

    const { imageUrl, publicId } = await handleImageUpload(
      req.file,
      "civicfix-ai/complaints",
      req
    );

    return res.status(200).json({
      success: true,
      message: "Image uploaded successfully.",
      imageUrl,
      publicId,
    });
  } catch (error) {
    next(error);
  }
};

const uploadProfileImage = async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400);
      throw new Error("No profile image uploaded.");
    }

    const { imageUrl } = await handleImageUpload(
      req.file,
      "civicfix-ai/profile-images",
      req
    );

    req.user.profileImage = imageUrl;
    await req.user.save();

    return res.status(200).json({
      success: true,
      message: "Profile image updated successfully.",
      imageUrl,
      user: req.user.getPublicProfile(),
    });
  } catch (error) {
    next(error);
  }
};

const removeProfileImage = async (req, res, next) => {
  try {
    req.user.profileImage = "";
    await req.user.save();

    return res.status(200).json({
      success: true,
      message: "Profile image removed successfully.",
      user: req.user.getPublicProfile(),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadImage,
  uploadProfileImage,
  removeProfileImage,
};