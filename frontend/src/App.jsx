import { useEffect, useMemo, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const emptyForm = {
  meal: '',
  calories: '',
  protein: '',
  carbs: '',
  fat: '',
  zinc: '',
  magnesium: '',
  potassium: '',
  sodium: '',
  notes: ''
};

const getLocalDate = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60000);
  return local.toISOString().slice(0, 10);
};

const formatNumber = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return '0';
  return num % 1 === 0 ? num.toString() : num.toFixed(1);
};

const defaultGoals = {
  calories: 2000,
  protein: 150,
  carbs: 250,
  fat: 70,
  zinc: 11,
  magnesium: 400,
  potassium: 3400,
  sodium: 2300
};

const loadGoals = () => {
  if (typeof window === 'undefined') return defaultGoals;
  try {
    const stored = window.localStorage.getItem('macroGoals');
    if (!stored) return defaultGoals;
    const parsed = JSON.parse(stored);
    return { ...defaultGoals, ...parsed };
  } catch (error) {
    return defaultGoals;
  }
};

export default function App() {
  const [date, setDate] = useState(getLocalDate());
  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState({ totals: {}, byMeal: [] });
  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState({ loading: false, error: '', success: '' });
  const [entryMode, setEntryMode] = useState('macros');
  const [ingredientsForm, setIngredientsForm] = useState([
    { name: '', quantityGrams: '' }
  ]);
  const [expandedMealId, setExpandedMealId] = useState(null);
  const [ingredientsByMeal, setIngredientsByMeal] = useState({});
  const [ingredientsLoadingId, setIngredientsLoadingId] = useState(null);
  const [view, setView] = useState('meals');
  const [editingId, setEditingId] = useState(null);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [goals, setGoals] = useState(loadGoals);

  const totalStats = useMemo(() => {
    const totals = summary?.totals || {};
    return [
      { label: 'Calories', value: formatNumber(totals.calories), unit: 'kcal' },
      { label: 'Protein', value: formatNumber(totals.protein), unit: 'g' },
      { label: 'Carbs', value: formatNumber(totals.carbs), unit: 'g' },
      { label: 'Fat', value: formatNumber(totals.fat), unit: 'g' }
    ];
  }, [summary]);

  const goalStats = useMemo(() => {
    const totals = summary?.totals || {};
    const build = (key, label, unit) => {
      const goalValue = Number(goals[key]);
      const goal = Number.isFinite(goalValue) && goalValue > 0 ? goalValue : 0;
      const consumed = Number(totals[key] || 0);
      const progress = goal > 0 ? Math.min((consumed / goal) * 100, 100) : 0;
      const remaining = goal - consumed;
      const remainingLabel =
        goal === 0
          ? 'Set a goal'
          : remaining >= 0
            ? `${formatNumber(remaining)} ${unit} left`
            : `${formatNumber(Math.abs(remaining))} ${unit} over`;

      return {
        key,
        label,
        unit,
        goal,
        consumed,
        progress,
        remainingLabel,
        isOver: goal > 0 && consumed > goal
      };
    };

    return [
      build('calories', 'Calories', 'kcal'),
      build('protein', 'Protein', 'g'),
      build('carbs', 'Carbs', 'g'),
      build('fat', 'Fat', 'g'),
      build('zinc', 'Zinc', 'mg'),
      build('magnesium', 'Magnesium', 'mg'),
      build('potassium', 'Potassium', 'mg'),
      build('sodium', 'Sodium', 'mg')
    ];
  }, [goals, summary]);

  const fetchData = async (targetDate = date) => {
    setStatus((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const [mealsRes, summaryRes] = await Promise.all([
        fetch(`${API_URL}/api/meals?date=${targetDate}`),
        fetch(`${API_URL}/api/summary?date=${targetDate}`)
      ]);

      if (!mealsRes.ok || !summaryRes.ok) {
        throw new Error('Failed to load data');
      }

      const mealsData = await mealsRes.json();
      const summaryData = await summaryRes.json();
      setEntries(mealsData.entries || []);
      setSummary(summaryData || { totals: {}, byMeal: [] });
    } catch (error) {
      setStatus((prev) => ({ ...prev, error: 'Unable to load macro data.' }));
    } finally {
      setStatus((prev) => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    fetchData(date);
  }, [date]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('macroGoals', JSON.stringify(goals));
  }, [goals]);

  const handleFormChange = (field) => (event) => {
    const value = event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
    setStatus((prev) => ({ ...prev, error: '', success: '' }));
  };

  const handleGoalChange = (field) => (event) => {
    const value = event.target.value;
    setGoals((prev) => ({
      ...prev,
      [field]: value === '' ? '' : Number(value)
    }));
  };

  const startEdit = (entry) => {
    setEditingId(entry.id);
    setDate(entry.date || date);
    setForm({
      meal: entry.meal || '',
      calories: entry.calories?.toString() || '',
      protein: entry.protein?.toString() || '',
      carbs: entry.carbs?.toString() || '',
      fat: entry.fat?.toString() || '',
      zinc: entry.zinc?.toString() || '',
      magnesium: entry.magnesium?.toString() || '',
      potassium: entry.potassium?.toString() || '',
      sodium: entry.sodium?.toString() || '',
      notes: entry.notes || ''
    });
    setStatus({ loading: false, error: '', success: '' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
    setEntryMode('macros');
    setStatus({ loading: false, error: '', success: '' });
  };

  const addIngredientRow = () => {
    setIngredientsForm((prev) => [...prev, { name: '', quantityGrams: '' }]);
  };

  const removeIngredientRow = (index) => {
    setIngredientsForm((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleIngredientChange = (index, field) => (event) => {
    const value = event.target.value;
    setIngredientsForm((prev) =>
      prev.map((row, idx) => (idx === index ? { ...row, [field]: value } : row))
    );
    setStatus((prev) => ({ ...prev, error: '', success: '' }));
  };

  const toggleIngredientsForMeal = async (mealId) => {
    if (expandedMealId === mealId) {
      setExpandedMealId(null);
      return;
    }

    setExpandedMealId(mealId);

    if (ingredientsByMeal[mealId]) {
      return;
    }

    setIngredientsLoadingId(mealId);
    try {
      const res = await fetch(`${API_URL}/api/meals/${mealId}/ingredients`);
      if (!res.ok) {
        setIngredientsByMeal((prev) => ({ ...prev, [mealId]: { ingredients: [] } }));
        return;
      }
      const data = await res.json();
      setIngredientsByMeal((prev) => ({ ...prev, [mealId]: data }));
    } catch (error) {
      setIngredientsByMeal((prev) => ({ ...prev, [mealId]: { ingredients: [] } }));
    } finally {
      setIngredientsLoadingId(null);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus({ loading: true, error: '', success: '' });

    try {
      const request =
        entryMode === 'ingredients'
          ? {
              url: `${API_URL}/api/meals/from-ingredients`,
              method: 'POST',
              body: {
                date,
                meal: form.meal,
                notes: form.notes,
                ingredients: ingredientsForm.map((item) => ({
                  name: item.name,
                  quantityGrams: item.quantityGrams
                }))
              }
            }
          : {
              url: editingId ? `${API_URL}/api/meals/${editingId}` : `${API_URL}/api/meals`,
              method: editingId ? 'PUT' : 'POST',
              body: {
                date,
                meal: form.meal,
                calories: form.calories,
                protein: form.protein,
                carbs: form.carbs,
                fat: form.fat,
                zinc: form.zinc,
                magnesium: form.magnesium,
                potassium: form.potassium,
                sodium: form.sodium,
                notes: form.notes
              }
            };

      const response = await fetch(request.url, {
        method: request.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request.body)
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message = payload?.errors?.join(' ') || payload?.message || 'Unable to save meal.';
        setStatus({ loading: false, error: message, success: '' });
        return;
      }

      setForm(emptyForm);
      setEditingId(null);
      setMenuOpenId(null);
      setIngredientsForm([{ name: '', quantityGrams: '' }]);
      setEntryMode('macros');
      setStatus({ loading: false, error: '', success: editingId ? 'Meal updated!' : 'Meal saved!' });
      await fetchData(date);
    } catch (error) {
      setStatus({ loading: false, error: 'Unable to save meal.', success: '' });
    }
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm('Delete this meal entry?');
    if (!confirmDelete) return;

    setStatus({ loading: true, error: '', success: '' });

    try {
      const response = await fetch(`${API_URL}/api/meals/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const message = payload?.message || 'Unable to delete meal.';
        setStatus({ loading: false, error: message, success: '' });
        return;
      }

      if (editingId === id) {
        cancelEdit();
      }
      setMenuOpenId(null);
      setStatus({ loading: false, error: '', success: 'Meal deleted.' });
      await fetchData(date);
    } catch (error) {
      setStatus({ loading: false, error: 'Unable to delete meal.', success: '' });
    }
  };

  const mealsContent = entries.length ? (
    <div className="meal-list">
      {entries.map((entry) => (
        <article className={`meal-card${entry.id === editingId ? ' editing' : ''}`} key={entry.id}>
          <header>
            <div>
              <h3>{entry.meal}</h3>
              <p className="meal-notes">{entry.notes || 'No notes'}</p>
            </div>
            <div className="meal-actions">
              <span className="pill">{new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              <button
                className="ghost"
                type="button"
                onClick={() => toggleIngredientsForMeal(entry.id)}
              >
                {expandedMealId === entry.id ? 'Hide ingredients' : 'Ingredients'}
              </button>
              <div className="menu">
                <button
                  className="menu-trigger"
                  type="button"
                  onClick={() => setMenuOpenId(menuOpenId === entry.id ? null : entry.id)}
                  aria-label="Meal actions"
                >
                  ...
                </button>
                {menuOpenId === entry.id && (
                  <div className="menu-list">
                    <button
                      type="button"
                      onClick={() => {
                        startEdit(entry);
                        setMenuOpenId(null);
                      }}
                    >
                      Update
                    </button>
                    <button
                      type="button"
                      className="danger"
                      onClick={() => handleDelete(entry.id)}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>
          <div className="macro-row">
            <span>Calories</span>
            <strong>{formatNumber(entry.calories)} kcal</strong>
          </div>
          <div className="macro-row">
            <span>Protein</span>
            <strong>{formatNumber(entry.protein)} g</strong>
          </div>
          <div className="macro-row">
            <span>Carbs</span>
            <strong>{formatNumber(entry.carbs)} g</strong>
          </div>
          <div className="macro-row">
            <span>Fat</span>
            <strong>{formatNumber(entry.fat)} g</strong>
          </div>
          <div className="macro-row">
            <span>Zinc</span>
            <strong>{formatNumber(entry.zinc)} mg</strong>
          </div>
          <div className="macro-row">
            <span>Magnesium</span>
            <strong>{formatNumber(entry.magnesium)} mg</strong>
          </div>
          <div className="macro-row">
            <span>Potassium</span>
            <strong>{formatNumber(entry.potassium)} mg</strong>
          </div>
          <div className="macro-row">
            <span>Sodium</span>
            <strong>{formatNumber(entry.sodium)} mg</strong>
          </div>

          {expandedMealId === entry.id && (
            <div className="ingredients-panel">
              {ingredientsLoadingId === entry.id && <p className="muted">Loading ingredients...</p>}
              {ingredientsLoadingId !== entry.id && (
                <>
                  {ingredientsByMeal[entry.id]?.ingredients?.length ? (
                    <div className="ingredients-list">
                      {ingredientsByMeal[entry.id].ingredients.map((ingredient) => (
                        <div className="ingredient-row" key={ingredient.id}>
                          <div>
                            <strong>{ingredient.foodName}</strong>
                            <span className="muted">{formatNumber(ingredient.quantityGrams)} g</span>
                          </div>
                          <div className="ingredient-macros">
                            <span>{formatNumber(ingredient.calories)} kcal</span>
                            <span>{formatNumber(ingredient.protein)} P</span>
                            <span>{formatNumber(ingredient.carbs)} C</span>
                            <span>{formatNumber(ingredient.fat)} F</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="empty">No ingredients found for this meal.</p>
                  )}
                </>
              )}
            </div>
          )}
        </article>
      ))}
    </div>
  ) : (
    <p className="empty">No meals logged yet. Add your first meal to get started.</p>
  );

  const totalsContent = (
    <div className="totals-view">
      <div className="totals-grid">
        {totalStats.map((stat) => (
          <div className="stat" key={stat.label}>
            <p>{stat.label}</p>
            <h3>
              {stat.value}
              <span>{stat.unit}</span>
            </h3>
          </div>
        ))}
      </div>
      <div className="divider" />
      <h4 className="section-title">By Meal</h4>
      {summary.byMeal?.length ? (
        <div className="meal-summary">
          {summary.byMeal.map((meal) => (
            <div className="meal-summary-row" key={meal.meal}>
              <div>
                <strong>{meal.meal}</strong>
                <span className="muted">{meal.entries} entries</span>
              </div>
              <div className="meal-summary-macros">
                <span>{formatNumber(meal.calories)} kcal</span>
                <span>{formatNumber(meal.protein)} P</span>
                <span>{formatNumber(meal.carbs)} Carbs</span>
                <span>{formatNumber(meal.fat)} Fat</span>
                <span>{formatNumber(meal.zinc)} Zn</span>
                <span>{formatNumber(meal.magnesium)} Mg</span>
                <span>{formatNumber(meal.potassium)} K</span>
                <span>{formatNumber(meal.sodium)} Na</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="empty">Daily totals will show once you log meals.</p>
      )}
    </div>
  );

  return (
    <div className="app">
      <header className="hero">
        <div>
          <p className="eyebrow">Macro Tracker</p>
          <h1>Track each meal. See the day unfold.</h1>
          <p className="subtitle">
            Log your macros by meal and instantly review daily totals whenever you need them.
          </p>
        </div>
        <div className="date-picker">
          <label htmlFor="date">Choose a day</label>
          <input
            id="date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </div>
      </header>

      <main className="layout">
        <section className="card form-card">
          <h2>Add a meal</h2>
          <p className="muted">Capture what you just ate and the macros that went with it.</p>
          <div className="tabs mode-tabs">
            <button
              className={entryMode === 'macros' ? 'active' : ''}
              type="button"
              onClick={() => setEntryMode('macros')}
              disabled={status.loading || Boolean(editingId)}
            >
              Macros
            </button>
            <button
              className={entryMode === 'ingredients' ? 'active' : ''}
              type="button"
              onClick={() => setEntryMode('ingredients')}
              disabled={status.loading || Boolean(editingId)}
            >
              Ingredients
            </button>
          </div>
          {editingId && (
            <div className="edit-banner">
              <span>Editing meal entry</span>
              <button className="ghost" type="button" onClick={cancelEdit}>
                Cancel
              </button>
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <label>
              Meal name
              <input
                type="text"
                placeholder="Breakfast, Lunch, Snack..."
                value={form.meal}
                onChange={handleFormChange('meal')}
              />
            </label>

            {entryMode === 'macros' ? (
              <div className="grid-2">
                <label>
                  Calories
                  <input
                    type="number"
                    step="0.1"
                    placeholder="0"
                    value={form.calories}
                    onChange={handleFormChange('calories')}
                    required
                  />
                </label>
                <label>
                  Protein (g)
                  <input
                    type="number"
                    step="0.1"
                    placeholder="0"
                    value={form.protein}
                    onChange={handleFormChange('protein')}
                    required
                  />
                </label>
                <label>
                  Carbs (g)
                  <input
                    type="number"
                    step="0.1"
                    placeholder="0"
                    value={form.carbs}
                    onChange={handleFormChange('carbs')}
                    required
                  />
                </label>
                <label>
                  Fat (g)
                  <input
                    type="number"
                    step="0.1"
                    placeholder="0"
                    value={form.fat}
                    onChange={handleFormChange('fat')}
                    required
                  />
                </label>
                <label>
                  Zinc (mg)
                  <input
                    type="number"
                    step="0.1"
                    placeholder="0"
                    value={form.zinc}
                    onChange={handleFormChange('zinc')}
                  />
                </label>
                <label>
                  Magnesium (mg)
                  <input
                    type="number"
                    step="0.1"
                    placeholder="0"
                    value={form.magnesium}
                    onChange={handleFormChange('magnesium')}
                  />
                </label>
                <label>
                  Potassium (mg)
                  <input
                    type="number"
                    step="0.1"
                    placeholder="0"
                    value={form.potassium}
                    onChange={handleFormChange('potassium')}
                  />
                </label>
                <label>
                  Sodium (mg)
                  <input
                    type="number"
                    step="0.1"
                    placeholder="0"
                    value={form.sodium}
                    onChange={handleFormChange('sodium')}
                  />
                </label>
              </div>
            ) : (
              <div className="ingredients-editor">
                {ingredientsForm.map((row, idx) => (
                  <div className="ingredient-input" key={idx}>
                    <input
                      type="text"
                      placeholder="Food name (e.g., banana)"
                      value={row.name}
                      onChange={handleIngredientChange(idx, 'name')}
                      required
                    />
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="Grams"
                      value={row.quantityGrams}
                      onChange={handleIngredientChange(idx, 'quantityGrams')}
                      required
                    />
                    <button
                      className="ghost"
                      type="button"
                      onClick={() => removeIngredientRow(idx)}
                      disabled={ingredientsForm.length === 1}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button className="ghost" type="button" onClick={addIngredientRow}>
                  Add ingredient
                </button>
                <p className="muted">
                  If a food is not found locally, we will look it up from OpenFoodFacts and cache it.
                </p>
              </div>
            )}

            <label>
              Notes
              <textarea
                rows="3"
                placeholder="Optional details..."
                value={form.notes}
                onChange={handleFormChange('notes')}
              />
            </label>
            {status.error && <p className="status error">{status.error}</p>}
            {status.success && <p className="status success">{status.success}</p>}
            <button className="primary" type="submit" disabled={status.loading}>
              {status.loading ? 'Saving...' : editingId ? 'Update meal' : 'Save meal'}
            </button>
          </form>
        </section>

        <section className="card data-card">
          <div className="data-header">
            <div>
              <p className="eyebrow">Day view</p>
              <h2>{date}</h2>
              <p className="muted">{entries.length} meals logged</p>
            </div>
            <div className="tabs">
              <button
                className={view === 'meals' ? 'active' : ''}
                onClick={() => setView('meals')}
                type="button"
              >
                Meals
              </button>
              <button
                className={view === 'totals' ? 'active' : ''}
                onClick={() => setView('totals')}
                type="button"
              >
                Totals
              </button>
            </div>
          </div>

          {status.loading && <p className="status">Loading data...</p>}
          {!status.loading && (view === 'meals' ? mealsContent : totalsContent)}
        </section>
      </main>

      <section className="card goals-card">
        <div className="goals-header">
          <div>
            <p className="eyebrow">Daily goals</p>
            <h2>Macro goals & progress</h2>
            <p className="muted">
              Set targets once and track how much you have left for the day.
            </p>
          </div>
        </div>
        <div className="goals-grid">
          <div className="goals-inputs">
            <label>
              Calories goal (kcal)
              <input
                type="number"
                min="0"
                step="1"
                value={goals.calories}
                onChange={handleGoalChange('calories')}
              />
            </label>
            <label>
              Protein goal (g)
              <input
                type="number"
                min="0"
                step="0.1"
                value={goals.protein}
                onChange={handleGoalChange('protein')}
              />
            </label>
            <label>
              Carbs goal (g)
              <input
                type="number"
                min="0"
                step="0.1"
                value={goals.carbs}
                onChange={handleGoalChange('carbs')}
              />
            </label>
            <label>
              Fat goal (g)
              <input
                type="number"
                min="0"
                step="0.1"
                value={goals.fat}
                onChange={handleGoalChange('fat')}
              />
            </label>
            <label>
              Zinc goal (mg)
              <input
                type="number"
                min="0"
                step="0.1"
                value={goals.zinc}
                onChange={handleGoalChange('zinc')}
              />
            </label>
            <label>
              Magnesium goal (mg)
              <input
                type="number"
                min="0"
                step="0.1"
                value={goals.magnesium}
                onChange={handleGoalChange('magnesium')}
              />
            </label>
            <label>
              Potassium goal (mg)
              <input
                type="number"
                min="0"
                step="0.1"
                value={goals.potassium}
                onChange={handleGoalChange('potassium')}
              />
            </label>
            <label>
              Sodium goal (mg)
              <input
                type="number"
                min="0"
                step="0.1"
                value={goals.sodium}
                onChange={handleGoalChange('sodium')}
              />
            </label>
          </div>
          <div className="goals-bars">
            {goalStats.map((goal) => (
              <div className="goal-item" key={goal.key}>
                <div className="goal-row">
                  <div>
                    <strong>{goal.label}</strong>
                    <span className="muted">Goal: {formatNumber(goal.goal)} {goal.unit}</span>
                  </div>
                  <span className={`goal-remaining${goal.isOver ? ' over' : ''}`}>
                    {goal.remainingLabel}
                  </span>
                </div>
                <div className={`goal-bar${goal.isOver ? ' over' : ''}`}>
                  <span style={{ width: `${goal.progress}%` }} />
                </div>
                <div className="goal-meta">
                  <span>{formatNumber(goal.consumed)} {goal.unit} consumed</span>
                  <span>{Math.round(goal.progress)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
