// public/js/common.js
// Shared client-side utilities: CSRF token retrieval, API Fetch wrapper, Toasts, Auth State, and XSS Sanitization

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

let cachedCsrfToken = null;

async function getCsrfToken() {
  if (cachedCsrfToken) return cachedCsrfToken;

  const cookieToken = getCookie('XSRF-TOKEN');
  if (cookieToken) {
    cachedCsrfToken = cookieToken;
    return cookieToken;
  }

  try {
    const res = await fetch('/api/auth/csrf-token');
    const data = await res.json();
    if (data.success && data.csrfToken) {
      cachedCsrfToken = data.csrfToken;
      return cachedCsrfToken;
    }
  } catch (err) {
    console.warn('[CSRF] Could not pre-fetch token:', err);
  }
  return '';
}

// Global API Fetch helper
async function apiFetch(url, options = {}) {
  const csrfToken = await getCsrfToken();
  const headers = {
    'Accept': 'application/json',
    ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    ...(options.headers || {})
  };

  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  // Handle Unauthorized (401)
  if (response.status === 401) {
    const isLoginPage = window.location.pathname.includes('login.html');
    if (!isLoginPage && !url.includes('/api/auth/me')) {
      showToast('Your session has expired. Please sign in again.', 'warning');
      setTimeout(() => {
        window.location.href = `/login.html?redirect=${encodeURIComponent(window.location.pathname)}`;
      }, 1200);
    }
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || `Request failed with status ${response.status}`);
    }
    return data;
  }

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response;
}

// Toast notification helper
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `custom-toast ${type}`;

  const iconMap = {
    success: 'bi-check-circle-fill text-success',
    danger: 'bi-exclamation-triangle-fill text-danger',
    warning: 'bi-exclamation-circle-fill text-warning',
    info: 'bi-info-circle-fill text-info'
  };

  const iconClass = iconMap[type] || iconMap.info;

  toast.innerHTML = `
    <i class="bi ${iconClass} fs-5"></i>
    <div class="flex-grow-1">${escapeHtml(message)}</div>
    <button type="button" class="btn-close btn-close-sm" aria-label="Close"></button>
  `;

  toast.querySelector('.btn-close').addEventListener('click', () => {
    toast.remove();
  });

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.4s ease';
    setTimeout(() => toast.remove(), 400);
  }, 4000);
}

// XSS Prevention: HTML Escaping
function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Date formatter
function formatDate(isoStr) {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return isoStr;
  }
}

// Navbar session state updater
async function updateNavAuth() {
  try {
    const data = await apiFetch('/api/auth/me');
    const authContainer = document.getElementById('nav-auth-buttons');
    if (!authContainer) return;

    if (data.authenticated && data.user) {
      authContainer.innerHTML = `
        <div class="dropdown">
          <button class="btn btn-outline-secondary dropdown-toggle d-flex align-items-center gap-2" type="button" data-bs-toggle="dropdown" aria-expanded="false">
            <i class="bi bi-person-circle fs-5 text-primary"></i>
            <span class="d-none d-md-inline fw-semibold">${escapeHtml(data.user.name)}</span>
          </button>
          <ul class="dropdown-menu dropdown-menu-end shadow-sm">
            <li><a class="dropdown-item" href="/dashboard.html"><i class="bi bi-speedometer2 me-2"></i>Dashboard</a></li>
            <li><a class="dropdown-item" href="/applications.html"><i class="bi bi-briefcase me-2"></i>Job Tracker</a></li>
            <li><a class="dropdown-item" href="/profile.html"><i class="bi bi-gear me-2"></i>Account Settings</a></li>
            <li><hr class="dropdown-divider"></li>
            <li><button class="dropdown-item text-danger" id="nav-logout-btn"><i class="bi bi-box-arrow-right me-2"></i>Log Out</button></li>
          </ul>
        </div>
      `;

      document.getElementById('nav-logout-btn')?.addEventListener('click', async () => {
        try {
          await apiFetch('/api/auth/logout', { method: 'POST' });
          showToast('Logged out successfully.', 'info');
          setTimeout(() => {
            window.location.href = '/index.html';
          }, 600);
        } catch (err) {
          showToast(err.message, 'danger');
        }
      });
    } else {
      authContainer.innerHTML = `
        <a href="/login.html" class="btn btn-outline-primary me-2">Log In</a>
        <a href="/register.html" class="btn btn-resumecraft-primary">Create Account</a>
      `;
    }
  } catch (err) {
    console.debug('[Auth Nav] Non-fatal check error:', err);
  }
}

// Debounce helper
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

document.addEventListener('DOMContentLoaded', () => {
  updateNavAuth();
});
