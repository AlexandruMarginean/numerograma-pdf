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

const normalize = (str = "") =>
  str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]/g, "");

// ======================= /pregateste-livrare =======================

app.post("/pregateste-livrare", async (req, res) => {
  try {
    const {
      prenume, nume, email, dataNasterii, cifraDestin,
      c1, c2, c3, c4, c5, c6, c7, c8, c9,
      varstaCurenta, vibratieInterioara, vibratieExterioara,
      anPersonal, caleaDestinului, ciclu9Ani, cifraGlobala,
      karmaNeam, karmaPersonala, egregor, gen,
      paymentId, produs, trimiteFactura,
      textVibratieInterioara, textKarmaPersonala, textVibratieExterioara,
      numeEgregor, textEgregor, textSolutieKarmaNeam,
      textDestin, textCaleaDestinului, textCifraGlobala,
      manifestareInterioara, manifestareExterioara,
      textDistributieMasculin, textDistributieFeminina,
      textColeric, textSangvinic, textFlegmatic, textMelancolic,
      textVectorRational, textVectorRelational, textVectorInstinctual,
      textCiclu9Ani, textAnPersonal,
      textStructuraPsihica, textStructuraEmotionala, textInformatii,
      textMobilizare, textRationament, textScop,
      textSpiritualitate, textResponsabilitate, textIQ
    } = req.body;

    console.log("📨 /pregateste-livrare: payload primit:", {
      prenume,
      nume,
      email,
      dataNasterii,
      gen,
    });

    const prenumeSafe = normalize(prenume || "Prenume");
    const numeSafe = normalize(nume || "Nume");

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
      dataNasterii: new Date(dataNasterii).toLocaleDateString("ro-RO", {
        day: "numeric",
        month: "numeric",
        year: "numeric"
      }),
      vibratieInterioara,
      textVibratieInterioara: textVibratieInterioara || "-",
      nrKarmaPersonala: karmaPersonala,
      textKarmaPersonala: textKarmaPersonala || "-",
      vibratieExterioara,
      textVibratieExterioara: textVibratieExterioara || "-",
      numeEgregor: numeEgregor || "-",
      textEgregor: textEgregor || "-",
      nrKarmaNeam: karmaNeam,
      textKarmaNeam: req.body.textKarmaNeam || "-",
      textSolutieKarmaNeam: textSolutieKarmaNeam || "-",
      varstaCurenta,
      destin: cifraDestin,
      textDestin: textDestin || "-",
      caleaDestinului,
      textCaleaDestinului: textCaleaDestinului || "-",
      cifraGlobala,
      textCifraGlobala: textCifraGlobala || "-",
      manifestareInterioara: manifestareInterioara || "-",
      manifestareExterioara: manifestareExterioara || "-",
      textDistributieMasculin: textDistributieMasculin || "-",
      textDistributieFeminina: textDistributieFeminina || "-",
      textColeric: textColeric || "-",
      textSangvinic: textSangvinic || "-",
      textFlegmatic: textFlegmatic || "-",
      textMelancolic: textMelancolic || "-",
      textVectorRational: textVectorRational || "-",
      textVectorRelational: textVectorRelational || "-",
      textVectorInstinctual: textVectorInstinctual || "-",
      ciclu9Ani,
      textCiclu9Ani: textCiclu9Ani || "-",
      anPersonal,
      textAnPersonal: textAnPersonal || "-",
      C1: c1, C2: c2, C3: c3, C4: c4, C5: c5, C6: c6, C7: c7, C8: c8, C9: c9,
      textStructuraPsihica: textStructuraPsihica || "-",
      textStructuraEmotionala: textStructuraEmotionala || "-",
      textInformatii: textInformatii || "-",
      textMobilizare: textMobilizare || "-",
      textRationament: textRationament || "-",
      textScop: textScop || "-",
      textSpiritualitate: textSpiritualitate || "-",
      textResponsabilitate: textResponsabilitate || "-",
      textIQ: textIQ || "-"
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

// ======================= /pregateste-livrare-cu-paymentId =======================

app.post("/pregateste-livrare-cu-paymentId", async (req, res) => {
  try {
    const { paymentId, gen } = req.body;

    if (!paymentId || !gen) {
      return res.status(400).json({ error: "Lipsesc paymentId sau gen" });
    }

    const wixFunctionUrl = "https://www.alexandrumagician.ro/_functions-dev/comenziNumerograme";

    const comandaResp = await fetch(wixFunctionUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId }),
    });

    if (!comandaResp.ok) {
      const errText = await comandaResp.text();
      console.error("❌ Eroare la fetch comanda:", errText);
      return res.status(500).send("Nu pot obține comanda din Wix");
    }

    const comanda = await comandaResp.json();

    const livrareResp = await fetch("https://numerograma-pdf-production.up.railway.app/pregateste-livrare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...comanda,
        gen,
        trimiteFactura: comanda.trimiteFactura || comanda.email
      }),
    });

    if (!livrareResp.ok) {
      const errText = await livrareResp.text();
      console.error("❌ Eroare la generarea PDF:", errText);
      return res.status(500).send("Eroare la generarea PDF-ului");
    }

    const rezultat = await livrareResp.json();
    console.log("✅ Livrare finalizată:", rezultat.message);
    res.json(rezultat);

  } catch (err) {
    console.error("❌ Eroare generală la livrare:", err);
    res.status(500).send("Eroare la livrarea numerogramei");
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`✅ Serverul rulează pe portul ${PORT}`));
