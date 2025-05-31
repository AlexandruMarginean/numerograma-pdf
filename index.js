import express from "express";
import nodemailer from "nodemailer";
import cors from "cors";
import path from "path";
import fs from "fs";

const app = express();
app.use(cors());
app.use(express.json());

const normalize = (str) =>
  str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_-]/g, "");

app.post("/genereaza-pdf", async (req, res) => {
  try {
    const { prenume, nume, email } = req.body;

    const prenumeSafe = normalize(prenume);
    const numeSafe = normalize(nume);

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
      text: `Găsești atașat documentul cu numerograma completă.

Poți descărca fișierul și de aici:
https://numerograma-pdf-production-865e.up.railway.app/descarca-pdf/${prenumeSafe}/${numeSafe}
`,
      attachments: [
        {
          filename: `${prenumeSafe}_${numeSafe}_numerograma.pdf`,
          path: path.join("templates", "Structura Numerograma editabila.pdf") // ajustează dacă e în alt folder
        }
      ]
    });

    res.send({ success: true, message: "PDF trimis pe email cu succes!" });
  } catch (err) {
    console.error("Eroare generală:", err);
    res.status(500).send("Eroare la trimiterea emailului");
  }
});

// 🔽 Ruta nouă pentru descărcare PDF
app.get("/descarca-pdf/:prenume/:nume", (req, res) => {
  const prenumeSafe = normalize(req.params.prenume);
  const numeSafe = normalize(req.params.nume);
  const filePath = path.join("output", `${numeSafe}_${prenumeSafe}.pdf`);

  if (fs.existsSync(filePath)) {
    res.download(filePath, `${prenumeSafe}_${numeSafe}_numerograma.pdf`);
  } else {
    res.status(404).send("Fișierul PDF nu a fost găsit.");
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Serverul rulează pe portul ${PORT}`));
