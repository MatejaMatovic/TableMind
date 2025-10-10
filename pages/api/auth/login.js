// ✅ pages/api/auth/login.js — stabilna verzija
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    await connectDB();

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email i lozinka su obavezni." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "Nalog ne postoji." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Pogrešna lozinka." });
    }

    // ✅ Sve OK — vraćamo JSON
    return res.status(200).json({
      success: true,
      message: "Uspešna prijava",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("🔥 Login API error:", err);
    // 🧩 Ključno: eksplicitno vrati JSON, nikako plain text!
    return res
      .status(500)
      .json({ success: false, error: "Internal Server Error" });
  }
}
