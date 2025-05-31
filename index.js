import express from "express";
import nodemailer from "nodemailer";
import cors from "cors";
import path from "path";

const app = express();
app.use(cors());
app.use(express.json());

app.post("/genereaza-pdf", async (req, res) => {
  try {
    const { prenume, nume, email } = req.body;

    const normalize = (str) =>
      str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_-]/g, "");

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
      text: "Găsești atașat documentul cu numerograma completă.",
      attachments: [
        {
          filename: `${prenumeSafe}_${numeSafe}_numerograma.pdf`,
          path: path.join("templates", "Structura Numerograma editabila.pdf") // dacă l-ai pus în altă parte, modifici aici
        }
      ]
    });

    res.send({ success: true, message: "PDF trimis pe email cu succes!" });
  } catch (err) {
    console.error("Eroare generală:", err);
    res.status(500).send("Eroare la trimiterea emailului");
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Serverul rulează pe portul ${PORT}`));
