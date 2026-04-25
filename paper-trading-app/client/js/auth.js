// Feature: paper-trading-app — Auth module
// Requirements: 1.4, 1.5, 2.1, 2.2, 2.3

import { post } from './api.js';
import { showNotification } from './notifications.js';

async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;
  const data = await post('/auth/login', { username, password });
  if (data && data.error) {
    showNotification(data.error, 'error');
  } else {
    window.location.href = 'index.html';
  }
}

async function handleSignup(e) {
  e.preventDefault();
  const username = document.getElementById('signup-username').value;
  const password = document.getElementById('signup-password').value;
  const confirmPassword = document.getElementById('signup-confirm-password').value;

  if (password !== confirmPassword) {
    showNotification('Passwords do not match', 'error');
    return;
  }

  const data = await post('/auth/register', { username, password });
  if (data && data.error) {
    showNotification(data.error, 'error');
  } else {
    window.location.href = 'index.html';
  }
}

async function handleLogout() {
  await post('/auth/logout');
  window.location.href = 'login.html';
}

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  if (loginForm) loginForm.addEventListener('submit', handleLogin);

  const signupForm = document.getElementById('signup-form');
  if (signupForm) signupForm.addEventListener('submit', handleSignup);

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
});
