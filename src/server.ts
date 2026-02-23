import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, "..");

const db = new Database("inventory.db");

// Initialize Database Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS webhook_events (
    id TEXT PRIMARY KEY,
    provider TEXT,
    payload TEXT,
    processed_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    sku TEXT UNIQUE NOT NULL,
    category TEXT,
    unit_weight_g INTEGER DEFAULT 500,
    price DECIMAL(10, 2) NOT NULL
  );

  CREATE TABLE IF NOT EXISTS lots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER,
    lot_number TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    initial_quantity INTEGER NOT NULL,
    expiry_date DATE NOT NULL,
    received_date DATE DEFAULT CURRENT_TIMESTAMP,
    sanitary_info TEXT,
    FOREIGN KEY (product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    external_id TEXT UNIQUE,
    customer_name TEXT,
    customer_email TEXT,
    total_amount DECIMAL(10, 2),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sale_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER,
    product_id INTEGER,
    quantity INTEGER,
    price_at_sale DECIMAL(10, 2),
    FOREIGN KEY (sale_id) REFERENCES sales(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS sale_lot_allocations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_item_id INTEGER,
    lot_id INTEGER,
    quantity INTEGER,
    FOREIGN KEY (sale_item_id) REFERENCES sale_items(id),
    FOREIGN KEY (lot_id) REFERENCES lots(id)
  );
`);

// Seed initial data if empty
const productCount = db.prepare("SELECT COUNT(*) as count FROM products").get() as { count: number };
if (productCount.count === 0) {
  const insertProduct = db.prepare("INSERT INTO products (name, sku, category, price) VALUES (?, ?, ?, ?)");
  insertProduct.run("Chuletas Ahumadas (500g)", "AHUM-001", "smoked", 15.50);
  insertProduct.run("Queso Fresco (500g)", "QUES-001", "dairy", 8.20);
  
  const products = db.prepare("SELECT id FROM products").all() as { id: number }[];
  const insertLot = db.prepare("INSERT INTO lots (product_id, lot_number, quantity, initial_quantity, expiry_date) VALUES (?, ?, ?, ?, ?)");
  
  insertLot.run(products[0].id, "LOT-CH-001", 50, 50, "2026-03-10");
  insertLot.run(products[0].id, "LOT-CH-002", 30, 30, "2026-03-05");
  insertLot.run(products[1].id, "LOT-QS-001", 20, 20, "2026-03-01");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.get("/api/products", (req, res) => {
    const products = db.prepare(`
      SELECT p.*, SUM(l.quantity) as total_stock 
      FROM products p 
      LEFT JOIN lots l ON p.id = l.product_id 
      GROUP BY p.id
    `).all();
    res.json(products);
  });

  app.get("/api/dashboard", (req, res) => {
    const criticalLots = db.prepare(`
      SELECT l.*, p.name as product_name 
      FROM lots l 
      JOIN products p ON l.product_id = p.id 
      WHERE l.expiry_date <= date('now', '+7 days') AND l.quantity > 0
      ORDER BY l.expiry_date ASC
    `).all();

    const inventoryValue = db.prepare(`
      SELECT SUM(l.quantity * p.price) as total_value 
      FROM lots l 
      JOIN products p ON l.product_id = p.id
    `).get();

    res.json({
      criticalLots,
      inventoryValue: (inventoryValue as any).total_value || 0
    });
  });

  app.post("/api/webhook/woocommerce", (req, res) => {
    const eventId = req.headers["x-wc-webhook-id"] as string || `wc_${req.body.id}`;
    const existingEvent = db.prepare("SELECT id FROM webhook_events WHERE id = ?").get(eventId);
    if (existingEvent) return res.status(200).json({ message: "Already processed" });

    const order = req.body;
    if (order.status !== "completed") return res.status(200).json({ message: "Order not completed" });

    try {
      const transaction = db.transaction(() => {
        db.prepare("INSERT INTO webhook_events (id, provider, payload) VALUES (?, ?, ?)")
          .run(eventId, "woocommerce", JSON.stringify(order));

        const saleResult = db.prepare("INSERT INTO sales (external_id, customer_name, customer_email, total_amount) VALUES (?, ?, ?, ?)")
          .run(order.id.toString(), `${order.billing.first_name} ${order.billing.last_name}`, order.billing.email, order.total);
        
        const saleId = saleResult.lastInsertRowid;

        for (const item of order.line_items) {
          const product = db.prepare("SELECT id, price FROM products WHERE sku = ?").get(item.sku) as any;
          if (!product) continue;

          const saleItemResult = db.prepare("INSERT INTO sale_items (sale_id, product_id, quantity, price_at_sale) VALUES (?, ?, ?, ?)")
            .run(saleId, product.id, item.quantity, item.price);
          
          const saleItemId = saleItemResult.lastInsertRowid;

          let remainingToAllocate = item.quantity;
          const availableLots = db.prepare(`
            SELECT * FROM lots 
            WHERE product_id = ? AND quantity > 0 AND expiry_date >= date('now')
            ORDER BY expiry_date ASC
          `).all(product.id) as any[];

          for (const lot of availableLots) {
            if (remainingToAllocate <= 0) break;
            const takeFromLot = Math.min(remainingToAllocate, lot.quantity);
            db.prepare("UPDATE lots SET quantity = quantity - ? WHERE id = ?").run(takeFromLot, lot.id);
            db.prepare("INSERT INTO sale_lot_allocations (sale_item_id, lot_id, quantity) VALUES (?, ?, ?)").run(saleItemId, lot.id, takeFromLot);
            remainingToAllocate -= takeFromLot;
          }

          if (remainingToAllocate > 0) throw new Error(`Insufficient stock for ${item.sku}`);
        }
      });
      transaction();
      res.status(200).json({ status: "success" });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ 
      server: { middlewareMode: true }, 
      appType: "spa",
      root: rootDir
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(rootDir, "dist")));
    app.get("*", (req, res) => res.sendFile(path.join(rootDir, "dist", "index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => console.log(`Server running on http://localhost:${PORT}`));
}

startServer();
