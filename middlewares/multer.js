import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(__dirname,"../uploads");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
    
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname)

    );
  },
});

const upload = multer({ limits: { fileSize: 50 * 1024 * 1024 }, storage });

// Single file upload for avatar
const uploadAvatar = upload.single("avatar");

// Multiple file uploads (max 5 attachments)
const uploadAttachments = upload.array("attachments", 5);

export { uploadAvatar, uploadAttachments };




// import multer from "multer";

// const multerUpload = multer({
//   limits: { fileSize: 1024 * 1024 * 5 }, // 5MB limit
// });

// // Middlewares for different upload types
// const singleAvatar = multerUpload.single("avatar"); // For single avatar upload
// const attachmentsMulter = multerUpload.array("files", 5); // For multiple file uploads

// export { singleAvatar, attachmentsMulter };
