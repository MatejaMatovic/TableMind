// lib/smsService.js
import fetch from "node-fetch";

export async function sendSms(to, message) {
  const provider = process.env.SMS_PROVIDER || "gatewayapi";

  if (provider === "gatewayapi") {
    return await sendViaGatewayApi(to, message);
  }

  throw new Error(`SMS provider '${provider}' nije podržan.`);
}

async function sendViaGatewayApi(to, message) {
  try {
    const res = await fetch("https://gatewayapi.com/rest/mtsms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(
          process.env.GATEWAY_API_TOKEN + ":"
        ).toString("base64")}`,
      },
      body: JSON.stringify({
        sender: process.env.GATEWAY_SENDER_NAME || "TableMind",
        message: message,
        recipients: [{ msisdn: to.replace(/\D/g, "") }], // očisti broj
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Greška pri slanju SMS-a");
    console.log("📤 SMS poslat:", data);
    return data;
  } catch (err) {
    console.error("❌ Greška pri slanju SMS-a:", err);
    throw err;
  }
}
