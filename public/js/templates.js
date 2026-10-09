// public/js/templates.js
// Template selection and showcase controller

let userResumes = [];
let selectedTemplateName = 'modern';

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const res = await apiFetch('/api/resumes');
    userResumes = res.resumes || [];
    populateExistingResumesDropdown();
  } catch (err) {
    console.debug('[Templates] Guest view or offline:', err);
  }

  setupTemplateButtons();
});

function populateExistingResumesDropdown() {
  const select = document.getElementById('switch-resume-select');
  if (!select) return;

  if (userResumes.length === 0) {
    select.innerHTML = '<option value="">No existing resumes found (Create new below)</option>';
    select.disabled = true;
    return;
  }

  select.innerHTML = userResumes.map(r => `
    <option value="${r.id}">${escapeHtml(r.resume_title)} (Current: ${escapeHtml(r.template_name)})</option>
  `).join('');
}

function setupTemplateButtons() {
  document.querySelectorAll('.btn-select-template').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedTemplateName = btn.getAttribute('data-template');
      document.getElementById('modal-selected-template-name').textContent = selectedTemplateName.toUpperCase();
      const modal = new bootstrap.Modal(document.getElementById('templateActionModal'));
      modal.show();
    });
  });

  // Action: Create New Resume with this template
  document.getElementById('btn-create-with-template')?.addEventListener('click', async () => {
    const title = document.getElementById('new-resume-template-title').value.trim() || `${selectedTemplateName.toUpperCase()} Resume`;
    try {
      const res = await apiFetch('/api/resumes', {
        method: 'POST',
        body: {
          resume_title: title,
          template_name: selectedTemplateName
        }
      });
      showToast('New resume created!', 'success');
      setTimeout(() => {
        window.location.href = `/resume-builder.html?id=${res.resumeId}`;
      }, 500);
    } catch (err) {
      showToast(err.message, 'danger');
    }
  });

  // Action: Switch Existing Resume to this template
  document.getElementById('btn-switch-existing-template')?.addEventListener('click', async () => {
    const resumeId = document.getElementById('switch-resume-select')?.value;
    if (!resumeId) {
      showToast('Please select a resume to switch.', 'warning');
      return;
    }
    try {
      await apiFetch(`/api/resumes/${resumeId}`, {
        method: 'PUT',
        body: { template_name: selectedTemplateName }
      });
      showToast(`Template updated to ${selectedTemplateName}!`, 'success');
      setTimeout(() => {
        window.location.href = `/resume-builder.html?id=${resumeId}`;
      }, 500);
    } catch (err) {
      showToast(err.message, 'danger');
    }
  });
}
