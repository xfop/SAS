import { Router } from 'express';
import multer from 'multer';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { parseTimetableHTML } from '../parsers/timetableParser.js';
import { parseRecordHTML } from '../parsers/recordParser.js';
import { extractPdfText, parseTimetablePdf, parseRecordPdf } from '../parsers/pdfParser.js';
import { getEligibleCourses, getElectiveCourses, generateSchedules, getAllPlanCoursesWithStatus, getElectivePlaceholders } from '../scheduler/generator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// load plan
let academicPlanCS2014 = {};
try {
  const planPath = join(__dirname, '..', 'data', 'academicPlanCS2014.json');
  academicPlanCS2014 = JSON.parse(readFileSync(planPath, 'utf-8'));
  console.log('loaded plan:', Object.keys(academicPlanCS2014).length, 'courses');
} catch (err) {
  console.error('could not load plan:', err.message);
}

function isPdf(file) {
  return file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf');
}

// POST /api/generate-schedules
router.post(
  '/generate-schedules',
  upload.fields([
    { name: 'timetable', maxCount: 1 },
    { name: 'record', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      if (!req.files?.timetable?.[0] || !req.files?.record?.[0]) {
        return res.status(400).json({ error: 'يجب رفع ملفي الجدول والسجل الأكاديمي' });
      }

      const timetableFile = req.files.timetable[0];
      const recordFile = req.files.record[0];

      let sections;
      let passedCourses;

      // parse timetable
      if (isPdf(timetableFile)) {
        const pdfText = await extractPdfText(timetableFile.buffer);
        sections = parseTimetablePdf(pdfText);
      } else {
        const timetableHTML = timetableFile.buffer.toString('utf-8');
        sections = parseTimetableHTML(timetableHTML);
      }

      // parse record
      let allRecordCourses = [];
      let failedCourses = [];
      if (isPdf(recordFile)) {
        const pdfText = await extractPdfText(recordFile.buffer);
        const result = parseRecordPdf(pdfText);
        passedCourses = result.passedCourses;
        failedCourses = result.failedCourses || [];
        allRecordCourses = result.allCourses || [];
      } else {
        const recordHTML = recordFile.buffer.toString('utf-8');
        const result = parseRecordHTML(recordHTML);
        passedCourses = result.passedCourses;
        failedCourses = result.failedCourses || [];
        allRecordCourses = result.allCourses || [];
      }

      if (sections.length === 0) {
        return res.status(400).json({ error: 'لم يتم العثور على شعب في ملف الجدول' });
      }

      // add missing passed
      const recordPassedCodes = allRecordCourses.filter(c => c.passed).map(c => c.courseCode);
      const missingPassed = recordPassedCodes.filter(code => !passedCourses.includes(code));
      if (missingPassed.length > 0) {
        passedCourses = [...passedCourses, ...missingPassed];
      }

      // get eligible courses
      const requiredWithSections = getEligibleCourses(academicPlanCS2014, passedCourses, sections);

      // all required (including no sections)
      const allRequiredCourses = [];
      for (const [code, data] of Object.entries(academicPlanCS2014)) {
        if (passedCourses.includes(code)) continue;
        const prereqsMet = data.prerequisites.every(p => passedCourses.includes(p));
        if (!prereqsMet) continue;
        allRequiredCourses.push(code);
      }

      // generate schedules
      let schedules = generateSchedules(academicPlanCS2014, requiredWithSections, sections, []);

      // courses without sections
      const coursesWithoutSections = allRequiredCourses.filter(code =>
        !sections.some(s => s.courseCode === code)
      ).map(code => ({
        code,
        name: academicPlanCS2014[code]?.name || code,
        credits: academicPlanCS2014[code]?.credits || 3,
        hasSection: false
      }));

      schedules = schedules.map(schedule => ({
        ...schedule,
        additionalCourses: coursesWithoutSections,
        totalCreditsWithAll: schedule.totalCredits + coursesWithoutSections.reduce((sum, c) => sum + c.credits, 0)
      }));

      // remove passed courses from schedules (safety check)
      const passedSet = new Set(passedCourses);
      schedules = schedules.map(schedule => {
        const filteredSections = schedule.sections.filter(s => !passedSet.has(s.courseCode));
        return {
          ...schedule,
          sections: filteredSections,
          courseCount: filteredSections.length
        };
      }).filter(s => s.sections.length > 0);

      // get plan courses with status
      const planCoursesWithStatus = getAllPlanCoursesWithStatus(academicPlanCS2014, passedCourses, failedCourses, sections);

      // group timetable by course
      const timetableCourses = {};
      for (const s of sections) {
        if (!timetableCourses[s.courseCode]) {
          timetableCourses[s.courseCode] = { code: s.courseCode, name: s.courseName, sections: [] };
        }
        timetableCourses[s.courseCode].sections.push({ section: s.section, instructor: s.instructor });
      }

      res.json({
        verification: {
          record: {
            total: allRecordCourses.length,
            passed: allRecordCourses.filter(c => c.passed).length,
            failed: allRecordCourses.filter(c => c.failed).length,
            inProgress: allRecordCourses.filter(c => !c.grade).length,
            courses: allRecordCourses.map(c => ({
              code: c.courseCode,
              name: c.name,
              grade: c.grade || 'قيد الدراسة',
              passed: c.passed,
              failed: c.failed
            }))
          },
          timetable: {
            totalSections: sections.length,
            totalCourses: Object.keys(timetableCourses).length,
            courses: Object.values(timetableCourses).map(c => ({
              code: c.code,
              name: c.name,
              sectionsCount: c.sections.length
            }))
          }
        },
        planCourses: planCoursesWithStatus,
        summary: {
          totalSectionsInTimetable: sections.length,
          totalPlanCourses: Object.keys(academicPlanCS2014).length,
          passedCount: planCoursesWithStatus.filter(c => c.status === 'passed').length,
          failedCount: planCoursesWithStatus.filter(c => c.status === 'failed').length,
          notTakenCount: planCoursesWithStatus.filter(c => c.status === 'not_taken').length,
          requiredCoursesCount: allRequiredCourses.length,
          coursesWithSections: requiredWithSections.length,
          coursesWithoutSections: coursesWithoutSections.length,
          requiredCourses: allRequiredCourses.map(code => ({
            code,
            name: academicPlanCS2014[code]?.name || code,
            credits: academicPlanCS2014[code]?.credits || 3,
            sectionsAvailable: sections.filter(s => s.courseCode === code).length,
            hasSection: sections.some(s => s.courseCode === code)
          })),
          schedulesGenerated: schedules.length
        },
        schedules
      });
    } catch (err) {
      console.error('error:', err);
      res.status(500).json({ error: 'حدث خطأ: ' + err.message });
    }
  }
);

// POST /api/parse - parse only
router.post(
  '/parse',
  upload.fields([
    { name: 'timetable', maxCount: 1 },
    { name: 'record', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      if (!req.files?.timetable?.[0] || !req.files?.record?.[0]) {
        return res.status(400).json({ error: 'يجب رفع ملفي الجدول والسجل الأكاديمي' });
      }

      const timetableFile = req.files.timetable[0];
      const recordFile = req.files.record[0];

      let sections;
      if (isPdf(timetableFile)) {
        const pdfText = await extractPdfText(timetableFile.buffer);
        sections = parseTimetablePdf(pdfText);
      } else {
        sections = parseTimetableHTML(timetableFile.buffer.toString('utf-8'));
      }

      let allRecordCourses = [];
      if (isPdf(recordFile)) {
        const pdfText = await extractPdfText(recordFile.buffer);
        const result = parseRecordPdf(pdfText);
        allRecordCourses = (result && result.allCourses) || [];
      } else {
        const result = parseRecordHTML(recordFile.buffer.toString('utf-8'));
        allRecordCourses = (result && result.allCourses) || [];
      }

      // group timetable by course
      const timetableCourses = {};
      for (const s of sections) {
        if (!timetableCourses[s.courseCode]) {
          timetableCourses[s.courseCode] = { code: s.courseCode, name: s.courseName, sections: [] };
        }
        timetableCourses[s.courseCode].sections.push({ section: s.section, instructor: s.instructor });
      }

      res.json({
        record: {
          total: allRecordCourses.length,
          passed: allRecordCourses.filter(c => c.passed).length,
          failed: allRecordCourses.filter(c => c.failed).length,
          courses: allRecordCourses.map(c => {
            const planCourse = academicPlanCS2014[c.courseCode];
            const cleanName = planCourse ? planCourse.name : c.name;
            // if parser name doesn't match plan name, grade is likely wrong too
            let cleanGrade = c.grade;
            if (planCourse && c.name && c.name !== planCourse.name && !c.name.includes(planCourse.name.substring(0, 5))) {
              cleanGrade = '';
            }
            if (!c.name) cleanGrade = '';
            return {
              code: c.courseCode,
              name: cleanName,
              grade: cleanGrade || '',
              passed: cleanGrade ? c.passed : false,
              failed: cleanGrade === 'F',
              mosajal: cleanGrade === 'مسجل'
            };
          })
        },
        timetable: {
          totalSections: sections.length,
          totalCourses: Object.keys(timetableCourses).length,
          courses: Object.values(timetableCourses).map(c => ({
            code: c.code,
            name: c.name,
            sectionsCount: c.sections.length
          }))
        }
      });
    } catch (err) {
      console.error('error:', err);
      res.status(500).json({ error: 'حدث خطأ: ' + err.message });
    }
  }
);

// GET /api/plan
router.get('/plan', (req, res) => {
  res.json(academicPlanCS2014);
});

export default router;
