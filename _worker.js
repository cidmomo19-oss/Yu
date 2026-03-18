export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // --- 1. API BUAT LINK (SIMPAN KE KV) --
    if (request.method === "POST" && path === "/api/create") {
      // Sekarang HANYA menerima content (tanpa password)
      const { content } = await request.json();
      
      if (!content) return new Response("Empty", { status: 400 });

      // Bikin ID 6 Karakter Acak
      const id = Math.random().toString(36).substring(2, 8);

      // Simpan content ke dalam KV Database (Tahan 30 Hari)
      await env.PASTE_DB.put(id, JSON.stringify({ content }), { expirationTtl: 2592000 });

      return new Response(JSON.stringify({ id }), { headers: { "Content-Type": "application/json" } });
    }

    // --- 2. API AMBIL LINK (DENGAN CACHE 1 BULAN) ---
    if (request.method === "GET" && path.startsWith("/api/get/")) {
      const id = path.split("/").pop();
      const data = await env.PASTE_DB.get(id);

      if (!data) return new Response("{}", { status: 404 });

      // Cache dari Cloudflare
      return new Response(data, {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=2592000, s-maxage=2592000"
        }
      });
    }

    // --- 3. ROUTING HALAMAN HTML ---
    let response = await env.ASSETS.fetch(request);
    if (response.status === 404) {
      const indexUrl = new URL(url);
      indexUrl.pathname = "/";
      response = await env.ASSETS.fetch(indexUrl);
    }
    return response;
  }
};
