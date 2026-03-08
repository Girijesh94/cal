const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dataDir = path.join(__dirname, 'data');
const dbPath = path.join(dataDir, 'macros.db');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath);

const initDb = () => {
  db.serialize(() => {
    db.run(
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`
    );

    db.run(
      `CREATE TABLE IF NOT EXISTS meal_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        entry_date TEXT NOT NULL,
        meal TEXT NOT NULL,
        calories REAL NOT NULL,
        protein REAL NOT NULL,
        carbs REAL NOT NULL,
        fat REAL NOT NULL,
        zinc REAL DEFAULT 0,
        magnesium REAL DEFAULT 0,
        potassium REAL DEFAULT 0,
        sodium REAL DEFAULT 0,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY(user_id) REFERENCES users(id)
      )`
    );

    // Add columns if they don't exist (for existing databases)
    const columns = [
      { name: 'user_id', def: 'INTEGER NOT NULL DEFAULT 1' }, // Defaulting to 1 to not break existing rows immediately if any, though they will be orphaned effectively if no user 1.
      { name: 'zinc', def: 'REAL DEFAULT 0' },
      { name: 'magnesium', def: 'REAL DEFAULT 0' },
      { name: 'potassium', def: 'REAL DEFAULT 0' },
      { name: 'sodium', def: 'REAL DEFAULT 0' }
    ];
    columns.forEach(col => {
      db.run(`ALTER TABLE meal_entries ADD COLUMN ${col.name} ${col.def}`, (err) => {
        // Ignore error if column already exists
      });
    });

    db.run(
      `CREATE TABLE IF NOT EXISTS foods (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        name_normalized TEXT NOT NULL UNIQUE,
        calories_per_100g REAL NOT NULL,
        protein_per_100g REAL NOT NULL,
        carbs_per_100g REAL NOT NULL,
        fat_per_100g REAL NOT NULL,
        source TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`
    );

    db.run(
      `CREATE TABLE IF NOT EXISTS ingredient_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        meal_entry_id INTEGER NOT NULL,
        food_id INTEGER NOT NULL,
        quantity_grams REAL NOT NULL,
        calories REAL NOT NULL,
        protein REAL NOT NULL,
        carbs REAL NOT NULL,
        fat REAL NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY(meal_entry_id) REFERENCES meal_entries(id) ON DELETE CASCADE,
        FOREIGN KEY(food_id) REFERENCES foods(id)
      )`
    );

    db.run(
      `CREATE INDEX IF NOT EXISTS idx_foods_normalized ON foods (name_normalized)`
    );

    db.run(
      `CREATE INDEX IF NOT EXISTS idx_ingredients_meal_entry ON ingredient_entries (meal_entry_id)`
    );

    db.run(
      `CREATE INDEX IF NOT EXISTS idx_meal_date ON meal_entries (entry_date)`
    );

    // Table for storing user's everyday products (temporary until ML model is ready)
    db.run(
      `CREATE TABLE IF NOT EXISTS my_products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        product_name TEXT NOT NULL,
        brand TEXT,
        serving_size REAL NOT NULL,
        serving_unit TEXT NOT NULL DEFAULT 'g',
        calories REAL NOT NULL,
        protein REAL NOT NULL,
        carbs REAL NOT NULL,
        fat REAL NOT NULL,
        fiber REAL DEFAULT 0,
        sugar REAL DEFAULT 0,
        notes TEXT,
        is_favorite INTEGER DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY(user_id) REFERENCES users(id),
        UNIQUE(user_id, product_name)
      )`
    );

    db.run(`ALTER TABLE my_products ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1`, (err) => { });

    db.run(
      `CREATE INDEX IF NOT EXISTS idx_my_products_name ON my_products (product_name)`
    );

    db.run(
      `CREATE INDEX IF NOT EXISTS idx_my_products_favorite ON my_products (is_favorite)`
    );
  });
};

const run = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, changes: this.changes });
      }
    });
  });

const all = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });

const get = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });

module.exports = {
  db,
  dbPath,
  initDb,
  run,
  all,
  get
};
