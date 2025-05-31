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

// Asigură-te că există folderul output
if (!fs.existsSync("output")) {
  fs.mkdirSync("output");
}

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

    const normalize = (str) =>
      str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_-]/g, "");

    const prenumeSafe = normalize(prenume);
    const numeSafe = normalize(nume);

    const templatePath = path.join("templates", "Structura Numerograma editabila.docx");
    const content = fs.readFileSync(templatePath, "binary");
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

    doc.setData({
      prenume, nume, dataNasterii,
      C1, C2, C3, C4, C5, C6, C7, C8, C9,
      MI, ME, DESTIN, TEXT_DESTIN,
      TEXT_KARMA_PERSONALA, NUME_KARMA_PERSONALA,
      TEXT_KARMA_NEAM, TEXT_SOLUTIE_KARMA_NEAM,
      NUME_EGREGOR, TEXT_EGREGOR
    });

    doc.render();
    const buffer = doc.getZip().generate({ type: "nodebuffer" });

    const docxPath = `output/${numeSafe}_${prenumeSafe}.docx`;
    const pdfPath = `output/${numeSafe}_${prenumeSafe}.pdf`;

    fs.writeFileSync(docxPath, buffer);

    const pdfBuf = await new Promise((resolve, reject) => {
      libre.convert(buffer, ".pdf", undefined, (err, done) => {
        if (err) reject(err);
        else resolve(done);
      });
    });
    fs.writeFileSync(pdfPath, pdfBuf);

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "drumuleroului@gmail.com",
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: "drumuleroului@gmail.com",
      to: email,
      subject: `Numerograma ta, ${prenume}`,
      text: "Găsești atașat documentul cu numerograma completă.",
      attachments: [{ filename: `${prenumeSafe}_${numeSafe}.pdf`, path: pdfPath }],
    });

    res.send({ success: true, message: "Document trimis pe email cu succes!" });
  } catch (err) {
    console.error(err);
    res.status(500).send("Eroare la generarea documentului");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Serverul rulează pe portul ${PORT}`));
