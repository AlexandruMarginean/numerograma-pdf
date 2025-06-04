import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import fs from 'fs/promises';

export async function generateDocx(templatePath, outputPath, data) {
  const content = await fs.readFile(templatePath, 'binary');
  const zip = new PizZip(content);

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  doc.setData(data);
  doc.render();

  const buf = doc.getZip().generate({ type: 'nodebuffer' });
  await fs.writeFile(outputPath, buf);
}
