// services/assistantService.js
// Resume Quality Assistant: Comprehensive rule-based analysis + optional Gemini AI integration

const ACTION_VERBS = [
  'accelerated', 'achieved', 'administered', 'analyzed', 'architected', 'automated',
  'built', 'championed', 'collaborated', 'configured', 'constructed', 'coordinated',
  'created', 'decreased', 'delivered', 'deployed', 'designed', 'developed', 'devised',
  'directed', 'engineered', 'enhanced', 'established', 'executed', 'expanded', 'expedited',
  'formulated', 'generated', 'guided', 'implemented', 'improved', 'increased', 'initiated',
  'innovated', 'installed', 'instituted', 'integrated', 'launched', 'led', 'maintained',
  'managed', 'maximized', 'mentored', 'minimized', 'modernized', 'negotiated', 'optimized',
  'orchestrated', 'overhauled', 'pioneered', 'planned', 'produced', 'programmed', 'reduced',
  're-engineered', 'refactored', 'resolved', 'revamped', 'scaled', 'simplified', 'spearheaded',
  'standardized', 'streamlined', 'strengthened', 'structured', 'surpassed', 'transformed'
];

const WEAK_WORDS = [
  'worked on', 'helped with', 'responsible for', 'tried to', 'assisted in',
  'participated in', 'duties included', 'was tasked with', 'handled various', 'did work'
];

const COMMON_TECH_KEYWORDS = [
  'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'golang', 'rust', 'php',
  'react', 'angular', 'vue', 'next.js', 'node.js', 'express', 'spring boot', 'django', 'flask',
  'mysql', 'postgresql', 'mongodb', 'redis', 'sqlite', 'oracle', 'nosql', 'sql',
  'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'ci/cd', 'git', 'github', 'linux',
  'rest api', 'graphql', 'microservices', 'html5', 'css3', 'bootstrap', 'tailwind',
  'unit testing', 'jest', 'cypress', 'agile', 'scrum', 'data structures', 'algorithms',
  'machine learning', 'deep learning', 'ai', 'devops', 'system design', 'security'
];

// Perform comprehensive rule-based analysis
function analyzeResumeQuality(resume) {
  const issues = [];
  const strengths = [];
  const recommendations = [];

  let completenessScore = 0; // max 30
  let impactScore = 0;       // max 30
  let brevityScore = 0;      // max 20
  let structureScore = 0;    // max 20

  // 1. Completeness Evaluation
  if (resume.user_full_name && resume.user_full_name.trim().length > 2) completenessScore += 5;
  if (resume.contact?.phone && (resume.contact?.city || resume.contact?.country)) completenessScore += 5;
  else issues.push({ category: 'Contact', text: 'Missing complete contact details (phone number or location).' });

  if (resume.professional_title && resume.professional_title.trim().length > 3) {
    completenessScore += 5;
    strengths.push('Professional target title is clearly defined.');
  } else {
    issues.push({ category: 'Title', text: 'Add a targeted professional title (e.g. "Full-Stack Software Engineer").' });
  }

  if (resume.professional_summary && resume.professional_summary.trim().length >= 40) {
    completenessScore += 5;
    strengths.push('Professional summary provides clear introductory career value.');
  } else {
    issues.push({ category: 'Summary', text: 'Professional summary is missing or too brief (aim for 2-4 sentences).' });
  }

  if (resume.education && resume.education.length > 0) {
    completenessScore += 5;
  } else {
    issues.push({ category: 'Education', text: 'No education history listed. Vital for university and campus recruitment.' });
  }

  if ((resume.experience && resume.experience.length > 0) || (resume.projects && resume.projects.length >= 2)) {
    completenessScore += 5;
    strengths.push('Strong portfolio representation with experience and practical projects.');
  } else {
    issues.push({ category: 'Experience', text: 'Add at least one work experience, internship, or comprehensive project.' });
  }

  // 2. Impact & Action Verbs Evaluation
  let totalBullets = 0;
  let actionVerbCount = 0;
  let weakWordCount = 0;
  let quantifiedCount = 0;

  const textToScan = [];
  if (resume.experience) {
    resume.experience.forEach(e => {
      if (e.responsibilities) textToScan.push(...e.responsibilities.split('\n'));
    });
  }
  if (resume.projects) {
    resume.projects.forEach(p => {
      if (p.description) textToScan.push(...p.description.split('\n'));
    });
  }

  textToScan.forEach(line => {
    const trimmed = line.trim().toLowerCase();
    if (trimmed.length > 10) {
      totalBullets++;
      // Check first 3 words for strong action verb
      const firstWords = trimmed.split(/\s+/).slice(0, 3).join(' ');
      const hasActionVerb = ACTION_VERBS.some(v => firstWords.includes(v));
      if (hasActionVerb) actionVerbCount++;

      // Check for weak phrases
      if (WEAK_WORDS.some(w => trimmed.includes(w))) {
        weakWordCount++;
      }

      // Check for metrics/numbers (% or digits or currency)
      if (/\b\d+([.,]\d+)?%|\b\d+\+|\$\d+|\b\d+\s*(users|ms|seconds|hours|clients|queries|records|times|x)\b/i.test(trimmed)) {
        quantifiedCount++;
      }
    }
  });

  if (totalBullets > 0) {
    const actionVerbRatio = actionVerbCount / totalBullets;
    impactScore = Math.round(actionVerbRatio * 20);

    if (weakWordCount > 0) {
      issues.push({
        category: 'Action Verbs',
        text: `Found ${weakWordCount} passive or weak phrases (e.g. "responsible for", "worked on"). Replace them with assertive action verbs.`
      });
    }

    if (actionVerbRatio >= 0.6) {
      strengths.push('Excellent usage of strong, proactive action verbs at bullet beginnings.');
    } else {
      recommendations.push('Begin every bullet point with a powerful past-tense action verb such as "Architected", "Engineered", or "Spearheaded".');
    }

    // Quantifiable results
    if (quantifiedCount > 0) {
      impactScore += Math.min(10, quantifiedCount * 3);
      strengths.push(`Contains ${quantifiedCount} quantified accomplishments with measurable numbers, percentages, or metrics.`);
    } else {
      recommendations.push('Add quantifiable metrics to your project/work bullets (e.g. "improved load time by 30%", "handled 500+ daily queries").');
    }
  } else {
    impactScore = 10;
  }

  // 3. Brevity & Skills Evaluation
  const skillCount = resume.skills ? resume.skills.length : 0;
  if (skillCount >= 6) {
    brevityScore += 12;
    strengths.push(`Diverse skill portfolio with ${skillCount} categorized skills.`);
  } else if (skillCount >= 3) {
    brevityScore += 8;
    recommendations.push('Add more core technical skills relevant to your target domain (aim for 6-10 skills).');
  } else {
    issues.push({ category: 'Skills', text: 'Only a few skills listed. Add distinct technical languages, libraries, and tools.' });
  }

  if (resume.contact?.linkedin_url || resume.contact?.github_url) {
    brevityScore += 8;
    strengths.push('Includes professional public profiles (LinkedIn or GitHub repository links).');
  } else {
    recommendations.push('Add links to your GitHub profile and LinkedIn page to validate project code.');
  }

  // 4. Structure & Consistency Evaluation
  if (resume.education && resume.education.some(e => e.grade)) structureScore += 5;
  if (resume.certifications && resume.certifications.length > 0) {
    structureScore += 5;
    strengths.push('Professional certifications bolster technical credibility.');
  }
  if (resume.achievements && resume.achievements.length > 0) structureScore += 5;
  if (resume.languages && resume.languages.length > 0) structureScore += 5;

  const overallScore = Math.min(100, completenessScore + impactScore + brevityScore + structureScore);

  return {
    overallScore,
    rubric: {
      completeness: completenessScore,
      impactAndVerbs: impactScore,
      skillsAndProfiles: brevityScore,
      structureAndHonors: structureScore
    },
    strengths,
    issues,
    recommendations,
    actionVerbsSample: ACTION_VERBS.slice(0, 15)
  };
}

// Compare resume with target job description
function compareJobDescription(resume, jobDescriptionText) {
  if (!jobDescriptionText || jobDescriptionText.trim().length < 15) {
    return {
      matchPercentage: 0,
      matchedKeywords: [],
      missingKeywords: [],
      analysisNote: 'Please paste a complete job description (at least 20 words) to calculate match metrics.'
    };
  }

  const jdTextLower = jobDescriptionText.toLowerCase();

  // Combine resume text
  const resumeTokens = new Set();
  const addTokens = (str) => {
    if (!str) return;
    str.toLowerCase().split(/[\s,.;:()/\-]+/).forEach(w => {
      if (w.length > 2) resumeTokens.add(w);
    });
  };

  addTokens(resume.professional_title);
  addTokens(resume.professional_summary);
  if (resume.skills) resume.skills.forEach(s => addTokens(s.skill_name));
  if (resume.projects) resume.projects.forEach(p => { addTokens(p.project_title); addTokens(p.technologies); addTokens(p.description); });
  if (resume.experience) resume.experience.forEach(e => { addTokens(e.job_title); addTokens(e.responsibilities); });
  if (resume.education) resume.education.forEach(ed => { addTokens(ed.degree); addTokens(ed.field_of_study); });

  // Extract relevant keywords found in JD
  const foundInJd = [];
  COMMON_TECH_KEYWORDS.forEach(kw => {
    if (jdTextLower.includes(kw)) {
      foundInJd.push(kw);
    }
  });

  // Also check individual capitalized words from JD
  const customWords = jobDescriptionText.match(/\b[A-Z][a-zA-Z0-9+#.]{2,}\b/g) || [];
  customWords.forEach(w => {
    const low = w.toLowerCase();
    if (!foundInJd.includes(low) && !['The', 'And', 'For', 'With', 'You', 'Will', 'Must', 'Our', 'Are', 'This', 'Job', 'Team'].includes(w)) {
      if (low.length > 3) foundInJd.push(low);
    }
  });

  const uniqueJdKeywords = Array.from(new Set(foundInJd));
  const matchedKeywords = [];
  const missingKeywords = [];

  uniqueJdKeywords.forEach(kw => {
    // Check if matched in resume
    const parts = kw.split(/\s+/);
    const isMatched = parts.every(p => resumeTokens.has(p));
    if (isMatched) {
      matchedKeywords.push(kw);
    } else {
      missingKeywords.push(kw);
    }
  });

  const total = uniqueJdKeywords.length;
  const matchPercentage = total > 0 ? Math.round((matchedKeywords.length / total) * 100) : 75;

  return {
    matchPercentage,
    totalTargetKeywords: total,
    matchedKeywords,
    missingKeywords: missingKeywords.slice(0, 15),
    analysisNote: matchPercentage >= 75
      ? 'Outstanding keyword alignment! Your profile strongly reflects the job description requirements.'
      : matchPercentage >= 50
      ? 'Moderate keyword alignment. Consider incorporating several of the missing target skills into your skills or project descriptions if you have practical experience with them.'
      : 'Low keyword alignment. Tailor your resume summary, skills, and project technologies specifically to emphasize the tools requested by this employer.'
  };
}

// Optional Gemini AI Assistance
async function getAiSuggestions(resume, promptType, customInput = '') {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    return {
      isAiGenerated: false,
      mode: 'Rule-Based Engine (Offline Ready)',
      message: 'No external AI API key configured. Utilizing local deterministic intelligence engine.',
      suggestions: generateFallbackSuggestions(resume, promptType, customInput)
    };
  }

  try {
    const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    let prompt = '';
    if (promptType === 'summary') {
      prompt = `Act as an expert career advisor. You are reviewing the following resume information for ${resume.user_full_name || 'the candidate'}:
Current Professional Title: ${resume.professional_title || 'Software Engineer'}
Current Summary: ${resume.professional_summary || 'None provided'}
Skills: ${(resume.skills || []).map(s => s.skill_name).join(', ')}
Education: ${(resume.education || []).map(e => `${e.degree} at ${e.institution}`).join('; ')}

Generate 3 alternative professional summaries (2-3 sentences each) tailored for modern ATS systems. Emphasize technical strengths, impact, and clarity. DO NOT invent fake companies or fictitious certifications.
Return only valid JSON in this format:
{"suggestions": ["summary option 1", "summary option 2", "summary option 3"]}`;
    } else if (promptType === 'bullet_polish') {
      prompt = `Act as an expert technical resume editor. Improve this bullet point/responsibility description from a candidate's resume:
Original bullet: "${customInput}"
Target role: ${resume.professional_title || 'Software Engineer'}

Rules:
1. Start with a powerful action verb (e.g. Engineered, Spearheaded, Optimized, Streamlined).
2. Emphasize action, methodology, and measurable impact.
3. DO NOT invent false company names or fake statistics not implied by the context.
Provide 3 polished variations. Return only valid JSON:
{"suggestions": ["variation 1", "variation 2", "variation 3"]}`;
    } else if (promptType === 'job_tailor') {
      prompt = `Compare this resume against the following job description:
Candidate Skills: ${(resume.skills || []).map(s => s.skill_name).join(', ')}
Candidate Summary: ${resume.professional_summary || ''}
Job Description: "${customInput}"

Provide actionable tailoring advice and recommendations. Return only valid JSON:
{"suggestions": ["Advice 1", "Advice 2", "Advice 3"], "keyAdvice": "Summary advice"}`;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 800 }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleanedJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanedJson);

    return {
      isAiGenerated: true,
      mode: 'AI-Powered (Google Gemini)',
      suggestions: parsed.suggestions || [rawText]
    };
  } catch (error) {
    console.warn('[Assistant] Gemini API call failed or timed out. Falling back to rule engine:', error.message);
    return {
      isAiGenerated: false,
      mode: 'Rule-Based Engine (Fallback)',
      message: `AI service temporarily unavailable (${error.message}). Utilizing local rule-based engine.`,
      suggestions: generateFallbackSuggestions(resume, promptType, customInput)
    };
  }
}

// Fallback suggestions generator when AI key is absent
function generateFallbackSuggestions(resume, promptType, customInput = '') {
  const title = resume.professional_title || 'Full-Stack Developer';
  const name = resume.user_full_name || 'Candidate';
  const skillsList = (resume.skills || []).slice(0, 4).map(s => s.skill_name).join(', ') || 'modern software technologies';

  if (promptType === 'summary') {
    return [
      `Results-driven ${title} with a solid background in software design, problem solving, and building responsive web applications. Proven ability to architect clean database schemas and scalable REST APIs using ${skillsList}. Enthusiastic about contributing technical excellence to dynamic engineering teams.`,
      `Dedicated ${title} specializing in full-stack architecture, performant frontends, and relational database systems. Proficient in ${skillsList}, with a strong commitment to clean code principles, test-driven agility, and continuous learning in high-impact product environments.`,
      `Motivated and detail-oriented ${title} skilled in end-to-end web technologies including ${skillsList}. Experienced in translating user requirements into efficient, scalable software solutions with a focus on usability, reliability, and measurable performance.`
    ];
  } else if (promptType === 'bullet_polish') {
    const clean = customInput.replace(/^(worked on|helped with|responsible for)\s+/i, '').trim();
    return [
      `Engineered and optimized ${clean || 'core platform features'}, improving system efficiency, code reliability, and user satisfaction.`,
      `Spearheaded the development and integration of ${clean || 'key software components'}, following industry best practices and clean architectural standards.`,
      `Streamlined ${clean || 'application workflows'} utilizing modern engineering methodologies, resulting in reduced latency and enhanced operational maintainability.`
    ];
  } else {
    return [
      `Explicitly highlight your experience with requested tools found in the job description in your Skills section.`,
      `Align your project descriptions to mirror the core competencies and architecture described in the posting.`,
      `Quantify the impact of your contributions with percentages or benchmarks wherever possible.`
    ];
  }
}

module.exports = {
  analyzeResumeQuality,
  compareJobDescription,
  getAiSuggestions,
  ACTION_VERBS,
  WEAK_WORDS
};
