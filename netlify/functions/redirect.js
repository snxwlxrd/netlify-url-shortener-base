import { getStore } from "@netlify/blobs";

/**
 * URL blogspot yang berfungsi sebagai halaman perantara (interstitial).
 *
 * Cara set:
 *   1. Buka dashboard Netlify → Site settings → Environment variables
 *   2. Tambah variable: BLOGSPOT_URL = https://NAMABLOG.blogspot.com
 *      (atau URL page spesifik, mis. https://NAMABLOG.blogspot.com/p/redirect.html)
 *
 * Default "https://blogspot.com" cuma placeholder. WAJIB diganti lewat env var,
 * karena blogspot.com root domain tidak menjalankan snippet redirect milikmu.
 */
const BLOGSPOT_URL = process.env.BLOGSPOT_URL || "http://zaphkielxxi-redirect.blogspot.com/";

/**
 * Nama query parameter yang dipakai untuk mengoper URL tujuan ke blogspot.
 * Pastikan snippet JS di blogspot membaca parameter dengan nama yang sama.
 */
const TARGET_PARAM = "to";

export default async (req, context) => {
  const code = context.params.code;
  const store = getStore({ name: "links", consistency: "strong" });
  const target = await store.get(code);

  if (!target) {
    return new Response("Link tidak ditemukan.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  // Validasi scheme target — cuma http/https yang boleh, untuk mencegah
  // skema berbahaya (javascript:, data:, dll) lewat ke blogspot.
  let targetUrl;
  try {
    targetUrl = new URL(target);
  } catch {
    return new Response("URL tujuan tidak valid.", {
      status: 400,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  if (targetUrl.protocol !== "http:" && targetUrl.protocol !== "https:") {
    return new Response("URL tujuan tidak valid.", {
      status: 400,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  // Susun URL interstitial: BLOGSPOT_URL + ?to=<encoded target>
  // Pakai & kalau BLOGSPOT_URL sudah punya query string sendiri.
  const separator = BLOGSPOT_URL.includes("?") ? "&" : "?";
  const interstitial = `${BLOGSPOT_URL}${separator}${TARGET_PARAM}=${encodeURIComponent(target)}`;

  // 1st redirect: short URL -> blogspot (halaman perantara)
  // 2nd redirect (blogspot -> target) di-handle oleh JS di page blogspot.
  //
  // Pakai 301 (permanen) supaya browser cache redirect ini — subsequent klik
  // langsung ke blogspot tanpa hit Netlify function lagi.
  // Kalau target URL sering berubah untuk code yang sama, ganti ke 302.
  return new Response(null, {
    status: 301,
    headers: {
      Location: interstitial,
      "Cache-Control": "public, max-age=86400",
    },
  });
};

export const config = { path: "/:code" };
