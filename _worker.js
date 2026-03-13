export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // --- 1. API UNTUK MEMBUAT LINK (MENYIMPAN DATA KE KV) ---
    if (request.method === "POST" && path === "/api/create") {
      try {
        // TAMBAHKAN: Ambil 'isMarkdown' dari request body bersama dengan data lainnya.
        const { content, password, isMarkdown } = await request.json();
        
        if (!content || content.trim() === "") {
          return new Response(JSON.stringify({ error: "Content cannot be empty" }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }

        // Buat ID unik 6 karakter.
        const id = Math.random().toString(36).substring(2, 8);

        // UBAH: Simpan objek lengkap termasuk 'isMarkdown' ke dalam KV.
        // Jika 'isMarkdown' tidak dikirim dari frontend, nilainya akan 'undefined' (dianggap false).
        await env.PASTE_DB.put(
          id,
          JSON.stringify({ content, password, isMarkdown: isMarkdown || false }),
          { expirationTtl: 2592000 } // Data akan hilang setelah 30 hari
        );

        return new Response(JSON.stringify({ id }), {
          headers: { "Content-Type": "application/json" }
        });

      } catch (e) {
        return new Response(JSON.stringify({ error: "Invalid JSON format" }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // --- 2. API UNTUK MENGAMBIL DATA (DARI KV DENGAN CACHE) ---
    if (request.method === "GET" && path.startsWith("/api/get/")) {
      const id = path.split("/").pop();
      if (!id) {
        return new Response(JSON.stringify({ error: "ID is missing" }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }

      // Ambil data dari KV berdasarkan ID.
      const data = await env.PASTE_DB.get(id);

      if (!data) {
        return new Response(JSON.stringify({ error: "Not Found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" }
        });
      }

      // Kirim data kembali ke frontend dengan header cache yang kuat.
      // Ini membuat Cloudflare menyimpan data ini di server Edge terdekat selama 30 hari.
      return new Response(data, {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=2592000, s-maxage=2592000, immutable"
        }
      });
    }

    // --- 3. MENAMPILKAN HALAMAN HTML (SINGLE PAGE APPLICATION) ---
    // Semua request lain (selain API) akan dianggap sebagai request untuk halaman utama.
    try {
      // Coba ambil file dari Pages/Assets (misal: /style.css, /script.js)
      let response = await env.ASSETS.fetch(request);
      
      // Jika file tidak ditemukan (404), tampilkan halaman utama (index.html).
      // Ini penting agar saat user refresh di halaman /abcdef, dia tidak error 404.
      if (response.status === 404) {
        const indexUrl = new URL(url);
        indexUrl.pathname = "/";
        response = await env.ASSETS.fetch(indexUrl);
      }
      return response;

    } catch (e) {
      return new Response("Asset serving failed. Make sure your project is configured correctly.", { status: 500 });
    }
  }
};
