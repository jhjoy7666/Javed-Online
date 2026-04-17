import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Add a proxy to the SVP API to bypass CORS
  app.get("/api/proxy/occupations", async (req, res) => {
    try {
      const { per_page = 20, page = 1, name = "", locale = "en" } = req.query;
      const url = `https://svp-international-api.pacc.sa/api/v1/visitor_space/occupations?per_page=${per_page}&page=${page}&name=${encodeURIComponent(name as string)}&locale=${locale}`;
      
      const response = await fetch(url);
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Proxy error:", error);
      res.status(500).json({ error: "Failed to fetch occupations from proxy" });
    }
  });

  app.get("/api/proxy/results", async (req, res) => {
    try {
      const { passport_number, occupation_key, nationality_id, locale = "en" } = req.query;
      const url = `https://svp-international-api.pacc.sa/api/v1/visitor_space/labors?passport_number=${passport_number}&occupation_key=${occupation_key}&nationality_id=${nationality_id}&locale=${locale}`;
      
      const response = await fetch(url);
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Proxy error:", error);
      res.status(500).json({ error: "Failed to fetch results from proxy" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
