
import express from "express";
import fileUpload from "express-fileupload";
import fs from "fs";
import path from "path";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import libre from "libreoffice-convert";
import nodemailer from "nodemailer";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());
app.use(fileUpload());

app.post("/genereaza-pdf", async (req, res) => {
  try {
    const {
      prenume, nume, dataNasterii, email,
      C1, C2, C3, C4, C5, C6, C7, C8, C9,
      MI, ME, DESTIN, TEXT_DESTIN,
      TEXT_KARMA_PERSONALA, NUME_KARMA_PERSONALA,
      TEXT_KARMA_NEAM, TEXT_SOLUTIE_KARMA_NEAM,
      NUME_EGREGOR, TEXT_EGREGOR
    } = req.body;

    const templatePath = path.join("templates", "Structura Numerograma editabila.docx");
    const content = fs.readFileSync(templatePath, "binary");
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

    doc.setData(req.body);
    doc.render();
    const buf = doc.getZip().generate({ type: "nodebuffer" });

    const docxPath = `output/${nume}_${prenume}.docx`;
    fs.writeFileSync(docxPath, buf);

    const pdfPath = `output/${nume}_${prenume}.pdf`;
    const pdfBuf = await new Promise((resolve, reject) => {
      libre.convert(buf, ".pdf", undefined, (err, done) => {
        if (err) reject(err);
        else resolve(done);
      });
    });
    fs.writeFileSync(pdfPath, pdfBuf);

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "drumuleroului@gmail.com",
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });

    await transporter.sendMail({
      from: "drumuleroului@gmail.com",
      to: email,
      subject: `Numerograma ta, ${prenume}`,
      text: "Găsești atașat documentul cu numerograma completă.",
      attachments: [{ filename: `${prenume}_${nume}.pdf`, path: pdfPath }]
    });

    res.send({ success: true, path: pdfPath });
  } catch (err) {
    console.error(err);
    res.status(500).send("Eroare la generarea documentului");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Serverul rulează pe portul ${PORT}`));
