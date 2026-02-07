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
      `CREATE TABLE IF NOT EXISTS meal_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
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
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`
    );

    // Add columns if they don't exist (for existing databases)
    const columns = ['zinc', 'magnesium', 'potassium', 'sodium'];
    columns.forEach(col => {
      db.run(`ALTER TABLE meal_entries ADD COLUMN ${col} REAL DEFAULT 0`, (err) => {
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
