// pages/chat.js
import { useState } from "react";

export default function ChatPage() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: `👋 Zdravo! Ja sam TableMind AI. 
Kako mogu pomoći danas?

Da bih napravio rezervaciju, molim te da mi napišeš:
1️⃣ Ime i prezime  
2️⃣ Broj osoba  
3️⃣ Datum i vreme  
4️⃣ Naziv restorana  

Na primer:
"Mateja Matović, 4 osobe, sutra u 20h u TableMind Bistro."`,
    },
  ]);

  const [input, setInput] = useState("");

  const sendMessage = async () => {
    if (!input.trim()) return;
    const newMessages = [...messages, { role: "user", content: input }];
    setMessages(newMessages);
    setInput("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      const data = await res.json();
      setMessages([...newMessages, { role: "assistant", content: data.reply }]);
    } catch (error) {
      setMessages([
        ...newMessages,
        { role: "assistant", content: "❌ Greška u komunikaciji sa AI-jem." },
      ]);
    }
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "600px", margin: "auto" }}>
      <h1>💬 TableMind Chat</h1>
      <div
        style={{
          border: "1px solid #ccc",
          borderRadius: "8px",
          padding: "1rem",
          height: "400px",
          overflowY: "auto",
          marginBottom: "1rem",
        }}
      >
        {messages.map((msg, i) => (
          <div key={i} style={{ marginBottom: "10px" }}>
            <b>{msg.role === "assistant" ? "🤖 AI:" : "🧑 Ti:"}</b> {msg.content}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Unesi poruku..."
          style={{ flexGrow: 1, padding: "0.5rem" }}
        />
        <button onClick={sendMessage}>Pošalji</button>
      </div>
    </div>
  );
}
