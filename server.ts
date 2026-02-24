import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("inventory.db");

// =====================
// TABLAS
// =====================
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

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
  );
`);

// Crear usuario admin por defecto
const hashed = bcrypt.hashSync("123456", 10);
db.prepare(`
  INSERT OR IGNORE INTO users (username, password)
  VALUES (?, ?)
`).run("admin", hashed);

// =====================
// SERVIDOR
// =====================
async function startServer() {
  const app = express();
  app.use(express.json());

  // -------- LOGIN --------
  app.post("/api/login", (req, res) => {
    const { username, password } = req.body;

    const user = db
      .prepare("SELECT * FROM users WHERE username = ?")
      .get(username);

    if (!user) {
      return res.status(401).json({ error: "Usuario incorrecto" });
    }

    const valid = bcrypt.compareSync(password, user.password);

    if (!valid) {
  return res.status(401).json({ error: "Token inválido" });
}

    // Generar token
    const token = jwt.sign(
      { id: user.id, username: user.username },
      "secreto_super_seguro",
      { expiresIn: "2h" }
    );

    res.json({ token });
  });

  // -------- HEALTH CHECK --------
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // -------- VITE / PRODUCCIÓN --------
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

