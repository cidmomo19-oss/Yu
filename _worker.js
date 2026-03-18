export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // API Create (Tanpa Password)
    if (request.method === "POST" && path === "/api/create") {
      const { content } = await request.json();
      if (!content) return new Response("Empty", { status: 400 });
      const id = Math.random().toString(36).substring(2, 8);
      await env.PASTE_DB.put(id, JSON.stringify({ content }), { expirationTtl: 2592000 });
      return new Response(JSON.stringify({ id }), { headers: { "Content-Type": "application/json" } });
    }

    // API Get (Mendukung data lama)
    if (request.method === "GET" && path.startsWith("/api/get/")) {
      const id = path.split("/").pop();
      const data = await env.PASTE_DB.get(id);
      if (!data) return new Response("{}", { status: 404 });
      return new Response(data, {
        headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=2592000" }
      });
    }

    // Frontend Loader
    let response = await env.ASSETS.fetch(request);
    if (response.status === 404) {
      const indexUrl = new URL(url);
      indexUrl.pathname = "/";
      response = await env.ASSETS.fetch(indexUrl);
    }
    return response;
  }
};
