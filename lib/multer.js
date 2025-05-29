import multer from "multer";

const storage = multer.memoryStorage(); // ✅ Store file in memory for Cloudinary
export const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // ✅ Limit 5MB
});