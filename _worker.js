export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "POST" && path === "/api/create") {
      // PERBAIKAN: Tambah field useSub2Unlock
      const { content, password, useSub2Unlock } = await request.json();
      if (!content) return new Response("Empty", { status: 400 });

      const id = Math.random().toString(36).substring(2, 8);

      // Simpan content, password, dan status Sub2Unlock ke KV
      await env.PASTE_DB.put(id, JSON.stringify({ content, password, useSub2Unlock }), { expirationTtl: 2592000 });

      return new Response(JSON.stringify({ id }), { headers: { "Content-Type": "application/json" } });
    }

    if (request.method === "GET" && path.startsWith("/api/get/")) {
      const id = path.split("/").pop();
      const data = await env.PASTE_DB.get(id);
      if (!data) return new Response("{}", { status: 404 });

      return new Response(data, {
        headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=2592000, s-maxage=2592000" }
      });
    }

    let response = await env.ASSETS.fetch(request);
    if (response.status === 404) {
      const indexUrl = new URL(url);
      indexUrl.pathname = "/";
      response = await env.ASSETS.fetch(indexUrl);
    }
    return response;
  }
};
