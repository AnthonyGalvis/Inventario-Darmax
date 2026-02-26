import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, "..");

const db = new Database("inventory.db");

// =======================
// DATABASE
// =======================
db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    sku TEXT UNIQUE NOT NULL,
    category TEXT,
    unit_weight_g INTEGER DEFAULT 500,
    price DECIMAL(10,2) NOT NULL
  );

  CREATE TABLE IF NOT EXISTS lots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER,
    lot_number TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    initial_quantity INTEGER NOT NULL,
    expiry_date DATE NOT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user'
  );
`);

// =======================
// SEED PRODUCTS
// =======================
const productCount = db.prepare("SELECT COUNT(*) as count FROM products").get() as { count: number };

if (productCount.count === 0) {
  const insertProduct = db.prepare(
    "INSERT INTO products (name, sku, category, price) VALUES (?, ?, ?, ?)"
  );

  insertProduct.run("Chuletas Ahumadas (500g)", "AHUM-001", "smoked", 15.50);
  insertProduct.run("Queso Fresco (500g)", "QUES-001", "dairy", 8.20);

  const products = db.prepare("SELECT id FROM products").all() as { id: number }[];

  const insertLot = db.prepare(
    "INSERT INTO lots (product_id, lot_number, quantity, initial_quantity, expiry_date) VALUES (?, ?, ?, ?, ?)"
  );

  insertLot.run(products[0].id, "LOT-CH-001", 50, 50, "2026-03-10");
  insertLot.run(products[0].id, "LOT-CH-002", 30, 30, "2026-03-05");
  insertLot.run(products[1].id, "LOT-QS-001", 20, 20, "2026-03-01");
}

// =======================
// SEED ADMIN (SIEMPRE SEPARADO)
// =======================
const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };

if (userCount.count === 0) {
  const hashed = bcrypt.hashSync("Darmax2026!Secure", 10);

  db.prepare(
    "INSERT INTO users (username, password, role) VALUES (?, ?, ?)"
  ).run("admin", hashed, "admin");

  console.log("Admin creado → user: admin / pass: 123456");
}

// =======================
// SERVER
// =======================
async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // -------- LOGIN --------
  app.post("/api/login", (req, res) => {
    const { username, password } = req.body;

    const user = db
      .prepare("SELECT * FROM users WHERE username = ?")
      .get(username) as any;

    if (!user) {
      return res.status(401).json({ error: "Usuario incorrecto" });
    }

    const valid = bcrypt.compareSync(password, user.password);

    if (!valid) {
      return res.status(401).json({ error: "Contraseña incorrecta" });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || "super_secret_key",
      { expiresIn: "2h" }
    );

    res.json({ token });
  });

  // -------- CREAR USUARIO --------
  app.post("/api/users", (req, res) => {
    const { username, password, role } = req.body;

    const hashedPassword = bcrypt.hashSync(password, 10);

    try {
      db.prepare(
        "INSERT INTO users (username, password, role) VALUES (?, ?, ?)"
      ).run(username, hashedPassword, role || "user");

      res.json({ message: "Usuario creado correctamente" });
    } catch {
      res.status(400).json({ error: "Usuario ya existe" });
    }
  });

  // -------- PRODUCTS --------
  app.get("/api/products", (req, res) => {
    const products = db.prepare(`
      SELECT p.*, SUM(l.quantity) as total_stock
      FROM products p
      LEFT JOIN lots l ON p.id = l.product_id
      GROUP BY p.id
    `).all();

    res.json(products);
  });

  // -------- DASHBOARD --------
  app.get("/api/dashboard", (req, res) => {
    const criticalLots = db.prepare(`
      SELECT l.*, p.name as product_name
      FROM lots l
      JOIN products p ON l.product_id = p.id
      WHERE l.expiry_date <= date('now', '+7 days') AND l.quantity > 0
      ORDER BY l.expiry_date ASC
    `).all();

    res.json({ criticalLots });
  });

  // -------- VITE --------
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
      root: rootDir
    });

    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(rootDir, "dist")));
    app.get("*", (req, res) =>
      res.sendFile(path.join(rootDir, "dist", "index.html"))
    );
  }

  app.listen(PORT, "0.0.0.0", () =>
    console.log(`Server running on port ${PORT}`)
  );
}

startServer();

