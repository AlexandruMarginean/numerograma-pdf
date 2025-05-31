import "dotenv/config";
import express from "express";
import nodemailer from "nodemailer";
import cors from "cors";
import fs from "fs";
import path from "path";
import CloudConvert from "cloudconvert";
import fetch from "node-fetch";

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
    const { prenume, nume, email } = req.body;
    console.log("📥 Request primit pentru:", prenume, nume, email);

    const prenumeSafe = normalize(prenume);
    const numeSafe = normalize(nume);

    const inputPath = path.join("templates", "Structura Numerograma editabila.docx");
    const outputFolder = path.join("output");
    const outputPath = path.join(outputFolder, `${numeSafe}_${prenumeSafe}.pdf`);

    if (!fs.existsSync(inputPath)) {
      console.error("❌ Fișierul .docx nu există:", inputPath);
      return res.status(500).send("Fișierul .docx nu a fost găsit.");
    }

    if (!fs.existsSync(outputFolder)) {
      fs.mkdirSync(outputFolder, { recursive: true });
    }

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
    const inputFile = fs.createReadStream(inputPath);
    await cloudConvert.tasks.upload(uploadTask, inputFile);

    const completedJob = await cloudConvert.jobs.wait(job.id);
    const exportTask = completedJob.tasks.find((task) => task.operation === "export/url");
    const file = exportTask.result.files[0];

    console.log("📎 Fișier PDF exportat:", file.url);

    const response = await fetch(file.url);
    const buffer = await response.arrayBuffer();
    fs.writeFileSync(outputPath, Buffer.from(buffer));

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
          path: outputPath,
        },
      ],
    });

    console.log("✅ Email trimis cu succes!");
    res.send({ success: true, message: "PDF convertit și trimis cu succes!" });
  } catch (err) {
    console.error("❌ Eroare generală:", err);
    res.status(500).send("Eroare la generarea PDF-ului");
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`✅ Serverul rulează pe portul ${PORT}`));
