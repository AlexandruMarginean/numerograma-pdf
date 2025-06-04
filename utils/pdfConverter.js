import libre from 'libreoffice-convert';
import fs from 'fs/promises';

export async function convertDocxToPdf(inputPath, outputPath) {
  const docxBuf = await fs.readFile(inputPath);

  return new Promise((resolve, reject) => {
    libre.convert(docxBuf, '.pdf', undefined, async (err, done) => {
      if (err) return reject(err);
      await fs.writeFile(outputPath, done);
      resolve(outputPath);
    });
  });
}
