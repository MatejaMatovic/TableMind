import { useState } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";

export default function SignUp() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "", name: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Greška pri registraciji.");

      // Nakon registracije, vodi korisnika na login
      router.push("/auth/login");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white">
      <motion.div
        className="w-full max-w-md bg-gray-900/60 p-10 rounded-2xl shadow-2xl"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-3xl font-bold text-center mb-8">Registracija</h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          <input name="name" type="text" placeholder="Ime i prezime"
            value={form.name} onChange={handleChange} required
            className="w-full p-4 bg-gray-800 rounded-xl text-white outline-none" />
          <input name="email" type="email" placeholder="Email"
            value={form.email} onChange={handleChange} required
            className="w-full p-4 bg-gray-800 rounded-xl text-white outline-none" />
          <input name="password" type="password" placeholder="Lozinka"
            value={form.password} onChange={handleChange} required
            className="w-full p-4 bg-gray-800 rounded-xl text-white outline-none" />
          {error && <p className="text-red-400 text-center">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600">
            {loading ? "Registracija..." : "Kreiraj nalog"}
          </button>
        </form>

        <p className="text-center text-gray-400 mt-6">
          Već imaš nalog?{" "}
          <span onClick={() => router.push("/auth/login")}
            className="text-blue-400 cursor-pointer hover:underline">
            Prijavi se
          </span>
        </p>
      </motion.div>
    </div>
  );
}
