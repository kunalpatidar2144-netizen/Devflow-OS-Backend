import multer from "multer";

const allowedMimeTypes = new Set([
  "application/pdf",
]);

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB per file
    files: 10,
  },

  fileFilter: (_req, file, callback) => {
    const isAllowed =
      allowedMimeTypes.has(file.mimetype) ||
      file.mimetype.startsWith("image/") ||
      file.mimetype.startsWith("video/");

    if (!isAllowed) {
      return callback(
        new Error(
          "Only PDF, image, and video attachments are allowed."
        )
      );
    }

    callback(null, true);
  },
});

export default upload;