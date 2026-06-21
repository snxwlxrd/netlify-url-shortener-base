import { getStore } from "@netlify/blobs";

const CODE_LENGTH = 6;
const CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function randomCode(length = CODE_LENGTH) {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return result;
}

function normalizeUrl(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export default async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method tidak didukung" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Body request harus JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const rawUrls = Array.isArray(body.urls) ? body.urls : [];
  const longUrls = rawUrls
    .map((u) => (typeof u === "string" ? normalizeUrl(u) : null))
    .filter(Boolean);

  if (longUrls.length === 0) {
    return new Response(
      JSON.stringify({ error: "Tidak ada URL valid yang dikirim" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // limit request
  const limited = longUrls.slice(0, 200);

  const store = getStore({ name: "links", consistency: "strong" });
  const origin = new URL(req.url).origin;
  const results = [];

  for (const longUrl of limited) {
    let code;
    let attempts = 0;
    do {
      code = randomCode();
      attempts++;
    } while ((await store.get(code)) !== null && attempts < 5);

    await store.set(code, longUrl);
    results.push({ longUrl, shortUrl: `${origin}/${code}` });
  }

  return new Response(JSON.stringify({ results }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

export const config = { path: "/api/shorten" };
