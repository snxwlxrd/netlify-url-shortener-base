import { getStore } from "@netlify/blobs";

/**
 * Resolve code → target URL. Dipanggil oleh blogspot snippet (client-side JS)
 * untuk dapat target URL tanpa reveal target di URL bar blogspot.
 *
 * Flow:
 *   1. User klik short URL → Netlify 301 redirect ke blogspot (?<code>)
 *   2. Blogspot snippet baca code dari URL
 *   3. Blogspot snippet fetch ke /api/resolve?code=<code>
 *   4. Function ini return JSON { target: "https://..." }
 *   5. Blogspot snippet window.location.replace(target)
 *
 * CORS: dibuka untuk semua origin (*) supaya blogspot bisa fetch.
 * Kalau mau restrict, ganti * dengan URL blogspot kamu.
 *
 * Keamanan: function ini tidak reveal apa-apa selain target URL.
 * Tidak ada logging, tidak ada analytics. Cuma lookup Blobs.
 */
export default async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method tidak didukung" }), {
      status: 405,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return new Response(JSON.stringify({ error: "Code required" }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  const store = getStore({ name: "links", consistency: "strong" });
  const target = await store.get(code);

  if (!target) {
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  // Validasi scheme (defense in depth)
  let targetUrl;
  try {
    targetUrl = new URL(target);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid target" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
  if (targetUrl.protocol !== "http:" && targetUrl.protocol !== "https:") {
    return new Response(JSON.stringify({ error: "Invalid scheme" }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  return new Response(JSON.stringify({ target }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=60",
    },
  });
};

export const config = { path: "/api/resolve" };
