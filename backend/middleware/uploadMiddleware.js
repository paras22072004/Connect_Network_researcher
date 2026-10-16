const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || '';
    const safeBaseName = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 30);
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${safeBaseName}-${uniqueSuffix}${ext}`);
  }
});

// File filter for image, video, audio, pdf, excel, ppt, documents, archives
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  // Block dangerous executable and script files
  const dangerousExtensions = [
    '.exe', '.bat', '.cmd', '.sh', '.msi', '.vbs', '.scr', '.jar', '.com', '.pif', '.app'
  ];
  if (dangerousExtensions.includes(ext)) {
    return cb(
      new Error('Executable and script files are not allowed for security reasons.'),
      false
    );
  }

  // Allow all common files: image, video, audio, pdf, excel, ppt, docs, txt, zip, etc.
  cb(null, true);
};

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50 MB limit
  },
  fileFilter
});

module.exports = upload;
