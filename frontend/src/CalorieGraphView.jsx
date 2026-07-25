import { useState, useEffect, useMemo } from 'react';
import { authFetch } from './authFetch';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function CalorieGraphView() {
  const [timeRange, setTimeRange] = useState('7D'); // '7D', '30D', '90D'
  const [offsetIndex, setOffsetIndex] = useState(0); // 0 = current period, 1 = previous, etc.
  const [targetGoal, setTargetGoal] = useState(() => {
    const saved = localStorage.getItem('cal_daily_goal');
    return saved ? Number(saved) : 2000;
  });
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [tempGoal, setTempGoal] = useState(targetGoal);

  const [dailyData, setDailyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedDayMeals, setSelectedDayMeals] = useState([]);
  const [mealsLoading, setMealsLoading] = useState(false);

  // Helper to format ISO date string (YYYY-MM-DD) in local timezone
  const formatDateLocal = (date) => {
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - offset * 60000);
    return localDate.toISOString().slice(0, 10);
  };

  // Compute startDate and endDate based on timeRange and offsetIndex
  const { startDateStr, endDateStr, dateList } = useMemo(() => {
    const daysCount = timeRange === '7D' ? 7 : timeRange === '30D' ? 30 : 90;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() - offsetIndex * daysCount);

    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - (daysCount - 1));

    const dates = [];
    const curr = new Date(startDate);
    while (curr <= endDate) {
      dates.push(formatDateLocal(curr));
      curr.setDate(curr.getDate() + 1);
    }

    return {
      startDateStr: formatDateLocal(startDate),
      endDateStr: formatDateLocal(endDate),
      dateList: dates
    };
  }, [timeRange, offsetIndex]);

  // Save goal to localStorage
  const handleSaveGoal = () => {
    const val = Number(tempGoal);
    if (!isNaN(val) && val > 0) {
      setTargetGoal(val);
      localStorage.setItem('cal_daily_goal', val.toString());
    }
    setIsEditingGoal(false);
  };

  // Fetch daily summary data for range
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    authFetch(`${API_URL}/api/analytics/daily?startDate=${startDateStr}&endDate=${endDateStr}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load analytics data.');
        return res.json();
      })
      .then((data) => {
        if (!isMounted) return;
        setDailyData(data.daily || []);
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message);
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [startDateStr, endDateStr]);

  // Combine full date range list with backend data (fill 0s for missing dates)
  const fullRangeData = useMemo(() => {
    const map = new Map();
    dailyData.forEach((item) => {
      map.set(item.date, item);
    });

    return dateList.map((dateStr) => {
      const existing = map.get(dateStr);
      return (
        existing || {
          date: dateStr,
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          mealCount: 0
        }
      );
    });
  }, [dateList, dailyData]);

  // Select today or last date by default when range changes
  useEffect(() => {
    if (fullRangeData.length > 0) {
      const todayStr = formatDateLocal(new Date());
      const hasToday = fullRangeData.some((d) => d.date === todayStr);
      if (hasToday) {
        setSelectedDate(todayStr);
      } else {
        setSelectedDate(fullRangeData[fullRangeData.length - 1].date);
      }
    }
  }, [startDateStr, endDateStr]);

  // Fetch meal details for selected date
  useEffect(() => {
    if (!selectedDate) return;
    let isMounted = true;
    setMealsLoading(true);

    authFetch(`${API_URL}/api/meals?date=${selectedDate}`)
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        setSelectedDayMeals(data.entries || []);
        setMealsLoading(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setSelectedDayMeals([]);
        setMealsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedDate]);

  // Summary Metrics calculations
  const stats = useMemo(() => {
    if (!fullRangeData.length) {
      return { total: 0, avg: 0, highest: 0, metCount: 0, activeDays: 0 };
    }
    let total = 0;
    let highest = 0;
    let metCount = 0;
    let activeDays = 0;

    fullRangeData.forEach((d) => {
      total += d.calories;
      if (d.calories > highest) highest = d.calories;
      if (d.calories >= targetGoal) metCount++;
      if (d.calories > 0) activeDays++;
    });

    const avg = Math.round(total / fullRangeData.length);
    return { total, avg, highest, metCount, activeDays };
  }, [fullRangeData, targetGoal]);

  // Selected Day summary data
  const selectedDayData = useMemo(() => {
    return (
      fullRangeData.find((d) => d.date === selectedDate) || {
        date: selectedDate,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0
      }
    );
  }, [fullRangeData, selectedDate]);

  // Max value for Y-axis scaling on bar chart
  const maxYValue = useMemo(() => {
    const maxVal = Math.max(stats.highest, targetGoal);
    return Math.ceil((maxVal * 1.15) / 500) * 500 || 2500;
  }, [stats.highest, targetGoal]);

  // Format label helper
  const formatDateLabel = (dateStr) => {
    const parts = dateStr.split('-');
    const dateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    if (timeRange === '7D') {
      return {
        top: dateObj.toLocaleDateString('en-US', { weekday: 'short' }),
        bottom: dateObj.getDate()
      };
    }
    return {
      top: dateObj.toLocaleDateString('en-US', { month: 'short' }),
      bottom: dateObj.getDate()
    };
  };

  const formatRangeText = () => {
    const start = new Date(startDateStr + 'T00:00:00');
    const end = new Date(endDateStr + 'T00:00:00');
    const options = { month: 'short', day: 'numeric' };
    return `${start.toLocaleDateString('en-US', options)} – ${end.toLocaleDateString('en-US', options)}, ${end.getFullYear()}`;
  };

  return (
    <div className="ios-analytics-container">
      {/* Top Header & Range Controls */}
      <div className="ios-analytics-header">
        <div>
          <span className="ios-eyebrow">Health Analytics</span>
          <h1 className="ios-analytics-title">Daily Calorie Trends</h1>
          <p className="ios-range-text">{formatRangeText()}</p>
        </div>

        <div className="ios-controls-row">
          {/* Segmented Time Control */}
          <div className="ios-segmented-control">
            <button
              className={timeRange === '7D' ? 'active' : ''}
              onClick={() => { setTimeRange('7D'); setOffsetIndex(0); }}
              type="button"
            >
              7D
            </button>
            <button
              className={timeRange === '30D' ? 'active' : ''}
              onClick={() => { setTimeRange('30D'); setOffsetIndex(0); }}
              type="button"
            >
              30D
            </button>
            <button
              className={timeRange === '90D' ? 'active' : ''}
              onClick={() => { setTimeRange('90D'); setOffsetIndex(0); }}
              type="button"
            >
              90D
            </button>
          </div>

          {/* Navigation Arrows */}
          <div className="ios-nav-buttons">
            <button
              className="ios-icon-btn"
              onClick={() => setOffsetIndex((prev) => prev + 1)}
              title="Previous Period"
              type="button"
            >
              ‹
            </button>
            {offsetIndex > 0 && (
              <button
                className="ios-today-btn"
                onClick={() => setOffsetIndex(0)}
                type="button"
              >
                Today
              </button>
            )}
            <button
              className="ios-icon-btn"
              disabled={offsetIndex === 0}
              onClick={() => setOffsetIndex((prev) => Math.max(0, prev - 1))}
              title="Next Period"
              type="button"
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="ios-kpi-grid">
        {/* Main Average Card */}
        <div className="ios-kpi-card highlight">
          <div className="ios-kpi-header">
            <span className="ios-kpi-label">DAILY AVERAGE</span>
            <span className="ios-flame-icon">🔥</span>
          </div>
          <div className="ios-kpi-val-row">
            <span className="ios-kpi-value">{stats.avg.toLocaleString()}</span>
            <span className="ios-kpi-unit">kcal / day</span>
          </div>
          <div className="ios-kpi-footer">
            <span className={stats.avg >= targetGoal ? 'badge status-good' : 'badge status-neutral'}>
              {Math.round((stats.avg / targetGoal) * 100)}% of goal
            </span>
          </div>
        </div>

        {/* Goal Card */}
        <div className="ios-kpi-card">
          <div className="ios-kpi-header">
            <span className="ios-kpi-label">DAILY TARGET GOAL</span>
            {!isEditingGoal ? (
              <button className="ios-link-btn" onClick={() => { setTempGoal(targetGoal); setIsEditingGoal(true); }}>
                Edit
              </button>
            ) : null}
          </div>
          {!isEditingGoal ? (
            <div className="ios-kpi-val-row">
              <span className="ios-kpi-value">{targetGoal.toLocaleString()}</span>
              <span className="ios-kpi-unit">kcal</span>
            </div>
          ) : (
            <div className="ios-goal-edit-row">
              <input
                type="number"
                value={tempGoal}
                onChange={(e) => setTempGoal(e.target.value)}
                className="ios-goal-input"
                autoFocus
              />
              <button className="ios-btn-small" onClick={handleSaveGoal}>Save</button>
            </div>
          )}
          <div className="ios-kpi-footer">
            <span className="ios-subtext">
              Target met on {stats.metCount} of {fullRangeData.length} days
            </span>
          </div>
        </div>

        {/* Total Period Calories */}
        <div className="ios-kpi-card">
          <div className="ios-kpi-header">
            <span className="ios-kpi-label">TOTAL CONSUMED</span>
          </div>
          <div className="ios-kpi-val-row">
            <span className="ios-kpi-value">{stats.total.toLocaleString()}</span>
            <span className="ios-kpi-unit">kcal</span>
          </div>
          <div className="ios-kpi-footer">
            <span className="ios-subtext">Peak day: {stats.highest.toLocaleString()} kcal</span>
          </div>
        </div>
      </div>

      {/* iOS Bar Graph Container */}
      <div className="ios-card ios-graph-card">
        <div className="ios-graph-header">
          <div>
            <h3 className="ios-card-title">Calorie Intake</h3>
            <p className="ios-card-subtitle">Select a bar to view daily macro breakdown</p>
          </div>
          {selectedDayData && (
            <div className="ios-selected-tag">
              Selected: <strong>{selectedDayData.date}</strong> ({Math.round(selectedDayData.calories)} kcal)
            </div>
          )}
        </div>

        {loading ? (
          <div className="ios-loading-state">
            <div className="ios-spinner"></div>
            <span>Loading health trends...</span>
          </div>
        ) : error ? (
          <div className="ios-error-state">{error}</div>
        ) : (
          <div className="ios-chart-wrapper">
            {/* Y-Axis scale lines & labels */}
            <div className="ios-chart-grid">
              <div className="ios-grid-line" style={{ bottom: '100%' }}>
                <span>{maxYValue}</span>
              </div>
              <div className="ios-grid-line target-line" style={{ bottom: `${(targetGoal / maxYValue) * 100}%` }}>
                <span className="ios-target-badge">{targetGoal} Target</span>
              </div>
              <div className="ios-grid-line" style={{ bottom: '50%' }}>
                <span>{Math.round(maxYValue / 2)}</span>
              </div>
              <div className="ios-grid-line" style={{ bottom: '0%' }}>
                <span>0</span>
              </div>
            </div>

            {/* Bars container */}
            <div className={`ios-bars-flex range-${timeRange}`}>
              {fullRangeData.map((d) => {
                const isSelected = d.date === selectedDate;
                const heightPercent = Math.min(100, (d.calories / maxYValue) * 100);
                const isGoalMet = d.calories >= targetGoal;
                const label = formatDateLabel(d.date);

                return (
                  <div
                    key={d.date}
                    className={`ios-bar-col ${isSelected ? 'selected' : ''} ${d.calories === 0 ? 'empty' : ''}`}
                    onClick={() => setSelectedDate(d.date)}
                  >
                    {/* Floating Callout Tooltip on Selection */}
                    {isSelected && (
                      <div className="ios-bar-tooltip">
                        <div className="tooltip-title">{d.date}</div>
                        <div className="tooltip-cal">{Math.round(d.calories)} <small>kcal</small></div>
                        <div className="tooltip-macros">
                          <span>P: {Math.round(d.protein)}g</span>
                          <span>C: {Math.round(d.carbs)}g</span>
                          <span>F: {Math.round(d.fat)}g</span>
                        </div>
                      </div>
                    )}

                    {/* Bar track & fill */}
                    <div className="ios-bar-track">
                      <div
                        className={`ios-bar-fill ${isGoalMet ? 'target-met' : 'sub-target'}`}
                        style={{ height: `${Math.max(d.calories > 0 ? 4 : 0, heightPercent)}%` }}
                      >
                        {isSelected && <div className="ios-bar-cap"></div>}
                      </div>
                    </div>

                    {/* X Axis Label */}
                    <div className="ios-bar-label">
                      <span className="label-top">{label.top}</span>
                      {timeRange === '7D' && <span className="label-bottom">{label.bottom}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Selected Day Detailed Breakdown Card */}
      {selectedDate && (
        <div className="ios-card ios-day-detail-card">
          <div className="ios-day-header">
            <div>
              <span className="ios-eyebrow">Day Details</span>
              <h2>{new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</h2>
            </div>
            <div className="ios-day-total">
              <span className="total-num">{Math.round(selectedDayData.calories)}</span>
              <span className="total-label">Total kcal</span>
            </div>
          </div>

          {/* Day Macro Progress Bars */}
          <div className="ios-macro-bars-grid">
            <div className="ios-macro-bar-item">
              <div className="macro-info">
                <span className="macro-name protein">Protein</span>
                <span className="macro-val">{Math.round(selectedDayData.protein)}g</span>
              </div>
              <div className="macro-progress-track">
                <div
                  className="macro-progress-fill protein"
                  style={{ width: `${Math.min(100, (selectedDayData.protein / 150) * 100)}%` }}
                ></div>
              </div>
            </div>

            <div className="ios-macro-bar-item">
              <div className="macro-info">
                <span className="macro-name carbs">Carbs</span>
                <span className="macro-val">{Math.round(selectedDayData.carbs)}g</span>
              </div>
              <div className="macro-progress-track">
                <div
                  className="macro-progress-fill carbs"
                  style={{ width: `${Math.min(100, (selectedDayData.carbs / 250) * 100)}%` }}
                ></div>
              </div>
            </div>

            <div className="ios-macro-bar-item">
              <div className="macro-info">
                <span className="macro-name fat">Fat</span>
                <span className="macro-val">{Math.round(selectedDayData.fat)}g</span>
              </div>
              <div className="macro-progress-track">
                <div
                  className="macro-progress-fill fat"
                  style={{ width: `${Math.min(100, (selectedDayData.fat / 70) * 100)}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Meals list for selected day */}
          <div className="ios-day-meals-section">
            <h4 className="section-title">Logged Meals</h4>
            {mealsLoading ? (
              <div className="ios-loading-text">Loading meals...</div>
            ) : selectedDayMeals.length === 0 ? (
              <div className="ios-empty-meals">
                <p>No meals recorded for this date.</p>
              </div>
            ) : (
              <div className="ios-meals-list">
                {selectedDayMeals.map((meal) => (
                  <div key={meal.id} className="ios-meal-row">
                    <div className="meal-main-info">
                      <span className="meal-badge">{meal.meal}</span>
                      {meal.notes ? <span className="meal-notes">{meal.notes}</span> : null}
                    </div>
                    <div className="meal-macros">
                      <span className="meal-cals">{Math.round(meal.calories)} kcal</span>
                      <span className="meal-split">
                        P: {Math.round(meal.protein)}g | C: {Math.round(meal.carbs)}g | F: {Math.round(meal.fat)}g
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
