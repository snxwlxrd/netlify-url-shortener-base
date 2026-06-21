import { getStore } from "@netlify/blobs";

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

  return new Response(null, {
    status: 301,
    headers: { Location: target },
  });
};

export const config = { path: "/:code" };
