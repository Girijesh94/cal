import { useState } from 'react';

export default function Auth({ onLogin }) {
    const [isRegistering, setIsRegistering] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        try {
            const endpoint = isRegistering ? '/api/register' : '/api/login';
            const res = await fetch(`${API_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || 'Authentication failed');
            }
            if (isRegistering) {
                // Auto login after registering or show success message
                setIsRegistering(false);
                setError('Registration successful! Please login.');
                setPassword('');
            } else {
                localStorage.setItem('cal_token', data.token);
                localStorage.setItem('cal_username', data.user.username);
                onLogin(data.token, data.user.username);
            }
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h1>{isRegistering ? 'Create Account' : 'Welcome Back'}</h1>
                <form onSubmit={handleSubmit}>
                    {error && <div className={`auth-error ${error.includes('successful') ? 'success' : ''}`}>{error}</div>}
                    <div className="form-group">
                        <label>Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit" className="auth-button">
                        {isRegistering ? 'Sign Up' : 'Log In'}
                    </button>
                </form>
                <p className="auth-toggle">
                    {isRegistering ? 'Already have an account? ' : "Don't have an account? "}
                    <button type="button" onClick={() => { setIsRegistering(!isRegistering); setError(null); }}>
                        {isRegistering ? 'Log In' : 'Sign Up'}
                    </button>
                </p>
            </div>
        </div>
    );
}
