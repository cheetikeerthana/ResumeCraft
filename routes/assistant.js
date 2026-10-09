// routes/assistant.js
const express = require('express');
const router = express.Router();
const resumeService = require('../services/resumeService');
const assistantService = require('../services/assistantService');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// POST /api/resumes/:id/analyze - Comprehensive resume quality evaluation
router.post('/:id/analyze', async (req, res) => {
  try {
    const resumeId = parseInt(req.params.id, 10);
    const resume = await resumeService.getResumeById(resumeId, req.user.id);

    if (!resume) {
      return res.status(404).json({ success: false, message: 'Resume not found or unauthorized.' });
    }

    const analysis = assistantService.analyzeResumeQuality(resume);

    res.json({
      success: true,
      resumeId,
      analysis
    });
  } catch (error) {
    console.error('[Assistant] Analyze error:', error);
    res.status(500).json({ success: false, message: 'Failed to analyze resume quality.' });
  }
});

// POST /api/resumes/:id/compare-jd - Compare resume with job description
router.post('/:id/compare-jd', async (req, res) => {
  try {
    const resumeId = parseInt(req.params.id, 10);
    const resume = await resumeService.getResumeById(resumeId, req.user.id);

    if (!resume) {
      return res.status(404).json({ success: false, message: 'Resume not found or unauthorized.' });
    }

    const { job_description } = req.body;
    const comparison = assistantService.compareJobDescription(resume, job_description);

    res.json({
      success: true,
      resumeId,
      comparison
    });
  } catch (error) {
    console.error('[Assistant] Compare JD error:', error);
    res.status(500).json({ success: false, message: 'Failed to compare resume with job description.' });
  }
});

// POST /api/resumes/:id/ai-suggest - Smart summary or bullet rewrites
router.post('/:id/ai-suggest', async (req, res) => {
  try {
    const resumeId = parseInt(req.params.id, 10);
    const resume = await resumeService.getResumeById(resumeId, req.user.id);

    if (!resume) {
      return res.status(404).json({ success: false, message: 'Resume not found or unauthorized.' });
    }

    const { prompt_type = 'summary', custom_input = '' } = req.body;
    const result = await assistantService.getAiSuggestions(resume, prompt_type, custom_input);

    res.json({
      success: true,
      resumeId,
      result
    });
  } catch (error) {
    console.error('[Assistant] AI Suggest error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate suggestions.' });
  }
});

// POST /api/resumes/:id/save-version - Save version snapshot before modifications
router.post('/:id/save-version', async (req, res) => {
  try {
    const resumeId = parseInt(req.params.id, 10);
    const { summary = 'Saved version before changes' } = req.body;

    const versionNum = await resumeService.saveVersionSnapshot(resumeId, req.user.id, summary);
    if (!versionNum) {
      return res.status(404).json({ success: false, message: 'Resume not found.' });
    }

    res.json({
      success: true,
      message: `Version ${versionNum} snapshot saved successfully.`,
      versionNumber: versionNum
    });
  } catch (error) {
    console.error('[Assistant] Version snapshot error:', error);
    res.status(500).json({ success: false, message: 'Failed to save resume snapshot.' });
  }
});

module.exports = router;
