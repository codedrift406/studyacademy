export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const token = localStorage.getItem('token');
  const refreshToken = localStorage.getItem('refreshToken');
  const headers = new Headers(init.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const first = await fetch(input, { ...init, headers });
  if (first.status !== 401 || !refreshToken) {
    return first;
  }

  const refreshRes = await fetch('/api/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!refreshRes.ok) {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    return first;
  }
  const refreshData = await refreshRes.json();
  localStorage.setItem('token', refreshData.token);
  localStorage.setItem('refreshToken', refreshData.refreshToken);
  if (refreshData.user) {
    localStorage.setItem('user', JSON.stringify(refreshData.user));
  }

  const retryHeaders = new Headers(init.headers || {});
  retryHeaders.set('Authorization', `Bearer ${refreshData.token}`);
  return fetch(input, { ...init, headers: retryHeaders });
}
