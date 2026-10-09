// public/js/resume-assistant.js
// Resume Quality Assistant: Quality evaluation, Rubric scoring, JD keyword comparison, and AI/Rule suggestions

let resumesList = [];
let selectedResumeId = null;
let currentAnalysis = null;

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  selectedResumeId = urlParams.get('id');

  await loadUserResumes();
  setupAssistantHandlers();
});

async function loadUserResumes() {
  try {
    const res = await apiFetch('/api/resumes');
    resumesList = res.resumes || [];

    const select = document.getElementById('assistant-resume-select');
    if (!select) return;

    if (resumesList.length === 0) {
      select.innerHTML = '<option value="">No resumes found. Please create one first.</option>';
      return;
    }

    select.innerHTML = resumesList.map(r => `
      <option value="${r.id}" ${r.id == selectedResumeId ? 'selected' : ''}>
        ${escapeHtml(r.resume_title)} (${r.completion_percentage}% completed)
      </option>
    `).join('');

    if (!selectedResumeId && resumesList.length > 0) {
      selectedResumeId = resumesList[0].id;
    }

    if (selectedResumeId) {
      await runAnalysis(selectedResumeId);
    }
  } catch (err) {
    console.error('[Assistant] Failed to load resumes:', err);
    showToast('Failed to load resumes for analysis.', 'danger');
  }
}

async function runAnalysis(resumeId) {
  try {
    const res = await apiFetch(`/api/resumes/${resumeId}/analyze`, { method: 'POST' });
    currentAnalysis = res.analysis;
    renderAnalysisResults(currentAnalysis);
  } catch (err) {
    console.error('[Assistant] Analysis error:', err);
    showToast(err.message, 'danger');
  }
}

function renderAnalysisResults(a) {
  if (!a) return;

  // Score & Grade
  const score = a.overallScore || 0;
  document.getElementById('overall-score-display').textContent = score;

  const scoreBadge = document.getElementById('score-grade-badge');
  if (score >= 85) {
    scoreBadge.className = 'badge bg-success fs-6';
    scoreBadge.textContent = 'Excellent (ATS-Ready)';
  } else if (score >= 65) {
    scoreBadge.className = 'badge bg-primary fs-6';
    scoreBadge.textContent = 'Good (Needs Minor Polish)';
  } else {
    scoreBadge.className = 'badge bg-warning text-dark fs-6';
    scoreBadge.textContent = 'Needs Improvement';
  }

  // Rubric Bars
  const r = a.rubric || {};
  setRubricBar('rubric-completeness-bar', 'rubric-completeness-val', r.completeness || 0, 30);
  setRubricBar('rubric-impact-bar', 'rubric-impact-val', r.impactAndVerbs || 0, 30);
  setRubricBar('rubric-skills-bar', 'rubric-skills-val', r.skillsAndProfiles || 0, 20);
  setRubricBar('rubric-structure-bar', 'rubric-structure-val', r.structureAndHonors || 0, 20);

  // Strengths
  const strengthsContainer = document.getElementById('strengths-list-container');
  if (a.strengths && a.strengths.length > 0) {
    strengthsContainer.innerHTML = a.strengths.map(s => `
      <li class="mb-2 text-success small d-flex align-items-start gap-2">
        <i class="bi bi-check-circle-fill mt-1"></i>
        <span class="text-dark">${escapeHtml(s)}</span>
      </li>
    `).join('');
  } else {
    strengthsContainer.innerHTML = '<li class="text-muted small">Keep adding content to unlock strengths.</li>';
  }

  // Issues & Recommendations
  const issuesContainer = document.getElementById('issues-list-container');
  const allIssues = [...(a.issues || []).map(i => i.text), ...(a.recommendations || [])];

  if (allIssues.length > 0) {
    issuesContainer.innerHTML = allIssues.map(i => `
      <li class="mb-2 text-warning small d-flex align-items-start gap-2">
        <i class="bi bi-exclamation-triangle-fill mt-1"></i>
        <span class="text-dark">${escapeHtml(i)}</span>
      </li>
    `).join('');
  } else {
    issuesContainer.innerHTML = '<li class="text-success small"><i class="bi bi-patch-check-fill me-1"></i>No critical flaws detected!</li>';
  }

  // Action Verbs Chips
  const verbsContainer = document.getElementById('action-verbs-chips');
  if (verbsContainer && a.actionVerbsSample) {
    verbsContainer.innerHTML = a.actionVerbsSample.map(v => `
      <span class="badge bg-light text-primary border py-2 px-3 fw-semibold cursor-pointer action-verb-chip" title="Click to copy">
        ${escapeHtml(v)}
      </span>
    `).join('');

    verbsContainer.querySelectorAll('.action-verb-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        navigator.clipboard.writeText(chip.textContent.trim());
        showToast(`Copied "${chip.textContent.trim()}" to clipboard!`, 'info');
      });
    });
  }
}

function setRubricBar(barId, valId, current, max) {
  const bar = document.getElementById(barId);
  const val = document.getElementById(valId);
  const pct = Math.round((current / max) * 100);
  if (bar) {
    bar.style.width = `${pct}%`;
    bar.className = `progress-bar ${pct >= 75 ? 'bg-success' : pct >= 50 ? 'bg-info' : 'bg-warning'}`;
  }
  if (val) {
    val.textContent = `${current} / ${max}`;
  }
}

function setupAssistantHandlers() {
  // Resume Selector Change
  document.getElementById('assistant-resume-select')?.addEventListener('change', async (e) => {
    selectedResumeId = e.target.value;
    if (selectedResumeId) {
      await runAnalysis(selectedResumeId);
    }
  });

  // Re-run Analysis Button
  document.getElementById('btn-rerun-analysis')?.addEventListener('click', async () => {
    if (selectedResumeId) {
      await runAnalysis(selectedResumeId);
      showToast('Analysis updated!', 'success');
    }
  });

  // ----------------------------------------------------------------
  // JOB DESCRIPTION COMPARISON
  // ----------------------------------------------------------------
  document.getElementById('btn-compare-jd')?.addEventListener('click', async () => {
    const jdText = document.getElementById('jd-textarea').value.trim();
    if (!jdText) {
      showToast('Please paste a job description first.', 'warning');
      return;
    }

    try {
      const res = await apiFetch(`/api/resumes/${selectedResumeId}/compare-jd`, {
        method: 'POST',
        body: { job_description: jdText }
      });

      renderJdComparison(res.comparison);
    } catch (err) {
      showToast(err.message, 'danger');
    }
  });

  // ----------------------------------------------------------------
  // AI / RULE-BASED SUGGESTION GENERATOR
  // ----------------------------------------------------------------
  document.getElementById('btn-suggest-summary')?.addEventListener('click', async () => {
    await fetchAiSuggestions('summary', '');
  });

  document.getElementById('btn-polish-bullet')?.addEventListener('click', async () => {
    const bullet = document.getElementById('bullet-polish-input').value.trim();
    if (!bullet) {
      showToast('Please type a bullet point to polish.', 'warning');
      return;
    }
    await fetchAiSuggestions('bullet_polish', bullet);
  });
}

function renderJdComparison(c) {
  document.getElementById('jd-results-container').classList.remove('d-none');
  const pct = c.matchPercentage || 0;

  const bar = document.getElementById('jd-match-bar');
  const txt = document.getElementById('jd-match-percent');
  bar.style.width = `${pct}%`;
  bar.className = `progress-bar ${pct >= 70 ? 'bg-success' : pct >= 45 ? 'bg-warning' : 'bg-danger'}`;
  txt.textContent = `${pct}% Match`;

  document.getElementById('jd-note-text').textContent = c.analysisNote || '';

  // Matched Keywords
  const matchedContainer = document.getElementById('jd-matched-keywords');
  if (c.matchedKeywords && c.matchedKeywords.length > 0) {
    matchedContainer.innerHTML = c.matchedKeywords.map(k => `
      <span class="badge bg-success-subtle text-success border border-success-subtle me-1 mb-1">${escapeHtml(k)}</span>
    `).join('');
  } else {
    matchedContainer.innerHTML = '<span class="text-muted small">No target keywords matched yet.</span>';
  }

  // Missing Keywords
  const missingContainer = document.getElementById('jd-missing-keywords');
  if (c.missingKeywords && c.missingKeywords.length > 0) {
    missingContainer.innerHTML = c.missingKeywords.map(k => `
      <span class="badge bg-danger-subtle text-danger border border-danger-subtle me-1 mb-1">${escapeHtml(k)}</span>
    `).join('');
  } else {
    missingContainer.innerHTML = '<span class="text-success small">All identified key requirements are present in your resume!</span>';
  }
}

async function fetchAiSuggestions(type, customInput) {
  const container = document.getElementById('suggestions-output-container');
  const modeBadge = document.getElementById('suggestions-mode-badge');
  container.innerHTML = '<div class="text-center py-4"><span class="spinner-border spinner-border-sm text-primary me-2"></span>Generating tailored suggestions...</div>';

  try {
    const res = await apiFetch(`/api/resumes/${selectedResumeId}/ai-suggest`, {
      method: 'POST',
      body: { prompt_type: type, custom_input: customInput }
    });

    const data = res.result;
    modeBadge.textContent = data.mode;
    modeBadge.className = `badge ${data.isAiGenerated ? 'bg-primary' : 'bg-secondary'}`;

    if (data.suggestions && data.suggestions.length > 0) {
      container.innerHTML = data.suggestions.map((s, idx) => `
        <div class="p-3 bg-light rounded border mb-2">
          <div class="small text-dark mb-2">${escapeHtml(s)}</div>
          <div class="d-flex justify-content-between align-items-center">
            <small class="text-muted">Option ${idx + 1}</small>
            <button class="btn btn-sm btn-outline-primary apply-suggestion-btn" data-text="${escapeHtml(s)}" data-type="${type}">
              <i class="bi bi-check2 me-1"></i>Apply to Resume
            </button>
          </div>
        </div>
      `).join('');

      container.querySelectorAll('.apply-suggestion-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const text = btn.getAttribute('data-text');
          const pType = btn.getAttribute('data-type');
          await applySuggestionToResume(text, pType);
        });
      });
    } else {
      container.innerHTML = '<div class="text-muted small">No suggestions generated.</div>';
    }
  } catch (err) {
    container.innerHTML = `<div class="text-danger small py-3">Error generating suggestions: ${escapeHtml(err.message)}</div>`;
  }
}

async function applySuggestionToResume(text, type) {
  try {
    // 1. First save version snapshot to preserve previous version history
    await apiFetch(`/api/resumes/${selectedResumeId}/save-version`, {
      method: 'POST',
      body: { summary: `Automatic snapshot prior to applying ${type} suggestion` }
    });

    // 2. Apply if summary
    if (type === 'summary') {
      await apiFetch(`/api/resumes/${selectedResumeId}`, {
        method: 'PUT',
        body: { professional_summary: text }
      });
      showToast('Professional summary updated in resume! Snapshot saved.', 'success');
      await runAnalysis(selectedResumeId);
    } else {
      // Copy to clipboard for easy insertion into experience bullets
      navigator.clipboard.writeText(text);
      showToast('Polished bullet copied to clipboard! Paste it into your Experience section in the Builder.', 'info');
    }
  } catch (err) {
    showToast(err.message, 'danger');
  }
}
