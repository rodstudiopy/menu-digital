const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(path.join(__dirname, "data.sqlite"));

db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS empresas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  direccion TEXT,
  telefono TEXT,
  logo_url TEXT,
  activo INTEGER DEFAULT 1,
  tema_color TEXT DEFAULT '#2563eb',
  idiomas TEXT DEFAULT 'es',
  creado_en TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS categorias (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  empresa_id INTEGER NOT NULL,
  nombre TEXT NOT NULL,
  nombre_en TEXT,
  orden INTEGER DEFAULT 0,
  FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS productos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  categoria_id INTEGER NOT NULL,
  nombre TEXT NOT NULL,
  nombre_en TEXT,
  descripcion TEXT,
  descripcion_en TEXT,
  precio REAL NOT NULL DEFAULT 0,
  imagen_url TEXT,
  disponible INTEGER DEFAULT 1,
  FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS visitas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  empresa_id INTEGER NOT NULL,
  fecha TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE
);
`);

// Migración: agregar columnas nuevas si no existen
try {
  db.exec("ALTER TABLE empresas ADD COLUMN tipo_menu TEXT DEFAULT 'escrito'");
} catch (e) {}

try {
  db.exec("ALTER TABLE empresas ADD COLUMN menu_imagen_url TEXT");
} catch (e) {}

module.exports = db;