import { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const formatNumber = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return '0';
    return num % 1 === 0 ? num.toString() : num.toFixed(1);
};

export default function MyProducts({ onAddToIngredients }) {
    const [products, setProducts] = useState([]);
    const [form, setForm] = useState({
        product_name: '',
        brand: '',
        serving_size: '',
        serving_unit: 'g',
        calories: '',
        protein: '',
        carbs: '',
        fat: '',
        fiber: '',
        sugar: '',
        notes: '',
        is_favorite: false
    });
    const [editingId, setEditingId] = useState(null);
    const [search, setSearch] = useState('');
    const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
    const [status, setStatus] = useState({ loading: false, error: '', success: '' });

    useEffect(() => {
        fetchProducts();
    }, [search, showFavoritesOnly]);

    const fetchProducts = async () => {
        setStatus((prev) => ({ ...prev, loading: true, error: '' }));
        try {
            const params = new URLSearchParams();
            if (search) params.append('search', search);
            if (showFavoritesOnly) params.append('favorite', 'true');

            const res = await fetch(`${API_URL}/api/my-products?${params}`);
            if (!res.ok) throw new Error('Failed to load products');

            const data = await res.json();
            setProducts(data.products || []);
        } catch (error) {
            setStatus((prev) => ({ ...prev, error: 'Unable to load products.' }));
        } finally {
            setStatus((prev) => ({ ...prev, loading: false }));
        }
    };

    const handleFormChange = (field) => (event) => {
        const value = field === 'is_favorite' ? event.target.checked : event.target.value;
        setForm((prev) => ({ ...prev, [field]: value }));
        setStatus((prev) => ({ ...prev, error: '', success: '' }));
    };

    const startEdit = (product) => {
        setEditingId(product.id);
        setForm({
            product_name: product.product_name || '',
            brand: product.brand || '',
            serving_size: product.serving_size?.toString() || '',
            serving_unit: product.serving_unit || 'g',
            calories: product.calories?.toString() || '',
            protein: product.protein?.toString() || '',
            carbs: product.carbs?.toString() || '',
            fat: product.fat?.toString() || '',
            fiber: product.fiber?.toString() || '',
            sugar: product.sugar?.toString() || '',
            notes: product.notes || '',
            is_favorite: Boolean(product.is_favorite)
        });
        setStatus({ loading: false, error: '', success: '' });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setForm({
            product_name: '',
            brand: '',
            serving_size: '',
            serving_unit: 'g',
            calories: '',
            protein: '',
            carbs: '',
            fat: '',
            fiber: '',
            sugar: '',
            notes: '',
            is_favorite: false
        });
        setStatus({ loading: false, error: '', success: '' });
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setStatus({ loading: true, error: '', success: '' });

        try {
            const url = editingId
                ? `${API_URL}/api/my-products/${editingId}`
                : `${API_URL}/api/my-products`;

            const response = await fetch(url, {
                method: editingId ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });

            const payload = await response.json().catch(() => ({}));

            if (!response.ok) {
                const message = payload?.errors?.join(' ') || payload?.message || 'Unable to save product.';
                setStatus({ loading: false, error: message, success: '' });
                return;
            }

            cancelEdit();
            setStatus({
                loading: false,
                error: '',
                success: editingId ? 'Product updated!' : 'Product saved!'
            });
            await fetchProducts();
        } catch (error) {
            setStatus({ loading: false, error: 'Unable to save product.', success: '' });
        }
    };

    const handleDelete = async (id) => {
        const confirmDelete = window.confirm('Delete this product?');
        if (!confirmDelete) return;

        setStatus({ loading: true, error: '', success: '' });

        try {
            const response = await fetch(`${API_URL}/api/my-products/${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const payload = await response.json().catch(() => ({}));
                const message = payload?.message || 'Unable to delete product.';
                setStatus({ loading: false, error: message, success: '' });
                return;
            }

            if (editingId === id) {
                cancelEdit();
            }
            setStatus({ loading: false, error: '', success: 'Product deleted.' });
            await fetchProducts();
        } catch (error) {
            setStatus({ loading: false, error: 'Unable to delete product.', success: '' });
        }
    };

    return (
        <main className="layout">
            <section className="card form-card">
                <h2>Add Product</h2>
                <p className="muted">Store macros for products you use everyday.</p>

                {editingId && (
                    <div className="edit-banner">
                        <span>Editing product</span>
                        <button className="ghost" type="button" onClick={cancelEdit}>
                            Cancel
                        </button>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="grid-2">
                        <label>
                            Product Name *
                            <input
                                type="text"
                                placeholder="Whey Protein Powder"
                                value={form.product_name}
                                onChange={handleFormChange('product_name')}
                                required
                            />
                        </label>
                        <label>
                            Brand
                            <input
                                type="text"
                                placeholder="Optimum Nutrition"
                                value={form.brand}
                                onChange={handleFormChange('brand')}
                            />
                        </label>
                    </div>

                    <div className="grid-2">
                        <label>
                            Serving Size *
                            <input
                                type="number"
                                step="0.1"
                                min="0"
                                placeholder="30"
                                value={form.serving_size}
                                onChange={handleFormChange('serving_size')}
                                required
                            />
                        </label>
                        <label>
                            Unit
                            <select
                                value={form.serving_unit}
                                onChange={handleFormChange('serving_unit')}
                            >
                                <option value="g">grams (g)</option>
                                <option value="ml">milliliters (ml)</option>
                                <option value="oz">ounces (oz)</option>
                                <option value="cup">cup</option>
                                <option value="tbsp">tablespoon</option>
                                <option value="tsp">teaspoon</option>
                            </select>
                        </label>
                    </div>

                    <div className="grid-2">
                        <label>
                            Calories *
                            <input
                                type="number"
                                step="0.1"
                                min="0"
                                placeholder="120"
                                value={form.calories}
                                onChange={handleFormChange('calories')}
                                required
                            />
                        </label>
                        <label>
                            Protein (g) *
                            <input
                                type="number"
                                step="0.1"
                                min="0"
                                placeholder="24"
                                value={form.protein}
                                onChange={handleFormChange('protein')}
                                required
                            />
                        </label>
                        <label>
                            Carbs (g) *
                            <input
                                type="number"
                                step="0.1"
                                min="0"
                                placeholder="3"
                                value={form.carbs}
                                onChange={handleFormChange('carbs')}
                                required
                            />
                        </label>
                        <label>
                            Fat (g) *
                            <input
                                type="number"
                                step="0.1"
                                min="0"
                                placeholder="1"
                                value={form.fat}
                                onChange={handleFormChange('fat')}
                                required
                            />
                        </label>
                        <label>
                            Fiber (g)
                            <input
                                type="number"
                                step="0.1"
                                min="0"
                                placeholder="0"
                                value={form.fiber}
                                onChange={handleFormChange('fiber')}
                            />
                        </label>
                        <label>
                            Sugar (g)
                            <input
                                type="number"
                                step="0.1"
                                min="0"
                                placeholder="1"
                                value={form.sugar}
                                onChange={handleFormChange('sugar')}
                            />
                        </label>
                    </div>

                    <label>
                        Notes
                        <textarea
                            rows="2"
                            placeholder="Optional details..."
                            value={form.notes}
                            onChange={handleFormChange('notes')}
                        />
                    </label>

                    <label className="checkbox-label">
                        <input
                            type="checkbox"
                            checked={form.is_favorite}
                            onChange={handleFormChange('is_favorite')}
                        />
                        <span>Mark as favorite</span>
                    </label>

                    {status.error && <p className="status error">{status.error}</p>}
                    {status.success && <p className="status success">{status.success}</p>}

                    <button className="primary" type="submit" disabled={status.loading}>
                        {status.loading ? 'Saving...' : editingId ? 'Update Product' : 'Save Product'}
                    </button>
                </form>
            </section>

            <section className="card data-card">
                <div className="data-header">
                    <div>
                        <p className="eyebrow">My Products</p>
                        <h2>Saved Products</h2>
                        <p className="muted">{products.length} products stored</p>
                    </div>
                </div>

                <div className="products-filters">
                    <input
                        type="text"
                        placeholder="Search products..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="search-input"
                    />
                    <label className="checkbox-label">
                        <input
                            type="checkbox"
                            checked={showFavoritesOnly}
                            onChange={(e) => setShowFavoritesOnly(e.target.checked)}
                        />
                        <span>Favorites only</span>
                    </label>
                </div>

                {status.loading && <p className="status">Loading products...</p>}

                {!status.loading && products.length === 0 && (
                    <p className="empty">No products found. Add your first product to get started.</p>
                )}

                {!status.loading && products.length > 0 && (
                    <div className="products-list">
                        {products.map((product) => (
                            <article className={`product-card${product.id === editingId ? ' editing' : ''}`} key={product.id}>
                                <header>
                                    <div>
                                        <h3>
                                            {product.product_name}
                                            {product.is_favorite === 1 && <span className="favorite-star">⭐</span>}
                                        </h3>
                                        {product.brand && <p className="product-brand">{product.brand}</p>}
                                        <p className="product-serving">
                                            Serving: {formatNumber(product.serving_size)} {product.serving_unit}
                                        </p>
                                    </div>
                                    <div className="product-actions">
                                        <button
                                            className="ghost small"
                                            type="button"
                                            onClick={() => onAddToIngredients(product)}
                                            title="Add to ingredients"
                                        >
                                            ➕ Use
                                        </button>
                                        <button
                                            className="ghost small"
                                            type="button"
                                            onClick={() => startEdit(product)}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            className="ghost small danger"
                                            type="button"
                                            onClick={() => handleDelete(product.id)}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </header>
                                <div className="product-macros">
                                    <div className="macro-item">
                                        <span className="macro-label">Calories</span>
                                        <strong>{formatNumber(product.calories)} kcal</strong>
                                    </div>
                                    <div className="macro-item">
                                        <span className="macro-label">Protein</span>
                                        <strong>{formatNumber(product.protein)} g</strong>
                                    </div>
                                    <div className="macro-item">
                                        <span className="macro-label">Carbs</span>
                                        <strong>{formatNumber(product.carbs)} g</strong>
                                    </div>
                                    <div className="macro-item">
                                        <span className="macro-label">Fat</span>
                                        <strong>{formatNumber(product.fat)} g</strong>
                                    </div>
                                    {product.fiber > 0 && (
                                        <div className="macro-item">
                                            <span className="macro-label">Fiber</span>
                                            <strong>{formatNumber(product.fiber)} g</strong>
                                        </div>
                                    )}
                                    {product.sugar > 0 && (
                                        <div className="macro-item">
                                            <span className="macro-label">Sugar</span>
                                            <strong>{formatNumber(product.sugar)} g</strong>
                                        </div>
                                    )}
                                </div>
                                {product.notes && (
                                    <p className="product-notes">{product.notes}</p>
                                )}
                            </article>
                        ))}
                    </div>
                )}
            </section>
        </main>
    );
}
