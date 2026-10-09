// routes/resumes.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const resumeService = require('../services/resumeService');
const pdfService = require('../services/pdfService');
const { requireAuth } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');

router.use(requireAuth);

// GET /api/resumes - List all user resumes
router.get('/', async (req, res) => {
  try {
    const resumes = await resumeService.getResumesByUser(req.user.id);
    res.json({
      success: true,
      resumes
    });
  } catch (error) {
    console.error('[Resumes] List error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve resumes.' });
  }
});

// POST /api/resumes - Create new resume
router.post(
  '/',
  [
    body('resume_title').optional().trim().isLength({ max: 255 }),
    body('template_name').optional().isIn(['modern', 'professional', 'minimal', 'ats'])
  ],
  validateRequest,
  async (req, res) => {
    try {
      const resumeId = await resumeService.createResume(req.user.id, req.body);
      const newResume = await resumeService.getResumeById(resumeId, req.user.id);

      res.status(201).json({
        success: true,
        message: 'New resume created successfully.',
        resumeId,
        resume: newResume
      });
    } catch (error) {
      console.error('[Resumes] Create error:', error);
      res.status(500).json({ success: false, message: 'Failed to create resume.' });
    }
  }
);

// GET /api/resumes/:id - Get full resume with all relational sections
router.get('/:id', async (req, res) => {
  try {
    const resumeId = parseInt(req.params.id, 10);
    const resume = await resumeService.getResumeById(resumeId, req.user.id);

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: 'Resume not found or you do not have permission to view it.'
      });
    }

    res.json({
      success: true,
      resume
    });
  } catch (error) {
    console.error('[Resumes] Get error:', error);
    res.status(500).json({ success: false, message: 'Error fetching resume details.' });
  }
});

// GET /api/resumes/:id/preview-data - Get formatted preview data
router.get('/:id/preview-data', async (req, res) => {
  try {
    const resumeId = parseInt(req.params.id, 10);
    const resume = await resumeService.getResumeById(resumeId, req.user.id);

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: 'Resume not found or unauthorized.'
      });
    }

    res.json({
      success: true,
      resume
    });
  } catch (error) {
    console.error('[Resumes] Preview error:', error);
    res.status(500).json({ success: false, message: 'Error retrieving preview data.' });
  }
});

// PUT /api/resumes/:id - Update main resume metadata
router.put('/:id', async (req, res) => {
  try {
    const resumeId = parseInt(req.params.id, 10);
    const updated = await resumeService.updateResume(resumeId, req.user.id, req.body);

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Resume not found or unauthorized.'
      });
    }

    res.json({
      success: true,
      message: 'Resume updated successfully.',
      resume: updated
    });
  } catch (error) {
    console.error('[Resumes] Update error:', error);
    res.status(500).json({ success: false, message: 'Failed to update resume.' });
  }
});

// POST /api/resumes/:id/duplicate - Duplicate resume
router.post('/:id/duplicate', async (req, res) => {
  try {
    const resumeId = parseInt(req.params.id, 10);
    const newId = await resumeService.duplicateResume(resumeId, req.user.id);

    if (!newId) {
      return res.status(404).json({
        success: false,
        message: 'Resume not found or duplicate failed.'
      });
    }

    const duplicated = await resumeService.getResumeById(newId, req.user.id);

    res.status(201).json({
      success: true,
      message: 'Resume duplicated successfully!',
      newId,
      resume: duplicated
    });
  } catch (error) {
    console.error('[Resumes] Duplicate error:', error);
    res.status(500).json({ success: false, message: 'Failed to duplicate resume.' });
  }
});

// DELETE /api/resumes/:id - Delete resume
router.delete('/:id', async (req, res) => {
  try {
    const resumeId = parseInt(req.params.id, 10);
    const success = await resumeService.deleteResume(resumeId, req.user.id);

    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Resume not found or already removed.'
      });
    }

    res.json({
      success: true,
      message: 'Resume deleted successfully.'
    });
  } catch (error) {
    console.error('[Resumes] Delete error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete resume.' });
  }
});

// GET /api/resumes/:id/pdf - Stream PDF generation
router.get('/:id/pdf', async (req, res) => {
  try {
    const resumeId = parseInt(req.params.id, 10);
    const resume = await resumeService.getResumeById(resumeId, req.user.id);

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: 'Resume not found or unauthorized.'
      });
    }

    const candidateName = (resume.user_full_name || 'Resume').replace(/[^a-zA-Z0-9]/g, '_');
    const jobTitle = (resume.professional_title || 'CV').replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `Resume_${candidateName}_${jobTitle}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    pdfService.generateResumePdf(resume, res);
  } catch (error) {
    console.error('[Resumes] PDF generation error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate PDF document.' });
  }
});

module.exports = router;
