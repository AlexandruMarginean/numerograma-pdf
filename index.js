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
import { interpretariBarbat } from "./public/interpretariBarbat.js"; // 🔥 import interpretări

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
      prenume, nume, email,
      cifraDestin = 5,
      vibratieInterioara = 3,
      vibratieExterioara = 4,
      cifraGlobala = 7,
      anPersonal = 2,
      ciclu9Ani = 6,
      melancolic = 2,
      sangvinic = 3,
      coleric = 5,
      flegmatic = 1,
      masculine = 6,
      feminine = 3
    } = req.body;

    console.log("📥 Request primit pentru:", prenume, nume, email);

    const prenumeSafe = normalize(prenume);
    const numeSafe = normalize(nume);

    const inputPath = path.join("templates", "Structura Numerograma editabila.docx");
    const personalizedPath = path.join("output", `${numeSafe}_${prenumeSafe}_temp.docx`);
    const finalPDFPath = path.join("output", `${numeSafe}_${prenumeSafe}.pdf`);

    if (!fs.existsSync(inputPath)) {
      console.error("❌ Fișierul .docx nu există:", inputPath);
      return res.status(500).send("Fișierul .docx nu a fost găsit.");
    }

    if (!fs.existsSync("output")) {
      fs.mkdirSync("output", { recursive: true });
    }

    // 🔁 Încarcă șablonul și inserează datele personalizate
    const content = fs.readFileSync(inputPath, "binary");
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

    doc.setData({
      NUME_COMPLET: `${prenume} ${nume}`,
      DATA_NASTERII: "confidențială",
      DESTIN: cifraDestin,

      TEXT_DESTIN: interpretariBarbat.destin?.[cifraDestin] || "–",
      TEXT_VIBRATIE_INTERIOARA: interpretariBarbat.vibratieInterioara?.[vibratieInterioara] || "–",
      TEXT_VIBRATIE_EXTERIOARA: interpretariBarbat.vibratieExterioara?.[vibratieExterioara] || "–",
      TEXT_CIFRA_GLOBALA: interpretariBarbat.cifraGlobala?.[cifraGlobala] || "–",
      TEXT_AN_PERSONAL: interpretariBarbat.anPersonal?.[anPersonal] || "–",
      TEXT_CICLU_9_ANI: interpretariBarbat.ciclu9Ani?.[ciclu9Ani] || "–",
      TEXT_MELANCOLIC: interpretariBarbat.melancolic?.[melancolic] || "–",
      TEXT_COLERIC: interpretariBarbat.coleric?.[coleric] || "–",
      TEXT_SANGVINIC: interpretariBarbat.sangvinic?.[sangvinic] || "–",
      TEXT_FLEGMATIC: interpretariBarbat.flegmatic?.[flegmatic] || "–",
      TEXT_DISTRIBUTIE_MASCULIN: interpretariBarbat.masculine?.[masculine] || "–",
      TEXT_DISTRIBUTIE_FEMININ: interpretariBarbat.feminine?.[feminine] || "–"
    });

    try {
      doc.render();
    } catch (error) {
      console.error("❌ Eroare la completarea documentului:", error);
      return res.status(500).send("Eroare la completarea documentului");
    }

    const buf = doc.getZip().generate({ type: "nodebuffer" });
    fs.writeFileSync(personalizedPath, buf);

    console.log("🚀 Pornesc conversia cu CloudConvert...");

    const job = await cloudConvert.jobs.create({
      tasks: {
        upload: {
          operation: "import/upload",
        },
        convert: {
          operation: "convert",
          input: "upload",
          input_format: "docx",
          output_format: "pdf",
        },
        export: {
          operation: "export/url",
          input: "convert",
        },
      },
    });

    const uploadTask = job.tasks.find((task) => task.name === "upload");
    const inputFile = fs.createReadStream(personalizedPath);
    await cloudConvert.tasks.upload(uploadTask, inputFile);

    const completedJob = await cloudConvert.jobs.wait(job.id);
    const exportTask = completedJob.tasks.find((task) => task.operation === "export/url");
    const file = exportTask.result.files[0];

    console.log("📎 Fișier PDF exportat:", file.url);

    const response = await fetch(file.url);
    const buffer = await response.arrayBuffer();
    fs.writeFileSync(finalPDFPath, Buffer.from(buffer));

    console.log("✉️ Trimit email la:", email);

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
          path: finalPDFPath,
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
