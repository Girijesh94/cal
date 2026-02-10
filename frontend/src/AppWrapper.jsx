import { useEffect, useMemo, useState } from 'react';
import MyProducts from './MyProducts';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// Import the original App component logic
import OriginalApp from './App.jsx';

export default function AppWrapper() {
    const [mainView, setMainView] = useState('tracker'); // 'tracker' or 'products'
    const [ingredientsForm, setIngredientsForm] = useState([{ name: '', quantityGrams: '' }]);
    const [entryMode, setEntryMode] = useState('macros');

    const addProductToIngredients = (product) => {
        // Add product to ingredients form with its serving size as default quantity
        setIngredientsForm((prev) => [
            ...prev,
            { name: product.product_name, quantityGrams: product.serving_size.toString() }
        ]);
        setMainView('tracker');
        setEntryMode('ingredients');
    };

    return (
        <div className="app-wrapper">
            <div className="main-tabs-container">
                <button
                    className={`main-tab ${mainView === 'tracker' ? 'active' : ''}`}
                    onClick={() => setMainView('tracker')}
                    type="button"
                >
                    📊 Tracker
                </button>
                <button
                    className={`main-tab ${mainView === 'products' ? 'active' : ''}`}
                    onClick={() => setMainView('products')}
                    type="button"
                >
                    🥗 My Products
                </button>
            </div>

            {mainView === 'tracker' ? (
                <OriginalApp
                    initialIngredientsForm={ingredientsForm}
                    initialEntryMode={entryMode}
                />
            ) : (
                <div className="products-view">
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
