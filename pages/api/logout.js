// pages/api/auth/logout.js
export default function handler(req, res) {
  res.setHeader("Set-Cookie", `token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`);
  res.status(200).json({ ok: true });
}
