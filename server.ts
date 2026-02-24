import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("inventory.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    sku TEXT UNIQUE,
    category TEXT,
    price DECIMAL(10, 2)
  );
  CREATE TABLE IF NOT EXISTS lots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER,
    lot_number TEXT,
    quantity INTEGER,
    expiry_date DATE
  );
`);

async function startServer() {
  const app = express();
  app.use(express.json());

  app.get("/api/health", (req, res) =>
    res.json({ status: "ok" })
  );

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
  }

  const PORT = process.env.PORT || 3000;

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
