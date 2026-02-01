import { useEffect, useMemo, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const emptyForm = {
  meal: '',
  calories: '',
  protein: '',
  carbs: '',
  fat: '',
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

export default function App() {
  const [date, setDate] = useState(getLocalDate());
  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState({ totals: {}, byMeal: [] });
  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState({ loading: false, error: '', success: '' });
  const [view, setView] = useState('meals');
  const [editingId, setEditingId] = useState(null);
  const [menuOpenId, setMenuOpenId] = useState(null);

  const totalStats = useMemo(() => {
    const totals = summary?.totals || {};
    return [
      { label: 'Calories', value: formatNumber(totals.calories), unit: 'kcal' },
      { label: 'Protein', value: formatNumber(totals.protein), unit: 'g' },
      { label: 'Carbs', value: formatNumber(totals.carbs), unit: 'g' },
      { label: 'Fat', value: formatNumber(totals.fat), unit: 'g' }
    ];
  }, [summary]);

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

  const handleFormChange = (field) => (event) => {
    const value = event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
    setStatus((prev) => ({ ...prev, error: '', success: '' }));
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
      notes: entry.notes || ''
    });
    setStatus({ loading: false, error: '', success: '' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
    setStatus({ loading: false, error: '', success: '' });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus({ loading: true, error: '', success: '' });

    try {
      const response = await fetch(
        editingId ? `${API_URL}/api/meals/${editingId}` : `${API_URL}/api/meals`,
        {
          method: editingId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date,
            meal: form.meal,
            calories: form.calories,
            protein: form.protein,
            carbs: form.carbs,
            fat: form.fat,
            notes: form.notes
          })
        }
      );

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message = payload?.errors?.join(' ') || payload?.message || 'Unable to save meal.';
        setStatus({ loading: false, error: message, success: '' });
        return;
      }

      setForm(emptyForm);
      setEditingId(null);
      setMenuOpenId(null);
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
                required
              />
            </label>
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
            </div>
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
    </div>
  );
}
