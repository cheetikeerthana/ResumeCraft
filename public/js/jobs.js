// public/js/jobs.js
// Career Resources & Job Search portal aggregator

document.addEventListener('DOMContentLoaded', () => {
  setupSearchRedirects();
});

function setupSearchRedirects() {
  const keywordInput = document.getElementById('job-keyword-input');
  const locationInput = document.getElementById('job-location-input');

  function getQuery() {
    const k = encodeURIComponent(keywordInput?.value.trim() || 'Software Engineer');
    const l = encodeURIComponent(locationInput?.value.trim() || 'India');
    return { k, l };
  }

  // LinkedIn Jobs
  document.getElementById('btn-search-linkedin')?.addEventListener('click', () => {
    const { k, l } = getQuery();
    window.open(`https://www.linkedin.com/jobs/search/?keywords=${k}&location=${l}`, '_blank', 'noopener,noreferrer');
  });

  // Indeed
  document.getElementById('btn-search-indeed')?.addEventListener('click', () => {
    const { k, l } = getQuery();
    window.open(`https://www.indeed.com/jobs?q=${k}&l=${l}`, '_blank', 'noopener,noreferrer');
  });

  // National Career Service (India NCS)
  document.getElementById('btn-search-ncs')?.addEventListener('click', () => {
    const { k } = getQuery();
    window.open(`https://www.ncs.gov.in/job-seeker/Pages/SearchJobs.aspx?key=${k}`, '_blank', 'noopener,noreferrer');
  });

  // Internshala
  document.getElementById('btn-search-internshala')?.addEventListener('click', () => {
    const { k } = getQuery();
    window.open(`https://internshala.com/internships/matching-preferences/?keywords=${k}`, '_blank', 'noopener,noreferrer');
  });
}
