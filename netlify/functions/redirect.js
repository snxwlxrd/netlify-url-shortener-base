import { getStore } from "@netlify/blobs";

const BLOGSPOT_URL =
  process.env.BLOGSPOT_URL || "https://zaphkielxxi-redirect.blogspot.com";

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

  const separator = BLOGSPOT_URL.includes("?") ? "&" : "?";
  const interstitial = `${BLOGSPOT_URL}${separator}${TARGET_PARAM}=${encodeURIComponent(target)}`;

  return new Response(null, {
    status: 301,
    headers: {
      Location: interstitial,
      "Cache-Control": "public, max-age=86400",
    },
  });
};

export const config = { path: "/:code" };
