const express = require('express');
const cors = require('cors');
const { initDb, run, all, get } = require('./db');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

initDb();

const getToday = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60000);
  return local.toISOString().slice(0, 10);
};

const parseNumber = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const asyncHandler = (handler) => (req, res) => {
  Promise.resolve(handler(req, res)).catch((error) => {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  });
};

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post(
  '/api/meals',
  asyncHandler(async (req, res) => {
    const { date, meal, calories, protein, carbs, fat, notes } = req.body || {};

    const payload = {
      date: (date || '').trim(),
      meal: (meal || '').trim(),
      calories: parseNumber(calories),
      protein: parseNumber(protein),
      carbs: parseNumber(carbs),
      fat: parseNumber(fat),
      notes: notes ? String(notes).trim() : ''
    };

    const errors = [];
    if (!payload.date) errors.push('Date is required.');
    if (!payload.meal) errors.push('Meal name is required.');
    if (payload.calories === null) errors.push('Calories must be a number.');
    if (payload.protein === null) errors.push('Protein must be a number.');
    if (payload.carbs === null) errors.push('Carbs must be a number.');
    if (payload.fat === null) errors.push('Fat must be a number.');

    if (errors.length > 0) {
      return res.status(400).json({ message: 'Validation error', errors });
    }

    const insertSql = `
      INSERT INTO meal_entries (entry_date, meal, calories, protein, carbs, fat, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await run(insertSql, [
      payload.date,
      payload.meal,
      payload.calories,
      payload.protein,
      payload.carbs,
      payload.fat,
      payload.notes
    ]);

    res.status(201).json({
      id: result.id,
      ...payload
    });
  })
);

app.get(
  '/api/meals',
  asyncHandler(async (req, res) => {
    const date = (req.query.date || getToday()).trim();

    const rows = await all(
      `SELECT id, entry_date AS date, meal, calories, protein, carbs, fat, notes, created_at
       FROM meal_entries
       WHERE entry_date = ?
       ORDER BY datetime(created_at) ASC`,
      [date]
    );

    res.json({ date, entries: rows });
  })
);

app.get(
  '/api/summary',
  asyncHandler(async (req, res) => {
    const date = (req.query.date || getToday()).trim();

    const totals = await get(
      `SELECT
        COALESCE(SUM(calories), 0) AS calories,
        COALESCE(SUM(protein), 0) AS protein,
        COALESCE(SUM(carbs), 0) AS carbs,
        COALESCE(SUM(fat), 0) AS fat
       FROM meal_entries
       WHERE entry_date = ?`,
      [date]
    );

    const byMeal = await all(
      `SELECT
        meal,
        COUNT(*) AS entries,
        COALESCE(SUM(calories), 0) AS calories,
        COALESCE(SUM(protein), 0) AS protein,
        COALESCE(SUM(carbs), 0) AS carbs,
        COALESCE(SUM(fat), 0) AS fat
       FROM meal_entries
       WHERE entry_date = ?
       GROUP BY meal
       ORDER BY meal ASC`,
      [date]
    );

    res.json({ date, totals, byMeal });
  })
);

app.listen(PORT, () => {
  console.log(`Macro tracker API running on port ${PORT}`);
});
