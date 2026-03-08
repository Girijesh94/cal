import { useState, useEffect } from 'react';
import TrackerView from './TrackerView';
import MyProducts from './MyProducts';
import Auth from './Auth';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('cal_token') || null);
  const [username, setUsername] = useState(localStorage.getItem('cal_username') || null);
  const [mainView, setMainView] = useState('tracker'); // 'tracker' or 'products'
  const [ingredientsToAdd, setIngredientsToAdd] = useState(null);

  useEffect(() => {
    const handleAuthError = () => handleLogout();
    window.addEventListener('auth_error', handleAuthError);
    return () => window.removeEventListener('auth_error', handleAuthError);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('cal_token');
    localStorage.removeItem('cal_username');
    setToken(null);
    setUsername(null);
  };

  const addProductToIngredients = (product) => {
    setIngredientsToAdd(product);
    setMainView('tracker');
  };

  if (!token) {
    return <Auth onLogin={(t, u) => { setToken(t); setUsername(u); }} />;
  }

  return (
    <div className="app">
      <div className="header-tabs">
        <div className="main-tabs" style={{ margin: 0 }}>
          <button
            className={mainView === 'tracker' ? 'active' : ''}
            onClick={() => setMainView('tracker')}
            type="button"
          >
            📊 Tracker
          </button>
          <button
            className={mainView === 'products' ? 'active' : ''}
            onClick={() => setMainView('products')}
            type="button"
          >
            🥗 My Products
          </button>
        </div>
        <div className="tabs-right">
          <span className="user-greeting">👤 {username}</span>
          <button className="logout-button" onClick={handleLogout}>Logout</button>
        </div>
      </div>

      {mainView === 'tracker' ? (
        <TrackerView productToAdd={ingredientsToAdd} onProductAdded={() => setIngredientsToAdd(null)} />
      ) : (
        <div className="products-container">
          <header className="hero">
            <div>
              <p className="eyebrow">My Products</p>
              <h1>Manage your everyday products</h1>
              <p className="subtitle">
                Store macros for products you use frequently and quickly add them to your meals.
              </p>
            </div>
          </header>
          <MyProducts onAddToIngredients={addProductToIngredients} />
        </div>
      )}
    </div>
  );
}
