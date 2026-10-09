// public/js/resume-builder.js
// Interactive multi-section resume builder with live split-screen preview, debounced autosave, and relational CRUD

let currentResume = null;
let resumeId = null;
let saveTimeout = null;
let isDirty = false;

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  resumeId = urlParams.get('id');

  if (!resumeId) {
    showToast('No resume selected. Redirecting to dashboard...', 'warning');
    setTimeout(() => window.location.href = '/dashboard.html', 1000);
    return;
  }

  await loadResume(resumeId);
  setupFormBindings();
  setupSectionModals();
});

async function loadResume(id) {
  try {
    setSaveStatus('loading', 'Loading resume...');
    const data = await apiFetch(`/api/resumes/${id}`);
    currentResume = data.resume;

    populateFormFields(currentResume);
    renderLivePreview();
    updateCompletionBar();
    setSaveStatus('saved', 'All changes saved');

    // Update links
    document.getElementById('btn-preview-link').href = `/resume-preview.html?id=${id}`;
    document.getElementById('btn-assistant-link').href = `/resume-assistant.html?id=${id}`;
    document.getElementById('btn-download-pdf').href = `/api/resumes/${id}/pdf`;

  } catch (err) {
    console.error('[Builder] Error loading resume:', err);
    showToast('Failed to load resume details.', 'danger');
    setSaveStatus('error', 'Error loading resume');
  }
}

function setSaveStatus(state, text) {
  const badge = document.getElementById('save-status-indicator');
  if (!badge) return;

  if (state === 'saving') {
    badge.className = 'badge bg-warning-subtle text-warning border border-warning-subtle';
    badge.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Saving...';
  } else if (state === 'saved') {
    badge.className = 'badge bg-success-subtle text-success border border-success-subtle';
    badge.innerHTML = '<i class="bi bi-cloud-check-fill me-1"></i>All changes saved';
  } else if (state === 'loading') {
    badge.className = 'badge bg-info-subtle text-info border border-info-subtle';
    badge.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Loading...';
  } else {
    badge.className = 'badge bg-danger-subtle text-danger border border-danger-subtle';
    badge.innerHTML = '<i class="bi bi-cloud-slash-fill me-1"></i>Unable to save. Retry.';
  }
}

function populateFormFields(r) {
  document.getElementById('resume_title_header').value = r.resume_title || 'Untitled Resume';
  document.getElementById('template_selector').value = r.template_name || 'modern';

  // Personal Info
  document.getElementById('personal_full_name').value = r.user_full_name || '';
  document.getElementById('personal_prof_title').value = r.professional_title || '';
  document.getElementById('personal_summary').value = r.professional_summary || '';

  // Contact
  const c = r.contact || {};
  document.getElementById('contact_phone').value = c.phone || '';
  document.getElementById('contact_city').value = c.city || '';
  document.getElementById('contact_country').value = c.country || '';
  document.getElementById('contact_linkedin').value = c.linkedin_url || '';
  document.getElementById('contact_github').value = c.github_url || '';
  document.getElementById('contact_portfolio').value = c.portfolio_url || '';

  // Render Subsections Lists
  renderEducationList();
  renderExperienceList();
  renderSkillsList();
  renderProjectsList();
  renderCertificationsList();
  renderAchievementsList();
  renderLanguagesList();
}

function setupFormBindings() {
  // Title & Template
  document.getElementById('resume_title_header').addEventListener('input', (e) => {
    currentResume.resume_title = e.target.value;
    triggerAutoSave();
  });

  document.getElementById('template_selector').addEventListener('change', (e) => {
    currentResume.template_name = e.target.value;
    renderLivePreview();
    triggerAutoSave();
  });

  // Personal Info fields
  const personalInputs = [
    'personal_prof_title', 'personal_summary',
    'contact_phone', 'contact_city', 'contact_country',
    'contact_linkedin', 'contact_github', 'contact_portfolio'
  ];

  personalInputs.forEach(id => {
    document.getElementById(id)?.addEventListener('input', () => {
      collectFormData();
      renderLivePreview();
      triggerAutoSave();
    });
  });

  // Explicit Save Button
  document.getElementById('btn-manual-save')?.addEventListener('click', async () => {
    await saveResumeChanges();
  });

  // Warn before navigating away if saving
  window.addEventListener('beforeunload', (e) => {
    if (isDirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
}

function collectFormData() {
  currentResume.professional_title = document.getElementById('personal_prof_title').value;
  currentResume.professional_summary = document.getElementById('personal_summary').value;

  currentResume.contact = {
    phone: document.getElementById('contact_phone').value,
    city: document.getElementById('contact_city').value,
    country: document.getElementById('contact_country').value,
    linkedin_url: document.getElementById('contact_linkedin').value,
    github_url: document.getElementById('contact_github').value,
    portfolio_url: document.getElementById('contact_portfolio').value
  };
}

function triggerAutoSave() {
  isDirty = true;
  setSaveStatus('saving');
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(async () => {
    await saveResumeChanges();
  }, 1200);
}

async function saveResumeChanges() {
  collectFormData();
  try {
    setSaveStatus('saving');
    const res = await apiFetch(`/api/resumes/${resumeId}`, {
      method: 'PUT',
      body: {
        resume_title: currentResume.resume_title,
        professional_title: currentResume.professional_title,
        professional_summary: currentResume.professional_summary,
        template_name: currentResume.template_name,
        contact: currentResume.contact
      }
    });

    currentResume.completion_percentage = res.resume.completion_percentage;
    updateCompletionBar();
    setSaveStatus('saved');
    isDirty = false;
  } catch (err) {
    console.error('[Save Error]', err);
    setSaveStatus('error');
    showToast('Failed to save changes: ' + err.message, 'danger');
  }
}

function updateCompletionBar() {
  const percent = currentResume.completion_percentage || 0;
  const bar = document.getElementById('builder-completion-bar');
  const txt = document.getElementById('builder-completion-text');
  if (bar && txt) {
    bar.style.width = `${percent}%`;
    bar.className = `progress-bar ${percent >= 80 ? 'bg-success' : percent >= 50 ? 'bg-warning' : 'bg-danger'}`;
    txt.textContent = `${percent}% Completed`;
  }
}

// -------------------------------------------------------------
// LIVE PREVIEW RENDERING ENGINE
// -------------------------------------------------------------
function renderLivePreview() {
  const container = document.getElementById('live-preview-container');
  if (!container || !currentResume) return;

  const t = currentResume.template_name || 'modern';
  container.className = `resume-paper template-${t}`;

  const name = escapeHtml(currentResume.user_full_name || 'Your Full Name');
  const profTitle = escapeHtml(currentResume.professional_title || '');
  const summary = escapeHtml(currentResume.professional_summary || '');
  const c = currentResume.contact || {};

  // Build contact line
  const contactParts = [];
  if (currentResume.user_email) contactParts.push(`<i class="bi bi-envelope me-1"></i>${escapeHtml(currentResume.user_email)}`);
  if (c.phone) contactParts.push(`<i class="bi bi-telephone me-1"></i>${escapeHtml(c.phone)}`);
  if (c.city || c.country) contactParts.push(`<i class="bi bi-geo-alt me-1"></i>${escapeHtml([c.city, c.country].filter(Boolean).join(', '))}`);
  if (c.linkedin_url) contactParts.push(`<i class="bi bi-linkedin me-1"></i><a href="${escapeHtml(c.linkedin_url)}" target="_blank">LinkedIn</a>`);
  if (c.github_url) contactParts.push(`<i class="bi bi-github me-1"></i><a href="${escapeHtml(c.github_url)}" target="_blank">GitHub</a>`);
  if (c.portfolio_url) contactParts.push(`<i class="bi bi-globe me-1"></i><a href="${escapeHtml(c.portfolio_url)}" target="_blank">Portfolio</a>`);

  let html = `
    <div class="resume-header mb-3">
      <div class="resume-name">${name}</div>
      ${profTitle ? `<div class="resume-title mb-2">${profTitle}</div>` : ''}
      <div class="contact-line small d-flex flex-wrap gap-2 ${t === 'professional' ? 'justify-content-center' : ''}">
        ${contactParts.join(' &bull; ')}
      </div>
    </div>
  `;

  // Summary
  if (summary) {
    html += `
      <div class="resume-section">
        <div class="section-heading">Professional Summary</div>
        <p class="small text-muted" style="line-height: 1.6; text-align: justify;">${summary}</p>
      </div>
    `;
  }

  // Education
  if (currentResume.education && currentResume.education.length > 0) {
    html += `
      <div class="resume-section">
        <div class="section-heading">Education</div>
        ${currentResume.education.map(edu => `
          <div class="mb-2">
            <div class="d-flex justify-content-between align-items-baseline">
              <strong class="text-dark small">${escapeHtml(edu.institution)}</strong>
              <span class="text-muted small" style="font-size: 0.78rem;">${escapeHtml([edu.start_date, edu.is_current ? 'Present' : edu.end_date].filter(Boolean).join(' - '))}</span>
            </div>
            <div class="text-primary small fw-semibold" style="font-size: 0.85rem;">
              ${escapeHtml(edu.degree)}${edu.field_of_study ? ` in ${escapeHtml(edu.field_of_study)}` : ''}
              ${edu.grade ? ` &bull; <span class="text-dark fw-normal">Grade: ${escapeHtml(edu.grade)}</span>` : ''}
            </div>
            ${edu.description ? `<div class="text-muted small mt-1" style="font-size: 0.8rem;">${escapeHtml(edu.description)}</div>` : ''}
          </div>
        `).join('')}
      </div>
    `;
  }

  // Experience
  if (currentResume.experience && currentResume.experience.length > 0) {
    html += `
      <div class="resume-section">
        <div class="section-heading">Experience & Internships</div>
        ${currentResume.experience.map(exp => `
          <div class="mb-3">
            <div class="d-flex justify-content-between align-items-baseline">
              <strong class="text-dark small">${escapeHtml(exp.company_name)}</strong>
              <span class="text-muted small" style="font-size: 0.78rem;">${escapeHtml([exp.start_date, exp.is_current ? 'Present' : exp.end_date].filter(Boolean).join(' - '))}</span>
            </div>
            <div class="text-primary small fw-semibold" style="font-size: 0.85rem;">
              ${escapeHtml(exp.job_title)} <span class="text-muted fw-normal">(${escapeHtml(exp.employment_type || 'Full-time')})</span>
            </div>
            ${exp.responsibilities ? `
              <ul class="mb-0 mt-1 ps-3 small text-muted" style="font-size: 0.82rem; line-height: 1.5;">
                ${exp.responsibilities.split('\n').filter(Boolean).map(line => `
                  <li>${escapeHtml(line.replace(/^[•\-]\s*/, ''))}</li>
                `).join('')}
              </ul>
            ` : ''}
          </div>
        `).join('')}
      </div>
    `;
  }

  // Skills
  if (currentResume.skills && currentResume.skills.length > 0) {
    const cats = {};
    currentResume.skills.forEach(s => {
      const c = s.skill_category || 'Technical';
      if (!cats[c]) cats[c] = [];
      cats[c].push(s);
    });

    html += `
      <div class="resume-section">
        <div class="section-heading">Skills & Competencies</div>
        ${Object.keys(cats).map(category => `
          <div class="mb-1 small">
            <strong class="text-dark">${escapeHtml(category)}: </strong>
            ${cats[category].map(s => `
              <span class="${t === 'modern' ? 'skill-badge' : ''}">${escapeHtml(s.skill_name)}${s.proficiency ? ` <small class="text-muted">(${escapeHtml(s.proficiency)})</small>` : ''}</span>
            `).join(t === 'modern' ? ' ' : ', ')}
          </div>
        `).join('')}
      </div>
    `;
  }

  // Projects
  if (currentResume.projects && currentResume.projects.length > 0) {
    html += `
      <div class="resume-section">
        <div class="section-heading">Key Projects</div>
        ${currentResume.projects.map(p => `
          <div class="mb-2">
            <div class="d-flex justify-content-between align-items-baseline">
              <strong class="text-dark small">${escapeHtml(p.project_title)}</strong>
              <span class="text-muted small" style="font-size: 0.78rem;">${escapeHtml([p.start_date, p.end_date].filter(Boolean).join(' - '))}</span>
            </div>
            ${p.technologies ? `<div class="text-primary small" style="font-size: 0.8rem;">Technologies: ${escapeHtml(p.technologies)}</div>` : ''}
            ${p.description ? `<div class="text-muted small mt-1" style="font-size: 0.82rem;">${escapeHtml(p.description)}</div>` : ''}
            ${p.project_url ? `<div class="small"><a href="${escapeHtml(p.project_url)}" target="_blank" class="text-decoration-underline" style="font-size: 0.78rem;">Project Link</a></div>` : ''}
          </div>
        `).join('')}
      </div>
    `;
  }

  // Certifications
  if (currentResume.certifications && currentResume.certifications.length > 0) {
    html += `
      <div class="resume-section">
        <div class="section-heading">Certifications</div>
        ${currentResume.certifications.map(c => `
          <div class="d-flex justify-content-between align-items-baseline mb-1 small">
            <div>
              <strong class="text-dark">${escapeHtml(c.certification_name)}</strong>
              ${c.issuing_organization ? `<span class="text-muted"> &bull; ${escapeHtml(c.issuing_organization)}</span>` : ''}
            </div>
            <span class="text-muted small">${escapeHtml(c.issue_date || '')}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  // Achievements
  if (currentResume.achievements && currentResume.achievements.length > 0) {
    html += `
      <div class="resume-section">
        <div class="section-heading">Achievements & Honors</div>
        ${currentResume.achievements.map(a => `
          <div class="mb-1 small">
            <div class="d-flex justify-content-between align-items-baseline">
              <strong class="text-dark">${escapeHtml(a.title)}</strong>
              <span class="text-muted small">${escapeHtml(a.achievement_date || '')}</span>
            </div>
            ${a.description ? `<div class="text-muted small">${escapeHtml(a.description)}</div>` : ''}
          </div>
        `).join('')}
      </div>
    `;
  }

  // Languages
  if (currentResume.languages && currentResume.languages.length > 0) {
    html += `
      <div class="resume-section">
        <div class="section-heading">Languages</div>
        <div class="small text-muted">
          ${currentResume.languages.map(l => `<strong>${escapeHtml(l.language_name)}</strong> (${escapeHtml(l.proficiency || 'Fluent')})`).join('  &bull;  ')}
        </div>
      </div>
    `;
  }

  container.innerHTML = html;
}

// -------------------------------------------------------------
// SUBSECTIONS CRUD HANDLERS
// -------------------------------------------------------------

function renderEducationList() {
  const container = document.getElementById('education-items-list');
  if (!container) return;
  const items = currentResume.education || [];

  if (items.length === 0) {
    container.innerHTML = `<div class="text-muted small text-center py-2">No education records added yet.</div>`;
    return;
  }

  container.innerHTML = items.map((edu, idx) => `
    <div class="p-3 bg-light rounded border mb-2 d-flex justify-content-between align-items-center">
      <div>
        <div class="fw-semibold small">${escapeHtml(edu.degree)} &bull; ${escapeHtml(edu.institution)}</div>
        <div class="text-muted small">${escapeHtml(edu.field_of_study || '')} (${escapeHtml([edu.start_date, edu.is_current ? 'Present' : edu.end_date].filter(Boolean).join(' - '))})</div>
      </div>
      <div>
        <button class="btn btn-sm btn-outline-danger delete-section-btn" data-type="education" data-id="${edu.id}"><i class="bi bi-trash"></i></button>
      </div>
    </div>
  `).join('');

  attachDeleteButtons();
}

function renderExperienceList() {
  const container = document.getElementById('experience-items-list');
  if (!container) return;
  const items = currentResume.experience || [];

  if (items.length === 0) {
    container.innerHTML = `<div class="text-muted small text-center py-2">No work experience or internships added yet.</div>`;
    return;
  }

  container.innerHTML = items.map((exp, idx) => `
    <div class="p-3 bg-light rounded border mb-2 d-flex justify-content-between align-items-center">
      <div>
        <div class="fw-semibold small">${escapeHtml(exp.job_title)} &bull; ${escapeHtml(exp.company_name)}</div>
        <div class="text-muted small">${escapeHtml([exp.start_date, exp.is_current ? 'Present' : exp.end_date].filter(Boolean).join(' - '))}</div>
      </div>
      <div>
        <button class="btn btn-sm btn-outline-danger delete-section-btn" data-type="experience" data-id="${exp.id}"><i class="bi bi-trash"></i></button>
      </div>
    </div>
  `).join('');

  attachDeleteButtons();
}

function renderSkillsList() {
  const container = document.getElementById('skills-items-list');
  if (!container) return;
  const items = currentResume.skills || [];

  if (items.length === 0) {
    container.innerHTML = `<div class="text-muted small text-center py-2">No skills added yet.</div>`;
    return;
  }

  container.innerHTML = `
    <div class="d-flex flex-wrap gap-2">
      ${items.map(s => `
        <span class="badge bg-light text-dark border p-2 d-flex align-items-center gap-2">
          <span>${escapeHtml(s.skill_name)} <small class="text-muted">(${escapeHtml(s.skill_category || 'Tech')})</small></span>
          <button class="btn btn-sm p-0 text-danger border-0 delete-section-btn" data-type="skills" data-id="${s.id}">&times;</button>
        </span>
      `).join('')}
    </div>
  `;

  attachDeleteButtons();
}

function renderProjectsList() {
  const container = document.getElementById('projects-items-list');
  if (!container) return;
  const items = currentResume.projects || [];

  if (items.length === 0) {
    container.innerHTML = `<div class="text-muted small text-center py-2">No projects added yet.</div>`;
    return;
  }

  container.innerHTML = items.map(p => `
    <div class="p-3 bg-light rounded border mb-2 d-flex justify-content-between align-items-center">
      <div>
        <div class="fw-semibold small">${escapeHtml(p.project_title)}</div>
        <div class="text-muted small">${escapeHtml(p.technologies || '')}</div>
      </div>
      <div>
        <button class="btn btn-sm btn-outline-danger delete-section-btn" data-type="projects" data-id="${p.id}"><i class="bi bi-trash"></i></button>
      </div>
    </div>
  `).join('');

  attachDeleteButtons();
}

function renderCertificationsList() {
  const container = document.getElementById('certifications-items-list');
  if (!container) return;
  const items = currentResume.certifications || [];

  if (items.length === 0) {
    container.innerHTML = `<div class="text-muted small text-center py-2">No certifications added yet.</div>`;
    return;
  }

  container.innerHTML = items.map(c => `
    <div class="p-3 bg-light rounded border mb-2 d-flex justify-content-between align-items-center">
      <div>
        <div class="fw-semibold small">${escapeHtml(c.certification_name)}</div>
        <div class="text-muted small">${escapeHtml(c.issuing_organization || '')}</div>
      </div>
      <div>
        <button class="btn btn-sm btn-outline-danger delete-section-btn" data-type="certifications" data-id="${c.id}"><i class="bi bi-trash"></i></button>
      </div>
    </div>
  `).join('');

  attachDeleteButtons();
}

function renderAchievementsList() {
  const container = document.getElementById('achievements-items-list');
  if (!container) return;
  const items = currentResume.achievements || [];

  if (items.length === 0) {
    container.innerHTML = `<div class="text-muted small text-center py-2">No achievements added yet.</div>`;
    return;
  }

  container.innerHTML = items.map(a => `
    <div class="p-3 bg-light rounded border mb-2 d-flex justify-content-between align-items-center">
      <div>
        <div class="fw-semibold small">${escapeHtml(a.title)}</div>
        <div class="text-muted small">${escapeHtml(a.achievement_date || '')}</div>
      </div>
      <div>
        <button class="btn btn-sm btn-outline-danger delete-section-btn" data-type="achievements" data-id="${a.id}"><i class="bi bi-trash"></i></button>
      </div>
    </div>
  `).join('');

  attachDeleteButtons();
}

function renderLanguagesList() {
  const container = document.getElementById('languages-items-list');
  if (!container) return;
  const items = currentResume.languages || [];

  if (items.length === 0) {
    container.innerHTML = `<div class="text-muted small text-center py-2">No languages added yet.</div>`;
    return;
  }

  container.innerHTML = `
    <div class="d-flex flex-wrap gap-2">
      ${items.map(l => `
        <span class="badge bg-light text-dark border p-2 d-flex align-items-center gap-2">
          <span>${escapeHtml(l.language_name)} (${escapeHtml(l.proficiency || 'Fluent')})</span>
          <button class="btn btn-sm p-0 text-danger border-0 delete-section-btn" data-type="languages" data-id="${l.id}">&times;</button>
        </span>
      `).join('')}
    </div>
  `;

  attachDeleteButtons();
}

function attachDeleteButtons() {
  document.querySelectorAll('.delete-section-btn').forEach(btn => {
    btn.onclick = async () => {
      const type = btn.getAttribute('data-type');
      const id = btn.getAttribute('data-id');
      try {
        await apiFetch(`/api/resumes/${resumeId}/${type}/${id}`, { method: 'DELETE' });
        showToast('Record deleted.', 'info');
        await loadResume(resumeId);
      } catch (err) {
        showToast(err.message, 'danger');
      }
    };
  });
}

// -------------------------------------------------------------
// SECTION ADD MODAL SETUP
// -------------------------------------------------------------
function setupSectionModals() {
  // Education Add Form
  document.getElementById('form-add-education')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = {
      institution: document.getElementById('edu_institution').value,
      degree: document.getElementById('edu_degree').value,
      field_of_study: document.getElementById('edu_field').value,
      start_date: document.getElementById('edu_start').value,
      end_date: document.getElementById('edu_end').value,
      grade: document.getElementById('edu_grade').value,
      description: document.getElementById('edu_desc').value
    };
    await addSectionRecord('education', body, 'addEducationModal');
  });

  // Experience Add Form
  document.getElementById('form-add-experience')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = {
      company_name: document.getElementById('exp_company').value,
      job_title: document.getElementById('exp_role').value,
      employment_type: document.getElementById('exp_type').value,
      start_date: document.getElementById('exp_start').value,
      end_date: document.getElementById('exp_end').value,
      responsibilities: document.getElementById('exp_desc').value
    };
    await addSectionRecord('experience', body, 'addExperienceModal');
  });

  // Skill Add Form
  document.getElementById('form-add-skill')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = {
      skill_name: document.getElementById('skill_name_input').value,
      skill_category: document.getElementById('skill_category_select').value,
      proficiency: document.getElementById('skill_proficiency_select').value
    };
    await addSectionRecord('skills', body, 'addSkillModal');
  });

  // Project Add Form
  document.getElementById('form-add-project')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = {
      project_title: document.getElementById('proj_title').value,
      technologies: document.getElementById('proj_tech').value,
      description: document.getElementById('proj_desc').value,
      project_url: document.getElementById('proj_url').value,
      start_date: document.getElementById('proj_start').value,
      end_date: document.getElementById('proj_end').value
    };
    await addSectionRecord('projects', body, 'addProjectModal');
  });

  // Certification Add Form
  document.getElementById('form-add-certification')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = {
      certification_name: document.getElementById('cert_name').value,
      issuing_organization: document.getElementById('cert_org').value,
      issue_date: document.getElementById('cert_date').value,
      credential_url: document.getElementById('cert_url').value
    };
    await addSectionRecord('certifications', body, 'addCertificationModal');
  });

  // Achievement Add Form
  document.getElementById('form-add-achievement')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = {
      title: document.getElementById('ach_title').value,
      achievement_date: document.getElementById('ach_date').value,
      description: document.getElementById('ach_desc').value
    };
    await addSectionRecord('achievements', body, 'addAchievementModal');
  });

  // Language Add Form
  document.getElementById('form-add-language')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = {
      language_name: document.getElementById('lang_name').value,
      proficiency: document.getElementById('lang_prof').value
    };
    await addSectionRecord('languages', body, 'addLanguageModal');
  });
}

async function addSectionRecord(type, data, modalId) {
  try {
    await apiFetch(`/api/resumes/${resumeId}/${type}`, {
      method: 'POST',
      body: data
    });
    showToast('Record added successfully!', 'success');
    bootstrap.Modal.getInstance(document.getElementById(modalId))?.hide();
    document.getElementById(modalId)?.querySelector('form')?.reset();
    await loadResume(resumeId);
  } catch (err) {
    showToast(err.message, 'danger');
  }
}
