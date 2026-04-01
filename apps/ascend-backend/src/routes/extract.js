import { Router } from 'express';
import multer from 'multer';
import mammoth from 'mammoth';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

// Extract text from uploaded file (PDF, DOCX, TXT, MD)
router.post('/', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filename = file.originalname.toLowerCase();
    let text = '';

    if (filename.endsWith('.pdf')) {
      // Extract text from PDF using pdf-parse v2 API
      const { PDFParse } = require('pdf-parse');
      const parser = new PDFParse({ data: file.buffer });
      const result = await parser.getText();
      text = result.text;
    } else if (filename.endsWith('.docx')) {
      // Extract text from DOCX
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      text = result.value;
    } else if (filename.endsWith('.txt') || filename.endsWith('.md')) {
      // Plain text files
      text = file.buffer.toString('utf-8');
    } else {
      return res.status(400).json({ error: 'Unsupported file type. Please upload PDF, DOCX, TXT, or MD files.' });
    }

    res.json({ text: text.trim() });
  } catch (error) {
    console.error('[Extract] Error:', error);
    res.status(500).json({ error: 'Failed to extract text from file: ' + error.message });
  }
});

export default router;
