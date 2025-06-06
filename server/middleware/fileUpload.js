import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Create temp directory if it doesn't exist
const tempDir = './temp';
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Configure multer for PDF uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, tempDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'upload-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter to accept only PDFs
const fileFilter = (req, file, cb) => {
  console.log('📄 [FileUpload] Processing file:', file.originalname);
  
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed!'), false);
  }
};

// Configure upload limits
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1 // Only one file at a time
  }
});

// Cleanup function to remove old temp files
export const cleanupTempFiles = () => {
  const tempDir = './temp';
  if (!fs.existsSync(tempDir)) return;

  fs.readdir(tempDir, (err, files) => {
    if (err) {
      console.error('❌ [FileUpload] Error reading temp directory:', err);
      return;
    }

    const now = Date.now();
    const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds

    files.forEach(file => {
      const filePath = path.join(tempDir, file);
      fs.stat(filePath, (err, stats) => {
        if (err) return;
        
        // Delete files older than 1 hour
        if (now - stats.mtime.getTime() > oneHour) {
          fs.unlink(filePath, (err) => {
            if (err) {
              console.error('❌ [FileUpload] Error deleting temp file:', err);
            } else {
              console.log('🗑️ [FileUpload] Cleaned up temp file:', file);
            }
          });
        }
      });
    });
  });
};

// Schedule cleanup every 30 minutes
setInterval(cleanupTempFiles, 30 * 60 * 1000);

export default upload; 