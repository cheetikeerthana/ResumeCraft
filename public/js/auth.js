// public/js/auth.js
// Client-side authentication handlers for Login and Registration with live strength checking and validation

document.addEventListener('DOMContentLoaded', () => {
  // Password visibility toggle handler
  document.querySelectorAll('.password-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      const icon = btn.querySelector('i');
      if (input.type === 'password') {
        input.type = 'text';
        icon.classList.replace('bi-eye', 'bi-eye-slash');
      } else {
        input.type = 'password';
        icon.classList.replace('bi-eye-slash', 'bi-eye');
      }
    });
  });

  // ----------------------------------------------------
  // LOGIN FORM HANDLER
  // ----------------------------------------------------
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const submitBtn = loginForm.querySelector('button[type="submit"]');
      const alertBox = document.getElementById('auth-alert');

      if (!email || !password) {
        showAuthAlert('Please enter both email address and password.', 'warning');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Logging in...';

      try {
        const res = await apiFetch('/api/auth/login', {
          method: 'POST',
          body: { email, password }
        });

        showToast(res.message, 'success');
        const urlParams = new URLSearchParams(window.location.search);
        const redirect = urlParams.get('redirect') || '/dashboard.html';

        setTimeout(() => {
          window.location.href = redirect;
        }, 700);
      } catch (err) {
        showAuthAlert(err.message, 'danger');
        showToast(err.message, 'danger');
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Log In <i class="bi bi-arrow-right ms-2"></i>';
      }
    });
  }

  // ----------------------------------------------------
  // REGISTRATION FORM HANDLER
  // ----------------------------------------------------
  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    const passwordInput = document.getElementById('password');
    const strengthBar = document.getElementById('password-strength-bar');
    const strengthText = document.getElementById('password-strength-text');

    if (passwordInput && strengthBar && strengthText) {
      passwordInput.addEventListener('input', () => {
        const val = passwordInput.value;
        const result = checkPasswordStrength(val);
        strengthBar.style.width = `${result.percent}%`;
        strengthBar.className = `progress-bar ${result.colorClass}`;
        strengthText.textContent = result.label;
        strengthText.className = `small fw-semibold mt-1 ${result.textClass}`;
      });
    }

    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fullName = document.getElementById('full_name').value.trim();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const confirmPassword = document.getElementById('confirm_password').value;
      const submitBtn = registerForm.querySelector('button[type="submit"]');

      if (!fullName || !email || !password || !confirmPassword) {
        showAuthAlert('Please complete all required fields.', 'warning');
        return;
      }

      if (password !== confirmPassword) {
        showAuthAlert('Passwords do not match. Please re-enter identical passwords.', 'danger');
        return;
      }

      if (password.length < 6) {
        showAuthAlert('Password must be at least 6 characters long.', 'danger');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Creating account...';

      try {
        const res = await apiFetch('/api/auth/register', {
          method: 'POST',
          body: {
            full_name: fullName,
            email,
            password,
            confirm_password: confirmPassword
          }
        });

        showToast(res.message, 'success');
        setTimeout(() => {
          window.location.href = '/dashboard.html';
        }, 800);
      } catch (err) {
        showAuthAlert(err.message, 'danger');
        showToast(err.message, 'danger');
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Create Account <i class="bi bi-arrow-right ms-2"></i>';
      }
    });
  }

  function showAuthAlert(msg, type = 'danger') {
    const box = document.getElementById('auth-alert');
    if (!box) return;
    box.className = `alert alert-${type} alert-dismissible fade show`;
    box.innerHTML = `
      <i class="bi bi-exclamation-triangle-fill me-2"></i>${escapeHtml(msg)}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    box.classList.remove('d-none');
  }

  function checkPasswordStrength(p) {
    if (!p) return { percent: 0, label: '', colorClass: '', textClass: '' };
    let score = 0;
    if (p.length >= 6) score++;
    if (p.length >= 10) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;

    if (score <= 1) {
      return { percent: 25, label: 'Weak password', colorClass: 'bg-danger', textClass: 'text-danger' };
    } else if (score === 2 || score === 3) {
      return { percent: 60, label: 'Fair password', colorClass: 'bg-warning', textClass: 'text-warning' };
    } else if (score === 4) {
      return { percent: 85, label: 'Good password', colorClass: 'bg-info', textClass: 'text-info' };
    } else {
      return { percent: 100, label: 'Strong password', colorClass: 'bg-success', textClass: 'text-success' };
    }
  }
});
