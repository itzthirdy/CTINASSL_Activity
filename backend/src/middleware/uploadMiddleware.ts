import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import multer from "multer";

export const SHOE_UPLOAD_DIR = path.resolve(
  import.meta.dirname,
  "../../uploads/shoes"
);

fs.mkdirSync(SHOE_UPLOAD_DIR, { recursive: true });

const ALLOWED_EXTENSIONS = new Set([".avif", ".png", ".jpg", ".jpeg", ".webp"]);
const ALLOWED_MIME_TYPES = new Set([
  "image/avif",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    fs.mkdirSync(SHOE_UPLOAD_DIR, { recursive: true });
    cb(null, SHOE_UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ALLOWED_EXTENSIONS.has(ext) ? ext : ".png";
    const token = crypto.randomBytes(6).toString("hex");
    cb(null, `shoe-${Date.now()}-${token}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 8 * 1024 * 1024, // 8 MB per angle image
    files: 6,
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext) || !ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(
        new Error(
          "Only AVIF, PNG, JPG, JPEG, or WebP shoe images are allowed."
        )
      );
      return;
    }
    cb(null, true);
  },
});

export const uploadShoeAngles = upload.fields([
  { name: "lateral", maxCount: 1 },
  { name: "pairAngle", maxCount: 1 },
  { name: "medial", maxCount: 1 },
  { name: "topDown", maxCount: 1 },
  { name: "outsole", maxCount: 1 },
  { name: "heel", maxCount: 1 },
]);

