// public/js/resume-preview.js
// Dedicated preview & export controller with template switcher, vector PDF download, and browser print

let resumeId = null;
let currentResume = null;

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  resumeId = urlParams.get('id');

  if (!resumeId) {
    showToast('No resume ID specified.', 'warning');
    setTimeout(() => window.location.href = '/dashboard.html', 1000);
    return;
  }

  await loadPreview(resumeId);
  setupControls();
});

async function loadPreview(id) {
  try {
    const res = await apiFetch(`/api/resumes/${id}/preview-data`);
    currentResume = res.resume;

    document.getElementById('preview-title-display').textContent = currentResume.resume_title;
    document.getElementById('preview-template-select').value = currentResume.template_name || 'modern';
    document.getElementById('btn-edit-builder').href = `/resume-builder.html?id=${id}`;
    document.getElementById('btn-download-pdf-preview').href = `/api/resumes/${id}/pdf`;

    renderFullResume(currentResume);
  } catch (err) {
    console.error('[Preview] Load error:', err);
    showToast('Failed to load resume preview: ' + err.message, 'danger');
  }
}

function setupControls() {
  // Template Switcher in Preview
  document.getElementById('preview-template-select')?.addEventListener('change', async (e) => {
    const newTemplate = e.target.value;
    try {
      await apiFetch(`/api/resumes/${resumeId}`, {
        method: 'PUT',
        body: { template_name: newTemplate }
      });
      currentResume.template_name = newTemplate;
      renderFullResume(currentResume);
      showToast(`Switched to ${newTemplate.toUpperCase()} template!`, 'success');
    } catch (err) {
      showToast(err.message, 'danger');
    }
  });

  // Print button
  document.getElementById('btn-print-resume')?.addEventListener('click', () => {
    window.print();
  });
}

function renderFullResume(r) {
  const container = document.getElementById('preview-sheet');
  if (!container || !r) return;

  const t = r.template_name || 'modern';
  container.className = `resume-paper template-${t}`;

  const name = escapeHtml(r.user_full_name || 'Full Name');
  const profTitle = escapeHtml(r.professional_title || '');
  const summary = escapeHtml(r.professional_summary || '');
  const c = r.contact || {};

  const contactParts = [];
  if (r.user_email) contactParts.push(`<i class="bi bi-envelope me-1"></i>${escapeHtml(r.user_email)}`);
  if (c.phone) contactParts.push(`<i class="bi bi-telephone me-1"></i>${escapeHtml(c.phone)}`);
  if (c.city || c.country) contactParts.push(`<i class="bi bi-geo-alt me-1"></i>${escapeHtml([c.city, c.country].filter(Boolean).join(', '))}`);
  if (c.linkedin_url) contactParts.push(`<i class="bi bi-linkedin me-1"></i><a href="${escapeHtml(c.linkedin_url)}" target="_blank">LinkedIn</a>`);
  if (c.github_url) contactParts.push(`<i class="bi bi-github me-1"></i><a href="${escapeHtml(c.github_url)}" target="_blank">GitHub</a>`);
  if (c.portfolio_url) contactParts.push(`<i class="bi bi-globe me-1"></i><a href="${escapeHtml(c.portfolio_url)}" target="_blank">Portfolio</a>`);

  let html = `
    <div class="resume-header mb-4">
      <div class="resume-name">${name}</div>
      ${profTitle ? `<div class="resume-title mb-2">${profTitle}</div>` : ''}
      <div class="contact-line small d-flex flex-wrap gap-2 ${t === 'professional' ? 'justify-content-center' : ''}">
        ${contactParts.join(' &bull; ')}
      </div>
    </div>
  `;

  if (summary) {
    html += `
      <div class="resume-section mb-3">
        <div class="section-heading">Professional Summary</div>
        <p class="small text-muted" style="line-height: 1.6; text-align: justify;">${summary}</p>
      </div>
    `;
  }

  if (r.education && r.education.length > 0) {
    html += `
      <div class="resume-section mb-3">
        <div class="section-heading">Education</div>
        ${r.education.map(edu => `
          <div class="mb-2">
            <div class="d-flex justify-content-between align-items-baseline">
              <strong class="text-dark">${escapeHtml(edu.institution)}</strong>
              <span class="text-muted small">${escapeHtml([edu.start_date, edu.is_current ? 'Present' : edu.end_date].filter(Boolean).join(' - '))}</span>
            </div>
            <div class="text-primary small fw-semibold">
              ${escapeHtml(edu.degree)}${edu.field_of_study ? ` in ${escapeHtml(edu.field_of_study)}` : ''}
              ${edu.grade ? ` &bull; <span class="text-dark fw-normal">CGPA / Grade: ${escapeHtml(edu.grade)}</span>` : ''}
            </div>
            ${edu.description ? `<div class="text-muted small mt-1">${escapeHtml(edu.description)}</div>` : ''}
          </div>
        `).join('')}
      </div>
    `;
  }

  if (r.experience && r.experience.length > 0) {
    html += `
      <div class="resume-section mb-3">
        <div class="section-heading">Work Experience & Internships</div>
        ${r.experience.map(exp => `
          <div class="mb-3">
            <div class="d-flex justify-content-between align-items-baseline">
              <strong class="text-dark">${escapeHtml(exp.company_name)}</strong>
              <span class="text-muted small">${escapeHtml([exp.start_date, exp.is_current ? 'Present' : exp.end_date].filter(Boolean).join(' - '))}</span>
            </div>
            <div class="text-primary small fw-semibold">
              ${escapeHtml(exp.job_title)} <span class="text-muted fw-normal">(${escapeHtml(exp.employment_type || 'Full-time')})</span>
            </div>
            ${exp.responsibilities ? `
              <ul class="mb-0 mt-1 ps-3 small text-muted" style="line-height: 1.5;">
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

  if (r.skills && r.skills.length > 0) {
    const cats = {};
    r.skills.forEach(s => {
      const cat = s.skill_category || 'Technical';
      if (!cats[cat]) cats[cat] = [];
      cats[cat].push(s);
    });

    html += `
      <div class="resume-section mb-3">
        <div class="section-heading">Technical & Professional Skills</div>
        ${Object.keys(cats).map(category => `
          <div class="mb-1 small">
            <strong class="text-dark">${escapeHtml(category)}: </strong>
            ${cats[category].map(s => `
              <span class="${t === 'modern' ? 'skill-badge' : ''}">${escapeHtml(s.skill_name)}${s.proficiency ? ` (${escapeHtml(s.proficiency)})` : ''}</span>
            `).join(t === 'modern' ? ' ' : ', ')}
          </div>
        `).join('')}
      </div>
    `;
  }

  if (r.projects && r.projects.length > 0) {
    html += `
      <div class="resume-section mb-3">
        <div class="section-heading">Projects</div>
        ${r.projects.map(p => `
          <div class="mb-2">
            <div class="d-flex justify-content-between align-items-baseline">
              <strong class="text-dark">${escapeHtml(p.project_title)}</strong>
              <span class="text-muted small">${escapeHtml([p.start_date, p.end_date].filter(Boolean).join(' - '))}</span>
            </div>
            ${p.technologies ? `<div class="text-primary small">Technologies: ${escapeHtml(p.technologies)}</div>` : ''}
            ${p.description ? `<div class="text-muted small mt-1">${escapeHtml(p.description)}</div>` : ''}
            ${p.project_url ? `<div class="small"><a href="${escapeHtml(p.project_url)}" target="_blank" class="text-decoration-underline">Project Link</a></div>` : ''}
          </div>
        `).join('')}
      </div>
    `;
  }

  if (r.certifications && r.certifications.length > 0) {
    html += `
      <div class="resume-section mb-3">
        <div class="section-heading">Certifications</div>
        ${r.certifications.map(cert => `
          <div class="d-flex justify-content-between align-items-baseline mb-1 small">
            <div>
              <strong class="text-dark">${escapeHtml(cert.certification_name)}</strong>
              ${cert.issuing_organization ? `<span class="text-muted"> &bull; ${escapeHtml(cert.issuing_organization)}</span>` : ''}
            </div>
            <span class="text-muted small">${escapeHtml(cert.issue_date || '')}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  if (r.achievements && r.achievements.length > 0) {
    html += `
      <div class="resume-section mb-3">
        <div class="section-heading">Achievements & Honors</div>
        ${r.achievements.map(a => `
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

  if (r.languages && r.languages.length > 0) {
    html += `
      <div class="resume-section mb-3">
        <div class="section-heading">Languages</div>
        <div class="small text-muted">
          ${r.languages.map(l => `<strong>${escapeHtml(l.language_name)}</strong> (${escapeHtml(l.proficiency || 'Fluent')})`).join('  &bull;  ')}
        </div>
      </div>
    `;
  }

  container.innerHTML = html;
}
