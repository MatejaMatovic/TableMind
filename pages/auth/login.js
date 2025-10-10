// pages/auth/login.js
import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link"; // ✅ Ispravno importovan Link

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Greška prilikom prijave.");

      localStorage.setItem("userEmail", form.email);
      router.push("/partner/welcome");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800">
      <div className="bg-gray-900 p-10 rounded-2xl shadow-2xl w-full max-w-md border border-gray-800">
        <h1 className="text-3xl font-bold text-center text-white mb-6">
          Dobrodošli nazad 👋
        </h1>
        <p className="text-gray-400 text-center mb-6">
          Prijavite se u svoj TableMind nalog
        </p>

        {error && (
          <p className="text-red-500 text-center bg-red-900/20 py-2 rounded-md mb-4">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-gray-300 text-sm">Email</label>
            <input
              type="email"
              name="email"
              required
              onChange={handleChange}
              className="w-full mt-1 px-4 py-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-600 transition"
            />
          </div>

          <div>
            <label className="text-gray-300 text-sm">Lozinka</label>
            <input
              type="password"
              name="password"
              required
              onChange={handleChange}
              className="w-full mt-1 px-4 py-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-600 transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Prijavljivanje..." : "Prijavi se"}
          </button>
        </form>

        <p className="text-gray-400 text-center mt-6 text-sm">
          Nemaš nalog?{" "}
          <Link href="/auth/signup" className="text-blue-500 hover:underline">
            Registruj se
          </Link>
        </p>
      </div>
    </div>
  );
}
