// test/run-tests.js
// Automated End-to-End Verification Test Suite for ResumeCraft Full-Stack Application

const http = require('http');
const { app, startServer } = require('../server');
const { pool, testConnection } = require('../db');

let server;
let baseUrl;
const PORT = 3001; // Test port to avoid conflict

// Test cookie jar to maintain session across calls
let sessionCookie = '';
let csrfToken = '';

async function request(path, options = {}) {
  const url = `${baseUrl}${path}`;
  const headers = {
    'Accept': 'application/json',
    ...(sessionCookie ? { 'Cookie': sessionCookie } : {}),
    ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    ...(options.headers || {})
  };

  if (options.body && typeof options.body === 'object') {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  const res = await fetch(url, { ...options, headers });

  // Update session cookie
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) {
    const sid = setCookie.match(/resumecraft\.sid=[^;]+/);
    if (sid) sessionCookie = sid[0];

    const xsrf = setCookie.match(/XSRF-TOKEN=[^;]+/);
    if (xsrf) csrfToken = xsrf[0].split('=')[1];
  }

  let data = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else if (contentType.includes('application/pdf')) {
    data = await res.arrayBuffer();
  } else {
    data = await res.text();
  }

  return { status: res.status, ok: res.ok, headers: res.headers, data };
}

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}`);
    failed++;
  }
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('🧪 Starting ResumeCraft End-to-End Verification Test Suite');
  console.log('================================================================');

  // Verify DB
  const dbOk = await testConnection();
  assert(dbOk, 'MySQL database connected & pool active');

  // Start HTTP server on test port
  server = app.listen(PORT);
  baseUrl = `http://localhost:${PORT}`;

  try {
    // ----------------------------------------------------------------
    // 1. Health & DB Test Endpoints
    // ----------------------------------------------------------------
    console.log('\n--- 1. Health & Database Test Endpoints ---');
    const healthRes = await request('/api/health');
    assert(healthRes.status === 200 && healthRes.data.status === 'ok', 'GET /api/health responds with status ok');
    assert(healthRes.data.database.connected === true, 'GET /api/health confirms database connected');

    const dbTestRes = await request('/api/db-test');
    assert(dbTestRes.status === 200 && dbTestRes.data.success === true, 'GET /api/db-test queries MySQL successfully');
    assert(dbTestRes.data.tablesCount >= 10, `Database tables detected (${dbTestRes.data.tablesCount} tables found)`);

    // Fetch initial CSRF token
    const csrfRes = await request('/api/auth/csrf-token');
    assert(csrfRes.status === 200 && csrfRes.data.success === true, 'GET /api/auth/csrf-token retrieves security token');
    if (csrfRes.data.csrfToken) csrfToken = csrfRes.data.csrfToken;

    // ----------------------------------------------------------------
    // 2. Authentication: Registration, Validation & Duplicates
    // ----------------------------------------------------------------
    console.log('\n--- 2. Authentication: Registration & Validation ---');
    const testEmail = `testuser_${Date.now()}@resumecraft.test`;
    const testPassword = 'Password@123';

    // Password mismatch test
    const mismatchRes = await request('/api/auth/register', {
      method: 'POST',
      body: {
        full_name: 'Test Tester',
        email: testEmail,
        password: testPassword,
        confirm_password: 'DifferentPassword'
      }
    });
    assert(mismatchRes.status === 400, 'Rejects registration when confirm_password does not match');

    // Valid registration
    const regRes = await request('/api/auth/register', {
      method: 'POST',
      body: {
        full_name: 'Test Candidate',
        email: testEmail,
        password: testPassword,
        confirm_password: testPassword
      }
    });
    assert(regRes.status === 201 && regRes.data.success === true, 'Registers new user and creates session');

    // Duplicate email registration rejection
    const dupRes = await request('/api/auth/register', {
      method: 'POST',
      body: {
        full_name: 'Duplicate Candidate',
        email: testEmail,
        password: testPassword,
        confirm_password: testPassword
      }
    });
    assert(dupRes.status === 400 && dupRes.data.success === false, 'Rejects duplicate email registration');

    // Me endpoint check
    const meRes = await request('/api/auth/me');
    assert(meRes.data.authenticated === true && meRes.data.user.email === testEmail, 'GET /api/auth/me validates active session');

    // ----------------------------------------------------------------
    // 3. Logout & Session Invalidation
    // ----------------------------------------------------------------
    console.log('\n--- 3. Logout & Protected Access ---');
    const logoutRes = await request('/api/auth/logout', { method: 'POST' });
    assert(logoutRes.status === 200 && logoutRes.data.success === true, 'POST /api/auth/logout destroys session');

    // Access protected API after logout
    const unauthRes = await request('/api/profile');
    assert(unauthRes.status === 401, 'Protected endpoint /api/profile returns 401 Unauthorized after logout');

    // ----------------------------------------------------------------
    // 4. Login: Credential Checking & Invalid Password
    // ----------------------------------------------------------------
    console.log('\n--- 4. Login Authentication ---');
    const wrongPassRes = await request('/api/auth/login', {
      method: 'POST',
      body: { email: testEmail, password: 'WrongPassword!' }
    });
    assert(wrongPassRes.status === 401, 'Rejects login with invalid password');

    const validLoginRes = await request('/api/auth/login', {
      method: 'POST',
      body: { email: testEmail, password: testPassword }
    });
    assert(validLoginRes.status === 200 && validLoginRes.data.success === true, 'Successful login establishes new session');

    // ----------------------------------------------------------------
    // 5. Profile Management
    // ----------------------------------------------------------------
    console.log('\n--- 5. Profile Management ---');
    const profileRes = await request('/api/profile');
    assert(profileRes.status === 200 && profileRes.data.profile.email === testEmail, 'GET /api/profile retrieves user profile');

    const updateNameRes = await request('/api/profile', {
      method: 'PUT',
      body: { full_name: 'Test Candidate Updated' }
    });
    assert(updateNameRes.status === 200 && updateNameRes.data.user.name === 'Test Candidate Updated', 'PUT /api/profile updates user full name');

    // ----------------------------------------------------------------
    // 6. Resume CRUD, Sections & Transactional Duplication
    // ----------------------------------------------------------------
    console.log('\n--- 6. Resumes & Relational Sections CRUD ---');
    const createResumeRes = await request('/api/resumes', {
      method: 'POST',
      body: {
        resume_title: 'Full Stack Web Developer Resume',
        template_name: 'modern',
        professional_title: 'Software Engineer'
      }
    });
    assert(createResumeRes.status === 201 && createResumeRes.data.resumeId > 0, 'POST /api/resumes creates new resume');
    const resumeId = createResumeRes.data.resumeId;

    // Contact info update
    const updateContactRes = await request(`/api/resumes/${resumeId}/contact`, {
      method: 'PUT',
      body: {
        phone: '+91 99999 88888',
        city: 'Hyderabad',
        country: 'India',
        linkedin_url: 'https://linkedin.com/in/testuser',
        github_url: 'https://github.com/testuser'
      }
    });
    assert(updateContactRes.status === 200 && updateContactRes.data.success === true, 'PUT /api/resumes/:id/contact updates contact details');

    // Add Education
    const addEduRes = await request(`/api/resumes/${resumeId}/education`, {
      method: 'POST',
      body: {
        institution: 'National Institute of Technology',
        degree: 'B.Tech',
        field_of_study: 'Computer Science',
        start_date: '2022',
        end_date: '2026',
        grade: '9.2 CGPA',
        description: 'Web Technologies and Cloud Systems'
      }
    });
    assert(addEduRes.status === 201 && addEduRes.data.id > 0, 'POST /api/resumes/:id/education adds education record');

    // Add Experience
    const addExpRes = await request(`/api/resumes/${resumeId}/experience`, {
      method: 'POST',
      body: {
        company_name: 'Tech Innovations Corp',
        job_title: 'Software Development Intern',
        employment_type: 'Internship',
        start_date: 'June 2025',
        end_date: 'August 2025',
        responsibilities: '• Architected 5+ RESTful APIs with MySQL relational schema.\n• Reduced database response times by 30% through index optimization.'
      }
    });
    assert(addExpRes.status === 201 && addExpRes.data.id > 0, 'POST /api/resumes/:id/experience adds experience record');

    // Add Skills
    const addSkillRes = await request(`/api/resumes/${resumeId}/skills`, {
      method: 'POST',
      body: {
        skill_name: 'Node.js',
        skill_category: 'Technical',
        proficiency: 'Advanced'
      }
    });
    assert(addSkillRes.status === 201, 'POST /api/resumes/:id/skills adds skill record');

    // Add Project
    const addProjRes = await request(`/api/resumes/${resumeId}/projects`, {
      method: 'POST',
      body: {
        project_title: 'ResumeCraft Platform',
        technologies: 'Node.js, Express, MySQL',
        description: 'Full stack AI resume builder'
      }
    });
    assert(addProjRes.status === 201, 'POST /api/resumes/:id/projects adds project record');

    // Fetch full resume
    const fullResumeRes = await request(`/api/resumes/${resumeId}`);
    assert(fullResumeRes.status === 200 && fullResumeRes.data.resume.education.length === 1, 'GET /api/resumes/:id retrieves full relational resume');
    assert(fullResumeRes.data.resume.completion_percentage > 50, `Calculated completion percentage (${fullResumeRes.data.resume.completion_percentage}%)`);

    // Duplicate resume via database transaction
    const dupResumeRes = await request(`/api/resumes/${resumeId}/duplicate`, { method: 'POST' });
    assert(dupResumeRes.status === 201 && dupResumeRes.data.newId > 0, 'POST /api/resumes/:id/duplicate clones entire resume tree atomically');

    // ----------------------------------------------------------------
    // 7. PDF Export
    // ----------------------------------------------------------------
    console.log('\n--- 7. PDF Document Generation ---');
    const pdfRes = await request(`/api/resumes/${resumeId}/pdf`);
    assert(pdfRes.status === 200, 'GET /api/resumes/:id/pdf generates vector PDF');
    assert(pdfRes.headers.get('content-type') === 'application/pdf', 'Response has content-type application/pdf');
    assert(pdfRes.data.byteLength > 1000, `PDF document stream contains valid binary data (${pdfRes.data.byteLength} bytes)`);

    // ----------------------------------------------------------------
    // 8. Resume Quality Assistant & Job Description Matcher
    // ----------------------------------------------------------------
    console.log('\n--- 8. Resume Assistant & ATS Quality Engine ---');
    const analyzeRes = await request(`/api/resumes/${resumeId}/analyze`, { method: 'POST' });
    assert(analyzeRes.status === 200 && analyzeRes.data.analysis.overallScore > 0, `Resume analysis calculates quality score (${analyzeRes.data.analysis.overallScore}/100)`);
    assert(analyzeRes.data.analysis.rubric.completeness > 0, 'Rubric completeness evaluated');
    assert(analyzeRes.data.analysis.rubric.impactAndVerbs >= 0, 'Rubric action verbs evaluated');

    // JD Matcher test
    const jdMatchRes = await request(`/api/resumes/${resumeId}/compare-jd`, {
      method: 'POST',
      body: {
        job_description: 'Looking for a Software Engineer skilled in Node.js, Express, MySQL, and Docker for scalable architectures.'
      }
    });
    assert(jdMatchRes.status === 200 && jdMatchRes.data.comparison.matchPercentage > 0, `Job Description matcher calculates alignment (${jdMatchRes.data.comparison.matchPercentage}% match)`);

    // AI/Rule fallback suggestions
    const suggestRes = await request(`/api/resumes/${resumeId}/ai-suggest`, {
      method: 'POST',
      body: { prompt_type: 'summary' }
    });
    assert(suggestRes.status === 200 && suggestRes.data.result.suggestions.length > 0, 'Assistant generates structured summary suggestions (Rule/AI engine)');

    // ----------------------------------------------------------------
    // 9. Job Application Tracker CRUD
    // ----------------------------------------------------------------
    console.log('\n--- 9. Job Application Tracker CRUD ---');
    const addAppRes = await request('/api/applications', {
      method: 'POST',
      body: {
        company_name: 'Stripe',
        job_title: 'Software Engineer (Backend)',
        location: 'Bengaluru, India',
        status: 'Interview',
        notes: 'Technical assessment scheduled.'
      }
    });
    assert(addAppRes.status === 201 && addAppRes.data.application.id > 0, 'POST /api/applications records new job application');
    const appId = addAppRes.data.application.id;

    const listAppsRes = await request('/api/applications?status=Interview');
    assert(listAppsRes.status === 200 && listAppsRes.data.applications.length >= 1, 'GET /api/applications filters by status successfully');

    const updateAppRes = await request(`/api/applications/${appId}`, {
      method: 'PUT',
      body: {
        company_name: 'Stripe',
        job_title: 'Senior Software Engineer',
        status: 'Offer',
        notes: 'Received formal offer.'
      }
    });
    assert(updateAppRes.status === 200 && updateAppRes.data.application.status === 'Offer', 'PUT /api/applications/:id updates application status');

    const deleteAppRes = await request(`/api/applications/${appId}`, { method: 'DELETE' });
    assert(deleteAppRes.status === 200, 'DELETE /api/applications/:id removes application');

    // ----------------------------------------------------------------
    // 10. Cross-User Data Isolation Protection
    // ----------------------------------------------------------------
    console.log('\n--- 10. Cross-User Isolation & Security ---');
    // Register User 2
    const user2Email = `otheruser_${Date.now()}@resumecraft.test`;
    await request('/api/auth/register', {
      method: 'POST',
      body: {
        full_name: 'Other Candidate',
        email: user2Email,
        password: 'Password@123',
        confirm_password: 'Password@123'
      }
    });

    // User 2 attempts to access User 1's resume
    const crossAccessRes = await request(`/api/resumes/${resumeId}`);
    assert(crossAccessRes.status === 404 || crossAccessRes.status === 403, 'Cross-user resume access is strictly rejected (404/403)');

    // User 2 attempts to delete User 1's resume
    const crossDeleteRes = await request(`/api/resumes/${resumeId}`, { method: 'DELETE' });
    assert(crossDeleteRes.status === 404 || crossDeleteRes.status === 403, 'Cross-user resume deletion is blocked');

    // ----------------------------------------------------------------
    // 11. Cascading Account Deletion
    // ----------------------------------------------------------------
    console.log('\n--- 11. Cascading Account Deletion ---');
    const deleteAccountRes = await request('/api/profile', {
      method: 'DELETE',
      body: {
        confirm_text: 'DELETE',
        password: 'Password@123'
      }
    });
    assert(deleteAccountRes.status === 200 && deleteAccountRes.data.success === true, 'DELETE /api/profile cascades user removal');

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    server.close();
    console.log('\n================================================================');
    console.log(`🏁 Test Results: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================');
    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  }
}

if (require.main === module) {
  runTestSuite();
}

module.exports = runTestSuite;
