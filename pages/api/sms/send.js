// pages/api/sms/send.js
import { sendSms } from "@/lib/smsService";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { to, message } = req.body;
  if (!to || !message)
    return res.status(400).json({ error: "Missing 'to' or 'message'" });

  try {
    const response = await sendSms(to, message);
    res.status(200).json({ success: true, response });
  } catch (err) {
    console.error("SMS error:", err);
    res.status(500).json({ error: "Greška pri slanju SMS-a", details: err.message });
  }
}

