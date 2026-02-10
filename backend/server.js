const express = require('express');
const cors = require('cors');
const { initDb, run, all, get, dbPath } = require('./db');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

initDb();

const fetchJson = async (url, options) => {
  const fetchFn =
    typeof fetch === 'function'
      ? fetch
      : (await import('node-fetch')).default;
  const response = await fetchFn(url, options);
  if (!response.ok) {
    throw new Error('Request failed');
  }
  return response.json();
};

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

const normalizeFoodName = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

/**
 * Curated per-100g values for common whole foods.
 * OpenFoodFacts often returns packaged products (bouillon, desserts) for generic terms
 * like "chicken" or "milk". This fallback ensures realistic values for raw/unprocessed foods.
 * Values from USDA / common nutrition databases.
 */
const CURATED_WHOLE_FOODS = {
  chicken: { calories_per_100g: 165, protein_per_100g: 31, carbs_per_100g: 0, fat_per_100g: 3.6 },
  'chicken breast': { calories_per_100g: 165, protein_per_100g: 31, carbs_per_100g: 0, fat_per_100g: 3.6 },
  milk: { calories_per_100g: 61, protein_per_100g: 3.2, carbs_per_100g: 4.8, fat_per_100g: 3.3 },
  banana: { calories_per_100g: 89, protein_per_100g: 1.1, carbs_per_100g: 23, fat_per_100g: 0.3 },
  bananas: { calories_per_100g: 89, protein_per_100g: 1.1, carbs_per_100g: 23, fat_per_100g: 0.3 },
  oats: { calories_per_100g: 389, protein_per_100g: 16.9, carbs_per_100g: 66, fat_per_100g: 6.9 },
  oatmeal: { calories_per_100g: 389, protein_per_100g: 16.9, carbs_per_100g: 66, fat_per_100g: 6.9 },
  egg: { calories_per_100g: 155, protein_per_100g: 13, carbs_per_100g: 1.1, fat_per_100g: 11 },
  eggs: { calories_per_100g: 155, protein_per_100g: 13, carbs_per_100g: 1.1, fat_per_100g: 11 },
  rice: { calories_per_100g: 130, protein_per_100g: 2.7, carbs_per_100g: 28, fat_per_100g: 0.3 },
  'white rice': { calories_per_100g: 130, protein_per_100g: 2.7, carbs_per_100g: 28, fat_per_100g: 0.3 },
  'brown rice': { calories_per_100g: 112, protein_per_100g: 2.6, carbs_per_100g: 24, fat_per_100g: 0.9 },
  beef: { calories_per_100g: 250, protein_per_100g: 26, carbs_per_100g: 0, fat_per_100g: 15 },
  salmon: { calories_per_100g: 208, protein_per_100g: 20, carbs_per_100g: 0, fat_per_100g: 13 },
  bread: { calories_per_100g: 265, protein_per_100g: 9, carbs_per_100g: 49, fat_per_100g: 3.2 },
  pasta: { calories_per_100g: 131, protein_per_100g: 5, carbs_per_100g: 25, fat_per_100g: 1.1 },
  potato: { calories_per_100g: 77, protein_per_100g: 2, carbs_per_100g: 17, fat_per_100g: 0.1 },
  potatoes: { calories_per_100g: 77, protein_per_100g: 2, carbs_per_100g: 17, fat_per_100g: 0.1 },
  apple: { calories_per_100g: 52, protein_per_100g: 0.3, carbs_per_100g: 14, fat_per_100g: 0.2 },
  apples: { calories_per_100g: 52, protein_per_100g: 0.3, carbs_per_100g: 14, fat_per_100g: 0.2 },
  yogurt: { calories_per_100g: 59, protein_per_100g: 10, carbs_per_100g: 3.5, fat_per_100g: 0.4 },
  'greek yogurt': { calories_per_100g: 97, protein_per_100g: 9, carbs_per_100g: 3.6, fat_per_100g: 5 },
  cheese: { calories_per_100g: 402, protein_per_100g: 25, carbs_per_100g: 1.3, fat_per_100g: 33 },
  curd: { calories_per_100g: 97, protein_per_100g: 11, carbs_per_100g: 3.5, fat_per_100g: 4.3 },
  curds: { calories_per_100g: 97, protein_per_100g: 11, carbs_per_100g: 3.5, fat_per_100g: 4.3 },
  paneer: { calories_per_100g: 265, protein_per_100g: 18, carbs_per_100g: 1.2, fat_per_100g: 21 },
  'cottage cheese': { calories_per_100g: 98, protein_per_100g: 11, carbs_per_100g: 3.4, fat_per_100g: 4.3 },
  tofu: { calories_per_100g: 76, protein_per_100g: 8, carbs_per_100g: 1.9, fat_per_100g: 4.8 },
};

const CURATED_KEYS = Object.keys(CURATED_WHOLE_FOODS);

/**
 * Levenshtein distance (edit distance) - min edits to transform a into b.
 * No external dependency; fine for ~50 keys.
 */
const levenshteinDistance = (a, b) => {
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = a[j - 1] === b[i - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[b.length][a.length];
};

/**
 * Typo-tolerant curated lookup. Returns { key, values } when input fuzzy-matches
 * a curated key, or null when no clear match.
 * Uses Levenshtein with max distance 2 and ratio >= 0.75; requires single clear winner.
 */
const findCuratedMatch = (normalizedName) => {
  if (!normalizedName) return null;
  const exact = CURATED_WHOLE_FOODS[normalizedName];
  if (exact) return { key: normalizedName, values: exact };

  const MAX_DISTANCE = 2;
  const MIN_RATIO = 0.75;
  let best = null;
  let bestDistance = Infinity;
  let secondBestDistance = Infinity;

  for (const key of CURATED_KEYS) {
    const dist = levenshteinDistance(normalizedName, key);
    const ratio = 1 - dist / Math.max(normalizedName.length, key.length);
    if (dist <= MAX_DISTANCE && ratio >= MIN_RATIO) {
      if (dist < bestDistance) {
        secondBestDistance = bestDistance;
        bestDistance = dist;
        best = { key, values: CURATED_WHOLE_FOODS[key] };
      } else if (dist < secondBestDistance) {
        secondBestDistance = dist;
      }
    }
  }

  if (!best) return null;
  if (bestDistance === secondBestDistance) return null;
  return best;
};

/**
 * Sanity-check per-100g values to catch unit/field mapping errors.
 * Rejects unrealistic values that indicate per-serving or wrong-unit data.
 */
const validatePer100gValues = (calories, protein, carbs, fat) => {
  const MAX_CALORIES_PER_100G = 900; // Pure fat ~900 kcal/100g
  const MAX_MACRO_PER_100G = 100;   // Max ~100g protein/carbs/fat per 100g food
  const MIN_CALORIES_PER_100G = 0;
  const MIN_MACRO_PER_100G = 0;

  if (
    calories < MIN_CALORIES_PER_100G || calories > MAX_CALORIES_PER_100G ||
    protein < MIN_MACRO_PER_100G || protein > MAX_MACRO_PER_100G ||
    carbs < MIN_MACRO_PER_100G || carbs > MAX_MACRO_PER_100G ||
    fat < MIN_MACRO_PER_100G || fat > MAX_MACRO_PER_100G
  ) {
    throw new Error(
      `Nutrition values out of valid per-100g range: calories=${calories}, protein=${protein}, carbs=${carbs}, fat=${fat}. ` +
      'Expected per-100g: calories 0-900, macros 0-100.'
    );
  }
};

/**
 * Normalize OpenFoodFacts nutriment data to per-100g values.
 * Handles products with nutrition_data_per "100g" or "serving".
 * Never uses unsuffixed fields (proteins, carbohydrates, fat) as they may be per-serving.
 */
const normalizeNutrimentsToPer100g = (product) => {
  const nutriments = product?.nutriments;
  const servingQuantity = parseNumber(product?.serving_quantity) || parseNumber(nutriments?.serving_quantity);

  const scaleToPer100g = (valuePerServing) => {
    if (valuePerServing == null || servingQuantity == null || servingQuantity <= 0) return null;
    return (valuePerServing / servingQuantity) * 100;
  };

  // Prefer _100g; if missing and we have serving data, derive from _serving
  let calories = parseNumber(nutriments?.['energy-kcal_100g']);
  if (calories == null) {
    const energyKj100g = parseNumber(nutriments?.energy_100g);
    if (energyKj100g != null) {
      calories = energyKj100g / 4.184;
    } else if (servingQuantity) {
      const kcalServing = parseNumber(nutriments?.['energy-kcal_serving']) ??
        (parseNumber(nutriments?.energy_serving) / 4.184);
      calories = scaleToPer100g(kcalServing);
    }
  }

  let protein = parseNumber(nutriments?.proteins_100g);
  if (protein == null && servingQuantity) {
    protein = scaleToPer100g(parseNumber(nutriments?.proteins_serving));
  }

  let carbs = parseNumber(nutriments?.carbohydrates_100g);
  if (carbs == null && servingQuantity) {
    carbs = scaleToPer100g(parseNumber(nutriments?.carbohydrates_serving));
  }

  let fat = parseNumber(nutriments?.fat_100g);
  if (fat == null && servingQuantity) {
    fat = scaleToPer100g(parseNumber(nutriments?.fat_serving));
  }

  if ([calories, protein, carbs, fat].some((v) => v == null)) {
    throw new Error('Nutrition data missing required per-100g fields (or per-serving + serving_quantity).');
  }

  validatePer100gValues(calories, protein, carbs, fat);

  return {
    calories_per_100g: calories,
    protein_per_100g: protein,
    carbs_per_100g: carbs,
    fat_per_100g: fat,
    source: 'openfoodfacts'
  };
};

const PLAIN_WORDS = ['plain', 'regular', 'natural', 'whole', 'original', 'classic', 'simple'];
const SPECIALIZED_WORDS = ['high protein', 'strained', 'flavored', 'flavour', 'lite', 'low fat', 'low-fat', 'fat free', 'fat-free', 'zero', 'sugar free', 'sugar-free'];

/**
 * Score an OpenFoodFacts product for relevance to the search term.
 * Prefer plain/regular products; penalize specialized variants.
 */
const scoreProduct = (product, searchTerm) => {
  let points = 0;
  const name = (product.product_name || '').toLowerCase();
  const generic = (product.generic_name || '').toLowerCase();
  const combined = `${name} ${generic}`;
  const term = searchTerm.toLowerCase();

  if (combined.includes(term)) points += 20;
  if (name.includes(term)) points += 15;

  for (const w of PLAIN_WORDS) {
    if (combined.includes(w)) points += 5;
  }
  for (const w of SPECIALIZED_WORDS) {
    if (combined.includes(w)) points -= 10;
  }

  const cats = (product.categories_tags || []).join(' ').toLowerCase();
  if (term.includes('curd') || term.includes('cheese') || term.includes('paneer')) {
    if (cats.includes('cheese') || cats.includes('dair')) points += 8;
  }
  if (term.includes('milk') && cats.includes('milk')) points += 5;

  const nut = product?.nutriments;
  const has100g = nut?.proteins_100g != null && nut?.carbohydrates_100g != null && nut?.fat_100g != null;
  if (has100g) points += 10;

  return points;
};

const MIN_SCORE_THRESHOLD = 5;

const selectBestProduct = (products, searchTerm) => {
  if (!products?.length) return null;
  const scored = products
    .filter((p) => p?.nutriments)
    .map((product) => ({ product, score: scoreProduct(product, searchTerm) }))
    .filter((x) => x.score >= MIN_SCORE_THRESHOLD)
    .sort((a, b) => b.score - a.score);
  return scored[0] ?? null;
};

const fetchOpenFoodFactsNutrition = async (name) => {
  const normalized = normalizeFoodName(name);

  const curated = findCuratedMatch(normalized);
  if (curated) {
    return { ...curated.values, source: 'curated' };
  }

  const query = encodeURIComponent(name);
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${query}&search_simple=1&action=process&json=1&page_size=10`;
  const data = await fetchJson(url, {
    headers: {
      'User-Agent': 'macro-tracker/1.0'
    }
  }).catch(() => null);
  const products = data?.products ?? [];
  const best = selectBestProduct(products, normalized);
  if (!best?.product?.nutriments) {
    throw new Error(`Could not find reliable nutrition data for "${name}". Please enter macros manually.`);
  }
  return normalizeNutrimentsToPer100g(best.product);
};

const asyncHandler = (handler) => (req, res) => {
  Promise.resolve(handler(req, res)).catch((error) => {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  });
};

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', dbPath });
});

app.post(
  '/api/meals',
  asyncHandler(async (req, res) => {
    const { date, meal, calories, protein, carbs, fat, zinc, magnesium, potassium, sodium, notes } = req.body || {};

    const payload = {
      date: (date || '').trim(),
      meal: (meal || '').trim(),
      calories: parseNumber(calories),
      protein: parseNumber(protein),
      carbs: parseNumber(carbs),
      fat: parseNumber(fat),
      zinc: parseNumber(zinc) || 0,
      magnesium: parseNumber(magnesium) || 0,
      potassium: parseNumber(potassium) || 0,
      sodium: parseNumber(sodium) || 0,
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
      INSERT INTO meal_entries (entry_date, meal, calories, protein, carbs, fat, zinc, magnesium, potassium, sodium, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await run(insertSql, [
      payload.date,
      payload.meal,
      payload.calories,
      payload.protein,
      payload.carbs,
      payload.fat,
      payload.zinc,
      payload.magnesium,
      payload.potassium,
      payload.sodium,
      payload.notes
    ]);

    res.status(201).json({
      id: result.id,
      ...payload
    });
  })
);

app.post(
  '/api/meals/from-ingredients',
  asyncHandler(async (req, res) => {
    const { date, meal, notes, ingredients } = req.body || {};
    const entryDate = (date || '').trim();
    const mealName = (meal || '').trim() || 'Meal';
    const entryNotes = notes ? String(notes).trim() : '';

    if (!entryDate) {
      return res.status(400).json({ message: 'Validation error', errors: ['Date is required.'] });
    }

    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({ message: 'Validation error', errors: ['At least one ingredient is required.'] });
    }

    const normalizedIngredients = ingredients
      .map((item) => ({
        name: String(item?.name || '').trim(),
        quantityGrams: parseNumber(item?.quantityGrams)
      }))
      .filter((item) => item.name && item.quantityGrams !== null);

    if (normalizedIngredients.length !== ingredients.length) {
      return res.status(400).json({ message: 'Validation error', errors: ['Each ingredient needs a food name and quantity in grams.'] });
    }

    for (const item of normalizedIngredients) {
      if (item.quantityGrams <= 0) {
        return res.status(400).json({ message: 'Validation error', errors: ['Ingredient quantity must be greater than 0 grams.'] });
      }
    }

    let totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    const ingredientRows = [];

    for (const item of normalizedIngredients) {
      const normalizedName = normalizeFoodName(item.name);

      // 1. Check user's custom products first
      let myProduct = await get(
        `SELECT * FROM my_products WHERE LOWER(product_name) = ?`,
        [item.name.toLowerCase()]
      );

      if (!myProduct) {
        // Try normalized match if direct match fails
        myProduct = await get(
          `SELECT * FROM my_products WHERE LOWER(product_name) = ?`,
          [normalizedName]
        );
      }

      let foodMacros;
      let foodSource;
      let foodId = null;

      if (myProduct) {
        // Calculate macros based on quantity vs serving size
        const ratio = item.quantityGrams / myProduct.serving_size;
        foodMacros = {
          calories: myProduct.calories * ratio,
          protein: myProduct.protein * ratio,
          carbs: myProduct.carbs * ratio,
          fat: myProduct.fat * ratio,
          per100g: {
            calories: (myProduct.calories / myProduct.serving_size) * 100,
            protein: (myProduct.protein / myProduct.serving_size) * 100,
            carbs: (myProduct.carbs / myProduct.serving_size) * 100,
            fat: (myProduct.fat / myProduct.serving_size) * 100
          }
        };
        foodSource = 'my_products';
        // Note: we don't necessarily have a row in 'foods' table for this, 
        // but the 'ingredient_entries' table needs a 'food_id'.
        // Let's see if we should insert it into 'foods' to maintain FK or allow NULL.
        // For now, let's see if we can find it in 'foods' or create a shadow entry.

        let existingFood = await get(`SELECT id FROM foods WHERE name_normalized = ?`, [normalizedName]);
        if (existingFood) {
          foodId = existingFood.id;
        } else {
          const insertShadow = await run(
            `INSERT INTO foods (name, name_normalized, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, source)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              myProduct.product_name,
              normalizedName,
              foodMacros.per100g.calories,
              foodMacros.per100g.protein,
              foodMacros.per100g.carbs,
              foodMacros.per100g.fat,
              'my_products'
            ]
          );
          foodId = insertShadow.id;
        }
      } else {
        // 2. Fallback to existing foods/external API logic
        let food = await get(
          `SELECT id, name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, source
           FROM foods
           WHERE name_normalized = ?`,
          [normalizedName]
        );

        const curated = findCuratedMatch(normalizedName);
        if (food && curated) {
          food = {
            ...food,
            calories_per_100g: curated.values.calories_per_100g,
            protein_per_100g: curated.values.protein_per_100g,
            carbs_per_100g: curated.values.carbs_per_100g,
            fat_per_100g: curated.values.fat_per_100g,
            source: 'curated'
          };
          await run(
            `UPDATE foods SET calories_per_100g = ?, protein_per_100g = ?, carbs_per_100g = ?, fat_per_100g = ?, source = ?
             WHERE id = ?`,
            [curated.values.calories_per_100g, curated.values.protein_per_100g, curated.values.carbs_per_100g, curated.values.fat_per_100g, 'curated', food.id]
          );
        } else if (!food) {
          try {
            const nutrition = await fetchOpenFoodFactsNutrition(item.name);
            const insertFood = await run(
              `INSERT INTO foods (name, name_normalized, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, source)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [
                item.name,
                normalizedName,
                nutrition.calories_per_100g,
                nutrition.protein_per_100g,
                nutrition.carbs_per_100g,
                nutrition.fat_per_100g,
                nutrition.source
              ]
            );
            food = {
              id: insertFood.id,
              name: item.name,
              calories_per_100g: nutrition.calories_per_100g,
              protein_per_100g: nutrition.protein_per_100g,
              carbs_per_100g: nutrition.carbs_per_100g,
              fat_per_100g: nutrition.fat_per_100g,
              source: nutrition.source
            };
          } catch (error) {
            console.error(`Failed to fetch nutrition for ${item.name}:`, error);
            return res.status(400).json({
              message: 'Validation error',
              errors: [`Nutrition data not found for "${item.name}". Please enter macros manually.`]
            });
          }
        }

        const scale = item.quantityGrams / 100;
        foodMacros = {
          calories: food.calories_per_100g * scale,
          protein: food.protein_per_100g * scale,
          carbs: food.carbs_per_100g * scale,
          fat: food.fat_per_100g * scale,
          per100g: {
            calories: food.calories_per_100g,
            protein: food.protein_per_100g,
            carbs: food.carbs_per_100g,
            fat: food.fat_per_100g
          }
        };
        foodSource = food.source;
        foodId = food.id;
      }

      totals = {
        calories: totals.calories + foodMacros.calories,
        protein: totals.protein + foodMacros.protein,
        carbs: totals.carbs + foodMacros.carbs,
        fat: totals.fat + foodMacros.fat
      };

      ingredientRows.push({
        foodId: foodId,
        foodName: item.name,
        quantityGrams: item.quantityGrams,
        calories: foodMacros.calories,
        protein: foodMacros.protein,
        carbs: foodMacros.carbs,
        fat: foodMacros.fat,
        per100g: foodMacros.per100g,
        source: foodSource
      });
    }

    const insertMealSql = `
      INSERT INTO meal_entries (
        entry_date,
        meal,
        calories,
        protein,
        carbs,
        fat,
        zinc,
        magnesium,
        potassium,
        sodium,
        notes
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const mealResult = await run(insertMealSql, [
      entryDate,
      mealName,
      totals.calories,
      totals.protein,
      totals.carbs,
      totals.fat,
      0,
      0,
      0,
      0,
      entryNotes
    ]);

    for (const row of ingredientRows) {
      await run(
        `INSERT INTO ingredient_entries (meal_entry_id, food_id, quantity_grams, calories, protein, carbs, fat)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [mealResult.id, row.foodId, row.quantityGrams, row.calories, row.protein, row.carbs, row.fat]
      );
    }

    res.status(201).json({
      id: mealResult.id,
      date: entryDate,
      meal: mealName,
      notes: entryNotes,
      calories: totals.calories,
      protein: totals.protein,
      carbs: totals.carbs,
      fat: totals.fat,
      ingredients: ingredientRows
    });
  })
);

app.get(
  '/api/meals/:id/ingredients',
  asyncHandler(async (req, res) => {
    const rawId = String(req.params.id || '').trim();
    const id = Number(rawId);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ message: 'Invalid meal id.' });
    }

    const meal = await get(
      `SELECT id, entry_date AS date, meal, calories, protein, carbs, fat, created_at
       FROM meal_entries
       WHERE id = ?`,
      [id]
    );

    if (!meal) {
      return res.status(404).json({ message: 'Meal not found.' });
    }

    const ingredients = await all(
      `SELECT
         ie.id,
         ie.quantity_grams AS quantityGrams,
         ie.calories,
         ie.protein,
         ie.carbs,
         ie.fat,
         f.id AS foodId,
         f.name AS foodName,
         f.calories_per_100g AS caloriesPer100g,
         f.protein_per_100g AS proteinPer100g,
         f.carbs_per_100g AS carbsPer100g,
         f.fat_per_100g AS fatPer100g,
         f.source
       FROM ingredient_entries ie
       JOIN foods f ON f.id = ie.food_id
       WHERE ie.meal_entry_id = ?
       ORDER BY ie.id ASC`,
      [id]
    );

    res.json({ meal, ingredients });
  })
);

app.put(
  '/api/meals/:id',
  asyncHandler(async (req, res) => {
    const rawId = String(req.params.id || '').trim();
    const id = Number(rawId);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ message: 'Invalid meal id.' });
    }

    const { date, meal, calories, protein, carbs, fat, zinc, magnesium, potassium, sodium, notes } = req.body || {};

    const payload = {
      date: (date || '').trim(),
      meal: (meal || '').trim(),
      calories: parseNumber(calories),
      protein: parseNumber(protein),
      carbs: parseNumber(carbs),
      fat: parseNumber(fat),
      zinc: parseNumber(zinc) || 0,
      magnesium: parseNumber(magnesium) || 0,
      potassium: parseNumber(potassium) || 0,
      sodium: parseNumber(sodium) || 0,
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

    const updateSql = `
      UPDATE meal_entries
      SET entry_date = ?, meal = ?, calories = ?, protein = ?, carbs = ?, fat = ?, zinc = ?, magnesium = ?, potassium = ?, sodium = ?, notes = ?
      WHERE id = ?
    `;

    const result = await run(updateSql, [
      payload.date,
      payload.meal,
      payload.calories,
      payload.protein,
      payload.carbs,
      payload.fat,
      payload.zinc,
      payload.magnesium,
      payload.potassium,
      payload.sodium,
      payload.notes,
      id
    ]);

    if (result.changes === 0) {
      const fallbackResult = await run(
        `UPDATE meal_entries
         SET entry_date = ?, meal = ?, calories = ?, protein = ?, carbs = ?, fat = ?, zinc = ?, magnesium = ?, potassium = ?, sodium = ?, notes = ?
         WHERE TRIM(CAST(id AS TEXT)) = ?`,
        [
          payload.date,
          payload.meal,
          payload.calories,
          payload.protein,
          payload.carbs,
          payload.fat,
          payload.zinc,
          payload.magnesium,
          payload.potassium,
          payload.sodium,
          payload.notes,
          rawId
        ]
      );

      if (fallbackResult.changes === 0) {
        return res.status(404).json({ message: 'Meal not found.', dbPath });
      }
    }

    res.json({ id, ...payload });
  })
);

app.delete(
  '/api/meals/:id',
  asyncHandler(async (req, res) => {
    const rawId = String(req.params.id || '').trim();
    const id = Number(rawId);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ message: 'Invalid meal id.' });
    }

    const result = await run('DELETE FROM meal_entries WHERE id = ?', [id]);

    if (result.changes === 0) {
      const fallbackResult = await run(
        'DELETE FROM meal_entries WHERE TRIM(CAST(id AS TEXT)) = ?',
        [rawId]
      );

      if (fallbackResult.changes === 0) {
        return res.status(404).json({ message: 'Meal not found.', dbPath });
      }
    }

    res.json({ deleted: true });
  })
);

app.get(
  '/api/meals',
  asyncHandler(async (req, res) => {
    const date = (req.query.date || getToday()).trim();

    const rows = await all(
      `SELECT id, entry_date AS date, meal, calories, protein, carbs, fat, zinc, magnesium, potassium, sodium, notes, created_at
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
        COALESCE(SUM(fat), 0) AS fat,
        COALESCE(SUM(zinc), 0) AS zinc,
        COALESCE(SUM(magnesium), 0) AS magnesium,
        COALESCE(SUM(potassium), 0) AS potassium,
        COALESCE(SUM(sodium), 0) AS sodium
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
        COALESCE(SUM(fat), 0) AS fat,
        COALESCE(SUM(zinc), 0) AS zinc,
        COALESCE(SUM(magnesium), 0) AS magnesium,
        COALESCE(SUM(potassium), 0) AS potassium,
        COALESCE(SUM(sodium), 0) AS sodium
       FROM meal_entries
       WHERE entry_date = ?
       GROUP BY meal
       ORDER BY meal ASC`,
      [date]
    );

    res.json({ date, totals, byMeal });
  })
);

// ============================================
// MY PRODUCTS ENDPOINTS (Temporary until ML model is ready)
// ============================================

// Get all products or search by name
app.get(
  '/api/my-products',
  asyncHandler(async (req, res) => {
    const search = (req.query.search || '').trim();
    const favoriteOnly = req.query.favorite === 'true';

    let sql = `SELECT * FROM my_products WHERE 1=1`;
    const params = [];

    if (search) {
      sql += ` AND (product_name LIKE ? OR brand LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    if (favoriteOnly) {
      sql += ` AND is_favorite = 1`;
    }

    sql += ` ORDER BY is_favorite DESC, product_name ASC`;

    const products = await all(sql, params);
    res.json({ products });
  })
);

// Get a single product by ID
app.get(
  '/api/my-products/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ message: 'Invalid product id.' });
    }

    const product = await get(
      `SELECT * FROM my_products WHERE id = ?`,
      [id]
    );

    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    res.json(product);
  })
);

// Create a new product
app.post(
  '/api/my-products',
  asyncHandler(async (req, res) => {
    const {
      product_name,
      brand,
      serving_size,
      serving_unit,
      calories,
      protein,
      carbs,
      fat,
      fiber,
      sugar,
      notes,
      is_favorite
    } = req.body || {};

    const payload = {
      product_name: (product_name || '').trim(),
      brand: brand ? String(brand).trim() : null,
      serving_size: parseNumber(serving_size),
      serving_unit: (serving_unit || 'g').trim(),
      calories: parseNumber(calories),
      protein: parseNumber(protein),
      carbs: parseNumber(carbs),
      fat: parseNumber(fat),
      fiber: parseNumber(fiber) || 0,
      sugar: parseNumber(sugar) || 0,
      notes: notes ? String(notes).trim() : null,
      is_favorite: is_favorite ? 1 : 0
    };

    const errors = [];
    if (!payload.product_name) errors.push('Product name is required.');
    if (payload.serving_size === null || payload.serving_size <= 0) {
      errors.push('Serving size must be a positive number.');
    }
    if (payload.calories === null) errors.push('Calories must be a number.');
    if (payload.protein === null) errors.push('Protein must be a number.');
    if (payload.carbs === null) errors.push('Carbs must be a number.');
    if (payload.fat === null) errors.push('Fat must be a number.');

    if (errors.length > 0) {
      return res.status(400).json({ message: 'Validation error', errors });
    }

    try {
      const result = await run(
        `INSERT INTO my_products (
          product_name, brand, serving_size, serving_unit,
          calories, protein, carbs, fat, fiber, sugar, notes, is_favorite
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          payload.product_name,
          payload.brand,
          payload.serving_size,
          payload.serving_unit,
          payload.calories,
          payload.protein,
          payload.carbs,
          payload.fat,
          payload.fiber,
          payload.sugar,
          payload.notes,
          payload.is_favorite
        ]
      );

      res.status(201).json({
        id: result.id,
        ...payload
      });
    } catch (error) {
      if (error.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({
          message: 'Validation error',
          errors: ['A product with this name already exists.']
        });
      }
      throw error;
    }
  })
);

// Update a product
app.put(
  '/api/my-products/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ message: 'Invalid product id.' });
    }

    const {
      product_name,
      brand,
      serving_size,
      serving_unit,
      calories,
      protein,
      carbs,
      fat,
      fiber,
      sugar,
      notes,
      is_favorite
    } = req.body || {};

    const payload = {
      product_name: (product_name || '').trim(),
      brand: brand ? String(brand).trim() : null,
      serving_size: parseNumber(serving_size),
      serving_unit: (serving_unit || 'g').trim(),
      calories: parseNumber(calories),
      protein: parseNumber(protein),
      carbs: parseNumber(carbs),
      fat: parseNumber(fat),
      fiber: parseNumber(fiber) || 0,
      sugar: parseNumber(sugar) || 0,
      notes: notes ? String(notes).trim() : null,
      is_favorite: is_favorite ? 1 : 0
    };

    const errors = [];
    if (!payload.product_name) errors.push('Product name is required.');
    if (payload.serving_size === null || payload.serving_size <= 0) {
      errors.push('Serving size must be a positive number.');
    }
    if (payload.calories === null) errors.push('Calories must be a number.');
    if (payload.protein === null) errors.push('Protein must be a number.');
    if (payload.carbs === null) errors.push('Carbs must be a number.');
    if (payload.fat === null) errors.push('Fat must be a number.');

    if (errors.length > 0) {
      return res.status(400).json({ message: 'Validation error', errors });
    }

    try {
      const result = await run(
        `UPDATE my_products
         SET product_name = ?, brand = ?, serving_size = ?, serving_unit = ?,
             calories = ?, protein = ?, carbs = ?, fat = ?,
             fiber = ?, sugar = ?, notes = ?, is_favorite = ?,
             updated_at = datetime('now')
         WHERE id = ?`,
        [
          payload.product_name,
          payload.brand,
          payload.serving_size,
          payload.serving_unit,
          payload.calories,
          payload.protein,
          payload.carbs,
          payload.fat,
          payload.fiber,
          payload.sugar,
          payload.notes,
          payload.is_favorite,
          id
        ]
      );

      if (result.changes === 0) {
        return res.status(404).json({ message: 'Product not found.' });
      }

      res.json({ id, ...payload });
    } catch (error) {
      if (error.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({
          message: 'Validation error',
          errors: ['A product with this name already exists.']
        });
      }
      throw error;
    }
  })
);

// Delete a product
app.delete(
  '/api/my-products/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ message: 'Invalid product id.' });
    }

    const result = await run('DELETE FROM my_products WHERE id = ?', [id]);

    if (result.changes === 0) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    res.json({ deleted: true });
  })
);

// Calculate macros for a product based on quantity
app.post(
  '/api/my-products/:id/calculate',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ message: 'Invalid product id.' });
    }

    const quantity = parseNumber(req.body.quantity);
    if (quantity === null || quantity <= 0) {
      return res.status(400).json({
        message: 'Validation error',
        errors: ['Quantity must be a positive number.']
      });
    }

    const product = await get(
      `SELECT * FROM my_products WHERE id = ?`,
      [id]
    );

    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    const multiplier = quantity / product.serving_size;

    res.json({
      product_name: product.product_name,
      brand: product.brand,
      quantity: quantity,
      unit: product.serving_unit,
      macros: {
        calories: product.calories * multiplier,
        protein: product.protein * multiplier,
        carbs: product.carbs * multiplier,
        fat: product.fat * multiplier,
        fiber: product.fiber * multiplier,
        sugar: product.sugar * multiplier
      }
    });
  })
);


app.listen(PORT, () => {
  console.log(`Macro tracker API running on port ${PORT}`);
});
