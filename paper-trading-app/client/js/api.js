// Feature: paper-trading-app — API fetch wrapper
// Requirements: 2.5

async function get(path) {
  const response = await fetch(`/api${path}`, { credentials: 'include' });
  if (response.status === 401) {
    if (!window.location.pathname.includes('login')) {
      window.location.href = '/login.html';
    }
    return null;
  }
  return response.json();
}

async function post(path, body) {
  const response = await fetch(`/api${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (response.status === 401) {
    if (!window.location.pathname.includes('login')) {
      window.location.href = '/login.html';
    }
    return null;
  }
  return response.json();
}

export { get, post };
