import "dotenv/config";
import express from "express";
import nodemailer from "nodemailer";
import cors from "cors";
import fs from "fs";
import path from "path";
import CloudConvert from "cloudconvert";
import fetch from "node-fetch";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { interpretariBarbat } from "./public/interpretariBarbat.js";

const app = express();
app.use(cors());
app.use(express.json());

if (!process.env.CLOUDCONVERT_API_KEY || !process.env.GMAIL_APP_PASSWORD) {
  console.error("❌ Lipsesc variabile de mediu. Verifică .env!");
  process.exit(1);
}

const cloudConvert = new CloudConvert(process.env.CLOUDCONVERT_API_KEY);

const normalize = (str) =>
  str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_-]/g, "");

app.post("/genereaza-pdf", async (req, res) => {
  try {
    const {
      prenume, nume, email, dataNasterii, cifraDestin,
      c1, c2, c3, c4, c5, c6, c7, c8, c9,
      varstaCurenta, vibratieInterioara, vibratieExterioara,
      anPersonal, caleaDestinului, ciclu9Ani, cifraGlobala,
      karmaNeam, karmaPersonala, egregor
    } = req.body;

    const prenumeSafe = normalize(prenume);
    const numeSafe = normalize(nume);

    const inputPath = path.join("templates", "Structura Numerograma editabila.docx");
    const outputFolder = path.join("output");
    const tempDocxPath = path.join(outputFolder, `${numeSafe}_${prenumeSafe}_completat.docx`);
    const outputPath = path.join(outputFolder, `${numeSafe}_${prenumeSafe}.pdf`);

    if (!fs.existsSync(inputPath)) {
      console.error("❌ Fișierul .docx nu există:", inputPath);
      return res.status(500).send("Fișierul .docx nu a fost găsit.");
    }

    if (!fs.existsSync(outputFolder)) {
      fs.mkdirSync(outputFolder, { recursive: true });
    }

    // Completează DOCX
    const content = fs.readFileSync(inputPath, "binary");
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    doc.setData({
      NUME_COMPLET: `${prenume} ${nume}`,
      DATA_NASTERII: dataNasterii,
      DESTIN: cifraDestin,
      TEXT_DESTIN: interpretariBarbat.destin?.[cifraDestin] || "-",
      C1: c1, C2: c2, C3: c3, C4: c4, C5: c5, C6: c6, C7: c7, C8: c8, C9: c9,
      VARSTA_CURENTA: varstaCurenta,
      VIBRATIE_INTERIOARA: vibratieInterioara,
      VIBRATIE_EXTERIOARA: vibratieExterioara,
      AN_PERSONAL: anPersonal,
      CALEA_DESTINULUI: caleaDestinului,
      CICLU_9_ANI: ciclu9Ani,
      CIFRA_GLOBALA: cifraGlobala,
      NR_KARMA_NEAM: karmaNeam,
      NUME_KARMA_PERSONALA: karmaPersonala,
      NUME_EGREGOR: egregor,
      TEXT_CIFRA_GLOBALA: interpretariBarbat.global?.[cifraGlobala] || "-",
      TEXT_VIBRATIE_INTERIOARA: interpretariBarbat.vibratieInterioara?.[vibratieInterioara] || "-",
      TEXT_VIBRATIE_EXTERIOARA: interpretariBarbat.vibratieExterioara?.[vibratieExterioara] || "-",
      TEXT_AN_PERSONAL: interpretariBarbat.anPersonal?.[anPersonal] || "-",
      TEXT_CALEA_DESTINULUI: interpretariBarbat.caleaDestinului?.[caleaDestinului] || "-",
      TEXT_CICLU_9_ANI: interpretariBarbat.ciclu9?.[ciclu9Ani] || "-",
      TEXT_KARMA_NEAM: interpretariBarbat.karmaNeam?.[karmaNeam] || "-",
      TEXT_SOLUTIE_KARMA_NEAM: interpretariBarbat.karmaNeamSolutie?.[karmaNeam] || "-",
      TEXT_KARMA_PERSONALA: interpretariBarbat.karmaPersonala?.[karmaPersonala] || "-",
      TEXT_EGREGOR: interpretariBarbat.egregor?.[egregor] || "-",
      TEXT_INFORMATII: interpretariBarbat.informatii || "-",
      TEXT_IQ: interpretariBarbat.iq || "-",
      TEXT_MOBILIZARE: interpretariBarbat.mobilizare || "-",
      TEXT_RATIONAMENT: interpretariBarbat.rationament || "-",
      TEXT_RESPONSABILITATE: interpretariBarbat.responsabilitate || "-",
      TEXT_SCOP: interpretariBarbat.scop || "-",
      TEXT_SPIRITUALITATE: interpretariBarbat.spiritualitate || "-",
      TEXT_STRUCTURA_PSIHICA: interpretariBarbat.structuraPsihica || "-",
      TEXT_STRUCTURA_EMOTIONALA: interpretariBarbat.structuraEmotionala || "-"
    });

    try {
      doc.render();
    } catch (error) {
      console.error("❌ Eroare la completarea .docx:", error);
      return res.status(500).send("Eroare la completarea fișierului Word.");
    }

    fs.writeFileSync(tempDocxPath, doc.getZip().generate({ type: "nodebuffer" }));

    console.log("🚀 Pornesc conversia cu CloudConvert...");

    const job = await cloudConvert.jobs.create({
      tasks: {
        upload: { operation: "import/upload" },
        convert: {
          operation: "convert",
          input: "upload",
          input_format: "docx",
          output_format: "pdf"
        },
        export: { operation: "export/url", input: "convert" },
      },
    });

    const uploadTask = job.tasks.find((task) => task.name === "upload");
    const inputFile = fs.createReadStream(tempDocxPath);
    await cloudConvert.tasks.upload(uploadTask, inputFile);

    const completedJob = await cloudConvert.jobs.wait(job.id);
    const exportTask = completedJob.tasks.find((task) => task.operation === "export/url");
    const file = exportTask.result.files[0];

    console.log("📎 Fișier PDF exportat:", file.url);

    const response = await fetch(file.url);
    const buffer = await response.arrayBuffer();
    fs.writeFileSync(outputPath, Buffer.from(buffer));

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
