// pages/index.js
import { useEffect } from "react";
import { useRouter } from "next/router";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Ako postoji korisnik u localStorage → automatski vodi na dashboard
    const user = JSON.parse(localStorage.getItem("user"));
    if (user && user.email) {
      router.replace("/partner/dashboard");
    } else {
      router.replace("/auth/login");
    }
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">TableMind</h1>
        <p className="text-gray-600">Učitavanje...</p>
      </div>
    </div>
  );
}
