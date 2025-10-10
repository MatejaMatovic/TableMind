import { useEffect } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";

export default function Welcome() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/partner/setup");
    }, 4000); // 4 sekunde pa automatski prelaz na setup
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen overflow-hidden bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white">
      {/* 🎨 Pozadinski efekti */}
      <motion.div
        className="absolute w-72 h-72 bg-blue-600/20 rounded-full blur-3xl top-10 left-10"
        animate={{ x: [0, 50, 0], y: [0, -50, 0] }}
        transition={{ repeat: Infinity, duration: 12 }}
      />
      <motion.div
        className="absolute w-96 h-96 bg-purple-600/20 rounded-full blur-3xl bottom-0 right-0"
        animate={{ x: [0, -60, 0], y: [0, 60, 0] }}
        transition={{ repeat: Infinity, duration: 14 }}
      />
      <motion.div
        className="absolute w-64 h-64 bg-cyan-400/10 rounded-full blur-3xl top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 40, ease: "linear" }}
      />

      {/* 🌟 Centralni sadržaj */}
      <motion.div
        className="relative z-10 text-center p-8 rounded-2xl bg-gray-900/60 backdrop-blur-lg border border-gray-800 shadow-2xl"
        initial={{ opacity: 0, scale: 0.95, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 1 }}
      >
        <motion.h1
          className="text-5xl font-extrabold mb-4 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
        >
          Dobrodošao u TableMind
        </motion.h1>

        <motion.p
          className="text-gray-300 text-lg max-w-md mx-auto leading-relaxed"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.8 }}
        >
          Inovativna platforma za pametno upravljanje restoranima.  
          Organizuj stolove, konobare, rezervacije i smene — sve na jednom mestu, uz podršku veštačke inteligencije.
        </motion.p>

        <motion.div
          className="mt-8 text-sm text-gray-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.8 }}
        >
          <p>Pokretanje sistema...</p>
          <div className="w-48 h-2 bg-gray-700 rounded-full mx-auto mt-2 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
              animate={{ x: ["-100%", "100%"] }}
              transition={{ repeat: Infinity, duration: 2 }}
            />
          </div>
        </motion.div>
      </motion.div>

      {/* ⚖️ Footer sa pravima i linkovima */}
      <footer className="absolute bottom-4 text-gray-500 text-xs text-center w-full">
        <p className="mb-2">© {new Date().getFullYear()} TableMind. Sva prava zadržana.</p>
        <div className="space-x-4">
          <a href="/legal/terms" className="hover:text-gray-300 transition-colors">Uslovi korišćenja</a>
          <a href="/legal/privacy" className="hover:text-gray-300 transition-colors">Politika privatnosti</a>
          <a href="/legal/copyright" className="hover:text-gray-300 transition-colors">Autorska prava</a>
        </div>
      </footer>
    </div>
  );
}
