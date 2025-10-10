// pages/chat.js
import { useState, useEffect } from "react";

export default function ChatPage() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "⏳ Učitavam asistenta restorana..." },
  ]);
  const [input, setInput] = useState("");
  const [restaurant, setRestaurant] = useState("TableMind Bistro");

  // Preuzmi ime restorana iz URL-a
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const r = params.get("restaurant") || "TableMind Bistro";
    setRestaurant(r);
    setMessages([
      {
        role: "assistant",
        content: `👋 Zdravo! Dobrodošli u restoran ${r} 🍽️  
Drago mi je što ste ovde.  
Mogu li vam pomoći da napravite rezervaciju? 😊`,
      },
    ]);
  }, []);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const newMessages = [...messages, { role: "user", content: input }];
    setMessages(newMessages);
    setInput("");

    try {
      const res = await fetch(`/api/chat?restaurant=${restaurant}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      const data = await res.json();
      setMessages([...newMessages, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setMessages([
        ...newMessages,
        { role: "assistant", content: "❌ Greška u komunikaciji sa AI-jem." },
      ]);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-6">
      <div className="bg-white shadow-xl rounded-xl w-full max-w-2xl p-6">
        <h1 className="text-2xl font-bold mb-4 text-center">
          💬 Chat sa {restaurant}
        </h1>
        <div className="h-96 overflow-y-auto border p-3 rounded-lg bg-gray-50 mb-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`my-2 ${
                msg.role === "assistant"
                  ? "text-blue-800 bg-blue-100 p-2 rounded-xl"
                  : "text-gray-900 bg-gray-200 p-2 rounded-xl text-right"
              }`}
            >
              {msg.content}
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            className="flex-grow border rounded-lg px-3 py-2"
            placeholder="Upišite poruku..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <button
            onClick={sendMessage}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Pošalji
          </button>
        </div>
      </div>
    </div>
  );
}
