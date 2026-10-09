// public/js/profile.js
// Profile and Account Settings management

document.addEventListener('DOMContentLoaded', async () => {
  await loadProfile();
  setupForms();
});

async function loadProfile() {
  try {
    const res = await apiFetch('/api/profile');
    const p = res.profile;

    document.getElementById('profile-name-display').textContent = p.full_name;
    document.getElementById('profile-email-display').textContent = p.email;
    document.getElementById('profile-created-date').textContent = formatDate(p.created_at);

    document.getElementById('input-full-name').value = p.full_name;
    document.getElementById('stat-profile-resumes').textContent = p.stats?.totalResumes || 0;
    document.getElementById('stat-profile-apps').textContent = p.stats?.totalApplications || 0;
  } catch (err) {
    console.error('[Profile] Load error:', err);
    showToast('Failed to load profile details.', 'danger');
  }
}

function setupForms() {
  // Update Name Form
  document.getElementById('form-update-name')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fullName = document.getElementById('input-full-name').value.trim();
    if (!fullName) {
      showToast('Name cannot be empty.', 'warning');
      return;
    }

    try {
      const res = await apiFetch('/api/profile', {
        method: 'PUT',
        body: { full_name: fullName }
      });
      showToast(res.message, 'success');
      await loadProfile();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  });

  // Change Password Form
  document.getElementById('form-change-password')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const currentPassword = document.getElementById('input-current-password').value;
    const newPassword = document.getElementById('input-new-password').value;
    const confirmPassword = document.getElementById('input-confirm-password').value;

    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast('Please fill all password fields.', 'warning');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match.', 'danger');
      return;
    }

    if (newPassword.length < 6) {
      showToast('New password must be at least 6 characters.', 'danger');
      return;
    }

    try {
      const res = await apiFetch('/api/profile/password', {
        method: 'PUT',
        body: {
          current_password: currentPassword,
          new_password: newPassword,
          confirm_password: confirmPassword
        }
      });
      showToast(res.message, 'success');
      document.getElementById('form-change-password')?.reset();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  });

  // Delete Account Form
  document.getElementById('form-delete-account')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const confirmText = document.getElementById('delete-confirm-text').value.trim();
    const password = document.getElementById('delete-account-password').value;

    if (confirmText !== 'DELETE') {
      showToast('Please type DELETE in capital letters to confirm.', 'warning');
      return;
    }

    try {
      const res = await apiFetch('/api/profile', {
        method: 'DELETE',
        body: {
          confirm_text: confirmText,
          password: password
        }
      });
      showToast(res.message, 'info');
      setTimeout(() => {
        window.location.href = '/index.html';
      }, 1000);
    } catch (err) {
      showToast(err.message, 'danger');
    }
  });
}
