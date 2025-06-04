import express from 'express';
import path from 'path';
import { generateDocx } from '../utils/docxGenerator.js';
import { convertDocxToPdf } from '../utils/pdfConverter.js';
import { fileURLToPath } from 'url';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

router.post('/', async (req, res) => {
  const { prenume, nume, dataNasterii } = req.body;

  const docxPath = path.join(__dirname, '../output/numerograma.docx');
  const pdfPath = path.join(__dirname, '../output/numerograma.pdf');
  const templatePath = path.join(__dirname, '../templates/numerograma_template.docx');

  try {
    await generateDocx(templatePath, docxPath, { prenume, nume, dataNasterii });
    await convertDocxToPdf(docxPath, pdfPath);
    res.download(pdfPath);
  } catch (err) {
    console.error("❌ Eroare:", err);
    res.status(500).send("Eroare la generarea numerogramei.");
  }
});

export { router };
