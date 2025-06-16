import 'dotenv/config';
import express from 'express';
import nodemailer from 'nodemailer';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fetch from 'node-fetch';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import libre from 'libreoffice-convert';
import { promisify } from 'util';

const convert = promisify(libre.convert);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

if (!process.env.GMAIL_APP_PASSWORD) {
  console.error("❌ Lipsesc variabilele de email. Verifică .env!");
}

const normalize = (str) =>
  str.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9_-]/g, "");

app.post("/pregateste-livrare", async (req, res) => {
  try {
    const {
      prenume, nume, email, dataNasterii, cifraDestin,
      c1, c2, c3, c4, c5, c6, c7, c8, c9,
      varstaCurenta, vibratieInterioara, vibratieExterioara,
      anPersonal, caleaDestinului, ciclu9Ani, cifraGlobala,
      karmaNeam, karmaPersonala, egregor, gen,
      paymentId, produs, trimiteFactura
    } = req.body;

    const prenumeSafe = normalize(prenume);
    const numeSafe = normalize(nume);

    const templateFileName = gen === "femeie"
      ? "Structura_Numerograma_FEMEIE.docx"
      : "Structura_Numerograma.docx";

    const inputPath = path.join(__dirname, "templates", templateFileName);
    const outputFolder = path.join(__dirname, "output");
    const tempDocxPath = path.join(outputFolder, `${numeSafe}_${prenumeSafe}_completat.docx`);
    const outputPath = path.join(outputFolder, `${numeSafe}_${prenumeSafe}.pdf`);

    if (!fs.existsSync(inputPath)) {
      console.error("❌ Fișierul .docx nu există:", inputPath);
      return res.status(500).send("Fișierul .docx nu a fost găsit.");
    }

    if (!fs.existsSync(outputFolder)) {
      fs.mkdirSync(outputFolder, { recursive: true });
    }

    const content = fs.readFileSync(inputPath, "binary");
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    doc.setData({
      numeComplet: `${prenume} ${nume}`,
      dataNasterii,
      vibratieInterioara,
      textVibratieInterioara: req.body.textVibratieInterioara || "-",
      nrKarmaPersonala: karmaPersonala,
      textKarmaPersonala: req.body.textKarmaPersonala || "-",
      vibratieExterioara,
      textVibratieExterioara: req.body.textVibratieExterioara || "-",
      numeEgregor: req.body.numeEgregor || "-",
      textEgregor: req.body.textEgregor || "-",
      nrKarmaNeam: karmaNeam,
      textKarmaNeam: req.body.textKarmaNeam || "-",
      textSolutieKarmaNeam: req.body.textSolutieKarmaNeam || "-",
      varstaCurenta,
      destin: cifraDestin,
      textDestin: req.body.textDestin || "-",
      caleaDestinului,
      textCaleaDestinului: req.body.textCaleaDestinului || "-",
      cifraGlobala,
      textCifraGlobala: req.body.textCifraGlobala || "-",
      manifestareInterioara: req.body.manifestareInterioara || "-",
      manifestareExterioara: req.body.manifestareExterioara || "-",
      textDistributieMasculin: req.body.textDistributieMasculin || "-",
      textDistributieFeminina: req.body.textDistributieFeminina || "-",
      textColeric: req.body.textColeric || "-",
      textSangvinic: req.body.textSangvinic || "-",
      textFlegmatic: req.body.textFlegmatic || "-",
      textMelancolic: req.body.textMelancolic || "-",
      textVectorRational: req.body.textVectorRational || "-",
      textVectorRelational: req.body.textVectorRelational || "-",
      textVectorInstinctual: req.body.textVectorInstinctual || "-",
      ciclu9Ani,
      textCiclu9Ani: req.body.textCiclu9Ani || "-",
      anPersonal,
      textAnPersonal: req.body.textAnPersonal || "-",
      C1: c1, C2: c2, C3: c3, C4: c4, C5: c5, C6: c6, C7: c7, C8: c8, C9: c9,
      textStructuraPsihica: req.body.textStructuraPsihica || "-",
      textStructuraEmotionala: req.body.textStructuraEmotionala || "-",
      textInformatii: req.body.textInformatii || "-",
      textMobilizare: req.body.textMobilizare || "-",
      textRationament: req.body.textRationament || "-",
      textScop: req.body.textScop || "-",
      textSpiritualitate: req.body.textSpiritualitate || "-",
      textResponsabilitate: req.body.textResponsabilitate || "-",
      textIQ: req.body.textIQ || "-"
    });

    try {
      doc.render();
    } catch (error) {
      console.error("❌ Eroare la completarea .docx:", error);
      return res.status(500).send("Eroare la completarea fișierului Word.");
    }

    fs.writeFileSync(tempDocxPath, doc.getZip().generate({ type: "nodebuffer" }));

    try {
      const docxBuf = fs.readFileSync(tempDocxPath);
      const pdfBuf = await convert(docxBuf, '.pdf', undefined);
      fs.writeFileSync(outputPath, pdfBuf);
      console.log("✅ Conversie PDF cu LibreOffice finalizată");
    } catch (err) {
      console.error("❌ Eroare la conversia PDF:", err);
      return res.status(500).send("Eroare la conversia fișierului PDF.");
    }

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
      text: `Găsești atașat documentul PDF cu numerograma completă.`,
      attachments: [
        {
          filename: `${prenumeSafe}_${numeSafe}.pdf`,
          path: outputPath,
        },
      ],
    });

    console.log("✅ Email trimis cu succes!");
    res.send({ success: true, message: "PDF completat și trimis cu succes!" });
  } catch (err) {
    console.error("❌ Eroare generală:", err);
    res.status(500).send("Eroare la generarea PDF-ului");
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`✅ Serverul rulează pe portul ${PORT}`));
