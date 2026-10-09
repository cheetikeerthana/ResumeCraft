// public/js/dashboard.js
// Personalized user dashboard loading real MySQL records, stats, resume cards, and application summary

document.addEventListener('DOMContentLoaded', async () => {
  await loadDashboardData();
  setupEventListeners();
});

let resumesData = [];
let deleteTargetId = null;

async function loadDashboardData() {
  try {
    // 1. Fetch current profile
    const profileRes = await apiFetch('/api/profile');
    if (profileRes.success && profileRes.profile) {
      document.getElementById('user-greeting-name').textContent = profileRes.profile.full_name;
      document.getElementById('profile-email-badge').textContent = profileRes.profile.email;
    }

    // 2. Fetch resumes
    const resumesRes = await apiFetch('/api/resumes');
    resumesData = resumesRes.resumes || [];
    document.getElementById('total-resumes-count').textContent = resumesData.length;

    renderResumesGrid(resumesData);

    // 3. Fetch applications
    const appsRes = await apiFetch('/api/applications');
    const apps = appsRes.applications || [];
    const stats = appsRes.stats || { total: 0, applied: 0, interview: 0, offer: 0, rejected: 0, saved: 0 };

    document.getElementById('total-apps-count').textContent = stats.total;
    document.getElementById('interview-count').textContent = stats.interview;
    document.getElementById('offer-count').textContent = stats.offer;

    renderRecentApplications(apps.slice(0, 5));

    // Calculate average completion
    if (resumesData.length > 0) {
      const avg = Math.round(resumesData.reduce((acc, r) => acc + (r.completion_percentage || 0), 0) / resumesData.length);
      document.getElementById('avg-completion-count').textContent = `${avg}%`;

      // Show recommendation banner for the lowest completed resume
      const lowest = [...resumesData].sort((a, b) => (a.completion_percentage || 0) - (b.completion_percentage || 0))[0];
      if (lowest && lowest.completion_percentage < 90) {
        document.getElementById('assistant-tip-container').classList.remove('d-none');
        document.getElementById('assistant-tip-title').textContent = `Boost "${lowest.resume_title}"`;
        document.getElementById('assistant-tip-text').textContent = `Currently at ${lowest.completion_percentage}% completion. Run the Resume Assistant to evaluate action verbs and keyword alignment.`;
        document.getElementById('assistant-tip-btn').href = `/resume-assistant.html?id=${lowest.id}`;
      }
    } else {
      document.getElementById('avg-completion-count').textContent = '0%';
    }

  } catch (err) {
    console.error('[Dashboard] Error loading dashboard:', err);
    showToast('Failed to load dashboard data. Check database connectivity.', 'danger');
  }
}

function renderResumesGrid(resumes) {
  const container = document.getElementById('resumes-grid');
  const emptyState = document.getElementById('resumes-empty-state');

  if (resumes.length === 0) {
    container.innerHTML = '';
    emptyState.classList.remove('d-none');
    return;
  }

  emptyState.classList.add('d-none');
  container.innerHTML = resumes.map(r => {
    const completion = r.completion_percentage || 0;
    const progressColor = completion >= 80 ? 'bg-success' : completion >= 50 ? 'bg-warning' : 'bg-danger';

    return `
      <div class="col-md-6 col-lg-4">
        <div class="card-custom h-100 p-4 d-flex flex-column">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <span class="badge bg-primary-subtle text-primary text-uppercase fw-bold" style="font-size: 0.7rem;">
              ${escapeHtml(r.template_name || 'modern')} Template
            </span>
            <div class="dropdown">
              <button class="btn btn-sm btn-light border-0" type="button" data-bs-toggle="dropdown">
                <i class="bi bi-three-dots-vertical"></i>
              </button>
              <ul class="dropdown-menu dropdown-menu-end shadow-sm">
                <li><a class="dropdown-item" href="/resume-builder.html?id=${r.id}"><i class="bi bi-pencil me-2"></i>Edit Resume</a></li>
                <li><a class="dropdown-item" href="/resume-preview.html?id=${r.id}"><i class="bi bi-eye me-2"></i>Preview & Print</a></li>
                <li><a class="dropdown-item" href="/api/resumes/${r.id}/pdf"><i class="bi bi-file-earmark-pdf me-2"></i>Download PDF</a></li>
                <li><button class="dropdown-item text-primary duplicate-btn" data-id="${r.id}"><i class="bi bi-copy me-2"></i>Duplicate</button></li>
                <li><hr class="dropdown-divider"></li>
                <li><button class="dropdown-item text-danger delete-btn" data-id="${r.id}" data-title="${escapeHtml(r.resume_title)}"><i class="bi bi-trash me-2"></i>Delete</button></li>
              </ul>
            </div>
          </div>

          <h5 class="fw-bold mb-1 text-truncate" title="${escapeHtml(r.resume_title)}">
            ${escapeHtml(r.resume_title)}
          </h5>
          <p class="text-muted small mb-3 text-truncate">
            ${escapeHtml(r.professional_title || 'No target title set')}
          </p>

          <div class="mb-3">
            <div class="d-flex justify-content-between small text-muted mb-1">
              <span>Completion</span>
              <span class="fw-semibold">${completion}%</span>
            </div>
            <div class="progress" style="height: 6px;">
              <div class="progress-bar ${progressColor}" role="progressbar" style="width: ${completion}%"></div>
            </div>
          </div>

          <div class="text-muted small mb-4">
            <i class="bi bi-clock-history me-1"></i>Updated: ${formatDate(r.updated_at)}
          </div>

          <div class="mt-auto d-flex gap-2">
            <a href="/resume-builder.html?id=${r.id}" class="btn btn-sm btn-outline-primary flex-grow-1">
              <i class="bi bi-pencil me-1"></i>Edit
            </a>
            <a href="/resume-preview.html?id=${r.id}" class="btn btn-sm btn-outline-secondary">
              <i class="bi bi-eye"></i>
            </a>
            <a href="/api/resumes/${r.id}/pdf" class="btn btn-sm btn-outline-success" title="Download PDF">
              <i class="bi bi-download"></i>
            </a>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Attach card event listeners
  container.querySelectorAll('.duplicate-btn').forEach(btn => {
    btn.addEventListener('click', () => handleDuplicate(btn.getAttribute('data-id')));
  });

  container.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      deleteTargetId = btn.getAttribute('data-id');
      const title = btn.getAttribute('data-title');
      document.getElementById('delete-resume-name').textContent = title;
      const modal = new bootstrap.Modal(document.getElementById('deleteModal'));
      modal.show();
    });
  });
}

function renderRecentApplications(apps) {
  const container = document.getElementById('recent-apps-tbody');
  if (apps.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="5" class="text-center py-4 text-muted small">
          No job applications logged yet. <a href="/applications.html" class="fw-semibold">Add your first application</a> to track interviews and offers.
        </td>
      </tr>
    `;
    return;
  }

  container.innerHTML = apps.map(a => `
    <tr>
      <td class="fw-semibold">${escapeHtml(a.company_name)}</td>
      <td>${escapeHtml(a.job_title)}</td>
      <td><span class="badge-status ${escapeHtml(a.status)}">${escapeHtml(a.status)}</span></td>
      <td class="text-muted small">${formatDate(a.application_date)}</td>
      <td class="text-end">
        <a href="/applications.html" class="btn btn-sm btn-light border"><i class="bi bi-arrow-right"></i></a>
      </td>
    </tr>
  `).join('');
}

function setupEventListeners() {
  // Create Resume Modal form
  const createForm = document.getElementById('create-resume-form');
  if (createForm) {
    createForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = document.getElementById('create_resume_title').value.trim();
      const template = document.getElementById('create_template_name').value;
      const profTitle = document.getElementById('create_prof_title').value.trim();

      try {
        const res = await apiFetch('/api/resumes', {
          method: 'POST',
          body: {
            resume_title: title || 'My Professional Resume',
            template_name: template,
            professional_title: profTitle
          }
        });

        showToast('Resume created successfully!', 'success');
        setTimeout(() => {
          window.location.href = `/resume-builder.html?id=${res.resumeId}`;
        }, 500);
      } catch (err) {
        showToast(err.message, 'danger');
      }
    });
  }

  // Confirm Delete
  document.getElementById('confirm-delete-btn')?.addEventListener('click', async () => {
    if (!deleteTargetId) return;
    try {
      await apiFetch(`/api/resumes/${deleteTargetId}`, { method: 'DELETE' });
      showToast('Resume deleted successfully.', 'info');
      bootstrap.Modal.getInstance(document.getElementById('deleteModal')).hide();
      await loadDashboardData();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  });
}

async function handleDuplicate(resumeId) {
  try {
    const res = await apiFetch(`/api/resumes/${resumeId}/duplicate`, { method: 'POST' });
    showToast('Resume duplicated successfully!', 'success');
    await loadDashboardData();
  } catch (err) {
    showToast(err.message, 'danger');
  }
}
