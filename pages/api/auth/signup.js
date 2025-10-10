// ✅ pages/api/auth/signup.js
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";

export default async function handler(req, res) {
  // Dozvoli samo POST
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    // ✅ Poveži se sa bazom
    await connectDB();

    // ✅ Sigurno parsiranje body-a
    const { name, email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ success: false, error: "Email i lozinka su obavezni." });
    }

    // ✅ Proveri da li korisnik postoji
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, error: "Korisnik već postoji." });
    }

    // ✅ Hesiraj lozinku
    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ Kreiraj novog korisnika
    const newUser = await User.create({
      name: name || "Novi korisnik",
      email,
      password: hashedPassword,
    });

    // ✅ Vrati JSON odgovor
    return res.status(201).json({
      success: true,
      message: "Registracija uspešna!",
      user: { id: newUser._id, name: newUser.name, email: newUser.email },
    });
  } catch (error) {
    console.error("❌ Signup API error:", error);

    // Uvek vraćaj JSON — i ako ima grešku
    return res.status(500).json({
      success: false,
      error: error.message || "Došlo je do greške na serveru.",
    });
  }
}
