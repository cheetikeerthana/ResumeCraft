// services/pdfService.js
const PDFDocument = require('pdfkit');

function generateResumePdf(resume, stream) {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 36, bottom: 36, left: 40, right: 40 },
    bufferPages: true,
    info: {
      Title: `Resume - ${resume.user_full_name || 'Candidate'}`,
      Author: resume.user_full_name || 'ResumeCraft User',
      Subject: resume.professional_title || 'Resume',
      Keywords: 'Resume, Curriculum Vitae, Professional, ResumeCraft'
    }
  });

  doc.pipe(stream);

  const template = resume.template_name || 'modern';

  // Palette definitions based on template
  let primaryColor = '#1e3a8a';   // Navy
  let secondaryColor = '#2563eb'; // Blue
  let textColor = '#1f2937';      // Slate gray
  let dividerColor = '#cbd5e1';   // Border gray

  if (template === 'professional') {
    primaryColor = '#0f172a';
    secondaryColor = '#334155';
    textColor = '#111827';
    dividerColor = '#94a3b8';
  } else if (template === 'minimal') {
    primaryColor = '#18181b';
    secondaryColor = '#52525b';
    textColor = '#27272a';
    dividerColor = '#e4e4e7';
  } else if (template === 'ats') {
    primaryColor = '#000000';
    secondaryColor = '#111111';
    textColor = '#000000';
    dividerColor = '#000000';
  }

  // --- HEADER SECTION ---
  const fullName = (resume.user_full_name || 'Full Name').toUpperCase();
  const profTitle = resume.professional_title || '';

  doc.fillColor(primaryColor)
     .font('Helvetica-Bold')
     .fontSize(22)
     .text(fullName, { align: template === 'ats' ? 'left' : 'center' });

  if (profTitle) {
    doc.fillColor(secondaryColor)
       .font('Helvetica')
       .fontSize(12)
       .text(profTitle, { align: template === 'ats' ? 'left' : 'center' });
  }

  doc.moveDown(0.3);

  // Contact line
  const contactParts = [];
  if (resume.user_email) contactParts.push(resume.user_email);
  if (resume.contact?.phone) contactParts.push(resume.contact.phone);
  if (resume.contact?.city || resume.contact?.country) {
    contactParts.push([resume.contact.city, resume.contact.country].filter(Boolean).join(', '));
  }
  if (resume.contact?.linkedin_url) contactParts.push(resume.contact.linkedin_url.replace(/^https?:\/\/(www\.)?/, ''));
  if (resume.contact?.github_url) contactParts.push(resume.contact.github_url.replace(/^https?:\/\/(www\.)?/, ''));
  if (resume.contact?.portfolio_url) contactParts.push(resume.contact.portfolio_url.replace(/^https?:\/\/(www\.)?/, ''));

  if (contactParts.length > 0) {
    doc.fillColor('#4b5563')
       .font('Helvetica')
       .fontSize(9)
       .text(contactParts.join('  |  '), { align: template === 'ats' ? 'left' : 'center' });
  }

  doc.moveDown(0.5);

  // Section Header Helper
  function renderSectionHeader(title) {
    doc.moveDown(0.6);
    doc.fillColor(primaryColor)
       .font('Helvetica-Bold')
       .fontSize(12)
       .text(title.toUpperCase());

    // Draw bottom divider line
    const y = doc.y + 2;
    doc.strokeColor(dividerColor)
       .lineWidth(template === 'ats' ? 0.75 : 1)
       .moveTo(40, y)
       .lineTo(555, y)
       .stroke();

    doc.y = y + 5;
  }

  // --- PROFESSIONAL SUMMARY ---
  if (resume.professional_summary && resume.professional_summary.trim().length > 0) {
    renderSectionHeader('Professional Summary');
    doc.fillColor(textColor)
       .font('Helvetica')
       .fontSize(9.5)
       .text(resume.professional_summary.trim(), { align: 'justify', lineGap: 2 });
  }

  // --- EDUCATION ---
  if (resume.education && resume.education.length > 0) {
    renderSectionHeader('Education');
    resume.education.forEach(edu => {
      doc.moveDown(0.3);
      doc.fillColor('#000000')
         .font('Helvetica-Bold')
         .fontSize(10)
         .text(edu.institution, { continued: true })
         .font('Helvetica')
         .fillColor('#4b5563')
         .fontSize(9)
         .text(`   ${[edu.start_date, edu.is_current ? 'Present' : edu.end_date].filter(Boolean).join(' - ')}`, { align: 'right' });

      doc.fillColor(secondaryColor)
         .font('Helvetica-Oblique')
         .fontSize(9.5)
         .text([edu.degree, edu.field_of_study].filter(Boolean).join(' in '));

      if (edu.grade) {
        doc.fillColor('#1f2937')
           .font('Helvetica')
           .fontSize(9)
           .text(`Grade / CGPA: ${edu.grade}`);
      }

      if (edu.description) {
        doc.fillColor('#374151')
           .font('Helvetica')
           .fontSize(8.5)
           .text(edu.description, { lineGap: 1 });
      }
    });
  }

  // --- WORK EXPERIENCE & INTERNSHIPS ---
  if (resume.experience && resume.experience.length > 0) {
    renderSectionHeader('Experience & Internships');
    resume.experience.forEach(exp => {
      doc.moveDown(0.4);
      doc.fillColor('#000000')
         .font('Helvetica-Bold')
         .fontSize(10)
         .text(exp.company_name, { continued: true })
         .font('Helvetica')
         .fillColor('#4b5563')
         .fontSize(9)
         .text(`   ${[exp.start_date, exp.is_current ? 'Present' : exp.end_date].filter(Boolean).join(' - ')}`, { align: 'right' });

      doc.fillColor(secondaryColor)
         .font('Helvetica-Oblique')
         .fontSize(9.5)
         .text(`${exp.job_title} ${exp.employment_type ? `(${exp.employment_type})` : ''}`);

      if (exp.responsibilities) {
        const lines = exp.responsibilities.split('\n').map(l => l.trim()).filter(Boolean);
        lines.forEach(line => {
          const bulletText = line.startsWith('•') || line.startsWith('-') ? line.replace(/^[•\-]\s*/, '') : line;
          doc.fillColor(textColor)
             .font('Helvetica')
             .fontSize(9)
             .text(`•  ${bulletText}`, { indent: 10, lineGap: 2 });
        });
      }
    });
  }

  // --- TECHNICAL & PROFESSIONAL SKILLS ---
  if (resume.skills && resume.skills.length > 0) {
    renderSectionHeader('Skills');
    const categories = {};
    resume.skills.forEach(s => {
      const cat = s.skill_category || 'Technical';
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(`${s.skill_name}${s.proficiency ? ` (${s.proficiency})` : ''}`);
    });

    Object.keys(categories).forEach(cat => {
      doc.moveDown(0.2);
      doc.fillColor('#111827')
         .font('Helvetica-Bold')
         .fontSize(9.5)
         .text(`${cat}: `, { continued: true })
         .font('Helvetica')
         .fillColor(textColor)
         .fontSize(9)
         .text(categories[cat].join(', '));
    });
  }

  // --- PROJECTS ---
  if (resume.projects && resume.projects.length > 0) {
    renderSectionHeader('Projects');
    resume.projects.forEach(proj => {
      doc.moveDown(0.3);
      doc.fillColor('#000000')
         .font('Helvetica-Bold')
         .fontSize(10)
         .text(proj.project_title, { continued: true })
         .font('Helvetica')
         .fillColor('#4b5563')
         .fontSize(9)
         .text(`   ${[proj.start_date, proj.end_date].filter(Boolean).join(' - ')}`, { align: 'right' });

      if (proj.technologies) {
        doc.fillColor(secondaryColor)
           .font('Helvetica-Oblique')
           .fontSize(8.5)
           .text(`Technologies: ${proj.technologies}`);
      }

      if (proj.description) {
        doc.fillColor(textColor)
           .font('Helvetica')
           .fontSize(9)
           .text(proj.description, { lineGap: 1.5 });
      }

      if (proj.project_url) {
        doc.fillColor(secondaryColor)
           .font('Helvetica')
           .fontSize(8.5)
           .text(`Link: ${proj.project_url}`);
      }
    });
  }

  // --- CERTIFICATIONS ---
  if (resume.certifications && resume.certifications.length > 0) {
    renderSectionHeader('Certifications');
    resume.certifications.forEach(cert => {
      doc.moveDown(0.2);
      doc.fillColor('#000000')
         .font('Helvetica-Bold')
         .fontSize(9.5)
         .text(cert.certification_name, { continued: true })
         .font('Helvetica')
         .fillColor('#4b5563')
         .fontSize(8.5)
         .text(`   ${cert.issue_date || ''}`, { align: 'right' });

      if (cert.issuing_organization) {
        doc.fillColor(secondaryColor)
           .font('Helvetica')
           .fontSize(9)
           .text(`Issuer: ${cert.issuing_organization}`);
      }
    });
  }

  // --- ACHIEVEMENTS & AWARDS ---
  if (resume.achievements && resume.achievements.length > 0) {
    renderSectionHeader('Achievements & Honors');
    resume.achievements.forEach(ach => {
      doc.moveDown(0.2);
      doc.fillColor('#000000')
         .font('Helvetica-Bold')
         .fontSize(9.5)
         .text(ach.title, { continued: true })
         .font('Helvetica')
         .fillColor('#4b5563')
         .fontSize(8.5)
         .text(`   ${ach.achievement_date || ''}`, { align: 'right' });

      if (ach.description) {
        doc.fillColor(textColor)
           .font('Helvetica')
           .fontSize(9)
           .text(ach.description);
      }
    });
  }

  // --- LANGUAGES ---
  if (resume.languages && resume.languages.length > 0) {
    renderSectionHeader('Languages');
    const langStr = resume.languages.map(l => `${l.language_name}${l.proficiency ? ` (${l.proficiency})` : ''}`).join('  •  ');
    doc.fillColor(textColor)
       .font('Helvetica')
       .fontSize(9.5)
       .text(langStr);
  }

  doc.end();
}

module.exports = {
  generateResumePdf
};
