export const authFetch = async (url, options = {}) => {
    const token = localStorage.getItem('cal_token');
    const headers = { ...options.headers };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401 || res.status === 403) {
        window.dispatchEvent(new Event('auth_error'));
        throw new Error('Authentication expired. Please log in again.');
    }
    return res;
};
