import { useState } from 'react';
import TrackerView from './TrackerView';
import MyProducts from './MyProducts';

export default function App() {
  const [mainView, setMainView] = useState('tracker'); // 'tracker' or 'products'
  const [ingredientsToAdd, setIngredientsToAdd] = useState(null);

  const addProductToIngredients = (product) => {
    // Signal to TrackerView to add this product
    setIngredientsToAdd(product);
    setMainView('tracker');
  };

  return (
    <div className="app">
      <div className="main-tabs">
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
