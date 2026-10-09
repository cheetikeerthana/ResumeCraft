// public/js/applications.js
// Job Application Tracker with full CRUD, filtering, searching, status badges, and aggregate statistics

let applicationsData = [];
let editTargetId = null;
let deleteTargetId = null;

document.addEventListener('DOMContentLoaded', async () => {
  await loadApplications();
  setupFiltersAndForms();
});

async function loadApplications() {
  const statusFilter = document.getElementById('filter-status').value;
  const search = document.getElementById('filter-search').value.trim();
  const sort = document.getElementById('filter-sort').value;

  const params = new URLSearchParams();
  if (statusFilter) params.set('status', statusFilter);
  if (search) params.set('search', search);
  if (sort) params.set('sort', sort);

  try {
    const res = await apiFetch(`/api/applications?${params.toString()}`);
    applicationsData = res.applications || [];
    renderApplicationsTable(applicationsData);
    renderStatsCards(res.stats || {});
  } catch (err) {
    console.error('[Applications] Load error:', err);
    showToast('Failed to load applications: ' + err.message, 'danger');
  }
}

function renderStatsCards(s) {
  document.getElementById('stat-total').textContent = s.total || 0;
  document.getElementById('stat-applied').textContent = s.applied || 0;
  document.getElementById('stat-interview').textContent = s.interview || 0;
  document.getElementById('stat-offer').textContent = s.offer || 0;
  document.getElementById('stat-rejected').textContent = s.rejected || 0;
  document.getElementById('stat-saved').textContent = s.saved || 0;
}

function renderApplicationsTable(apps) {
  const tbody = document.getElementById('applications-tbody');
  const emptyState = document.getElementById('applications-empty-state');

  if (apps.length === 0) {
    tbody.innerHTML = '';
    emptyState.classList.remove('d-none');
    return;
  }

  emptyState.classList.add('d-none');
  tbody.innerHTML = apps.map(a => `
    <tr>
      <td class="fw-bold text-navy">${escapeHtml(a.company_name)}</td>
      <td>
        <div class="fw-semibold">${escapeHtml(a.job_title)}</div>
        ${a.job_url ? `<a href="${escapeHtml(a.job_url)}" target="_blank" rel="noopener noreferrer" class="small text-muted text-decoration-underline"><i class="bi bi-box-arrow-up-right me-1"></i>Job Posting</a>` : ''}
      </td>
      <td>${escapeHtml(a.location || 'Remote / Unspecified')}</td>
      <td><span class="badge-status ${escapeHtml(a.status)}">${escapeHtml(a.status)}</span></td>
      <td class="text-muted small">${formatDate(a.application_date)}</td>
      <td class="small text-muted" style="max-width: 200px;">
        <span class="d-inline-block text-truncate" style="max-width: 180px;" title="${escapeHtml(a.notes || '')}">
          ${escapeHtml(a.notes || '—')}
        </span>
      </td>
      <td class="text-end">
        <button class="btn btn-sm btn-light border edit-app-btn me-1" data-id="${a.id}" title="Edit"><i class="bi bi-pencil"></i></button>
        <button class="btn btn-sm btn-outline-danger delete-app-btn" data-id="${a.id}" data-company="${escapeHtml(a.company_name)}" title="Delete"><i class="bi bi-trash"></i></button>
      </td>
    </tr>
  `).join('');

  // Attach table events
  tbody.querySelectorAll('.edit-app-btn').forEach(btn => {
    btn.addEventListener('click', () => openEditModal(btn.getAttribute('data-id')));
  });

  tbody.querySelectorAll('.delete-app-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      deleteTargetId = btn.getAttribute('data-id');
      document.getElementById('delete-app-company').textContent = btn.getAttribute('data-company');
      const modal = new bootstrap.Modal(document.getElementById('deleteAppModal'));
      modal.show();
    });
  });
}

function setupFiltersAndForms() {
  // Search input debounced
  document.getElementById('filter-search')?.addEventListener('input', debounce(() => {
    loadApplications();
  }, 400));

  // Filters change
  document.getElementById('filter-status')?.addEventListener('change', () => loadApplications());
  document.getElementById('filter-sort')?.addEventListener('change', () => loadApplications());

  // Add Application Form
  document.getElementById('form-add-application')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      company_name: document.getElementById('add_app_company').value.trim(),
      job_title: document.getElementById('add_app_title').value.trim(),
      job_url: document.getElementById('add_app_url').value.trim(),
      location: document.getElementById('add_app_location').value.trim(),
      application_date: document.getElementById('add_app_date').value,
      status: document.getElementById('add_app_status').value,
      notes: document.getElementById('add_app_notes').value.trim()
    };

    try {
      await apiFetch('/api/applications', {
        method: 'POST',
        body: data
      });
      showToast('Application added successfully!', 'success');
      bootstrap.Modal.getInstance(document.getElementById('addAppModal'))?.hide();
      document.getElementById('form-add-application')?.reset();
      await loadApplications();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  });

  // Edit Application Form
  document.getElementById('form-edit-application')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!editTargetId) return;

    const data = {
      company_name: document.getElementById('edit_app_company').value.trim(),
      job_title: document.getElementById('edit_app_title').value.trim(),
      job_url: document.getElementById('edit_app_url').value.trim(),
      location: document.getElementById('edit_app_location').value.trim(),
      application_date: document.getElementById('edit_app_date').value,
      status: document.getElementById('edit_app_status').value,
      notes: document.getElementById('edit_app_notes').value.trim()
    };

    try {
      await apiFetch(`/api/applications/${editTargetId}`, {
        method: 'PUT',
        body: data
      });
      showToast('Application updated!', 'success');
      bootstrap.Modal.getInstance(document.getElementById('editAppModal'))?.hide();
      await loadApplications();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  });

  // Confirm Delete
  document.getElementById('btn-confirm-delete-app')?.addEventListener('click', async () => {
    if (!deleteTargetId) return;
    try {
      await apiFetch(`/api/applications/${deleteTargetId}`, { method: 'DELETE' });
      showToast('Application deleted.', 'info');
      bootstrap.Modal.getInstance(document.getElementById('deleteAppModal'))?.hide();
      await loadApplications();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  });
}

async function openEditModal(id) {
  editTargetId = id;
  const app = applicationsData.find(a => a.id == id);
  if (!app) return;

  document.getElementById('edit_app_company').value = app.company_name;
  document.getElementById('edit_app_title').value = app.job_title;
  document.getElementById('edit_app_url').value = app.job_url || '';
  document.getElementById('edit_app_location').value = app.location || '';
  document.getElementById('edit_app_date').value = app.application_date ? app.application_date.split('T')[0] : '';
  document.getElementById('edit_app_status').value = app.status;
  document.getElementById('edit_app_notes').value = app.notes || '';

  const modal = new bootstrap.Modal(document.getElementById('editAppModal'));
  modal.show();
}
