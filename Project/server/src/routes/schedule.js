import { Router } from 'express';
import multer from 'multer';
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { parseTimetableHTML } from '../parsers/timetableParser.js';
import { parseRecordHTML } from '../parsers/recordParser.js';
import { getEligibleCourses, getElectiveCourses, generateSchedules, getAllPlanCoursesWithStatus, getElectivePlaceholders } from '../scheduler/generator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// read plan files on every request so changes take effect without restart
const DATA_DIR = join(__dirname, '..', 'data');

function loadAllPlans() {
  const plans = {};
  try {
    const files = readdirSync(DATA_DIR);
    files.filter(f => f.endsWith('.json'))
      .forEach(file => {
        try {
          const data = JSON.parse(readFileSync(join(DATA_DIR, file), 'utf-8'));
          const id = file.replace('.json', '');
          plans[id] = data;
        } catch (err) {
          console.error(`could not load ${file}:`, err.message);
        }
      });
  } catch (err) {
    console.error('could not read data dir:', err.message);
  }
  return plans;
}

function getPlan(planId) {
  const plans = loadAllPlans();
  const defaultId = Object.keys(plans)[0] || '';
  return plans[planId] || plans[defaultId] || {};
}

function getAllPlans() {
  return loadAllPlans();
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
      const academicPlanCS2014 = getPlan(req.body.plan || 'CS2014');

      const timetableHTML = timetableFile.buffer.toString('utf-8');
      const recordHTML    = recordFile.buffer.toString('utf-8');

      const sections    = parseTimetableHTML(timetableHTML);
      const recordResult = parseRecordHTML(recordHTML);
      let passedCourses   = recordResult.passedCourses;
      let failedCourses   = recordResult.failedCourses || [];
      let allRecordCourses = recordResult.allCourses || [];

      // detect swapped files: if timetable slot has no sections but record slot does
      if (sections.length === 0) {
        const sectionsFromRecord = parseTimetableHTML(recordHTML);
        if (sectionsFromRecord.length > 0) {
          return res.status(400).json({
            error: 'يبدو أنك رفعت الملفين بالعكس — ضع جدول المواد في الخانة الأولى والسجل الأكاديمي في الخانة الثانية'
          });
        }
        return res.status(400).json({ error: 'لم يتم العثور على شعب في ملف الجدول — تأكد أنك رفعت الملف الصحيح' });
      }

      // detect swapped files: if record slot has sections (timetable) but no grades
      if (allRecordCourses.length === 0) {
        const sectionsFromRecord = parseTimetableHTML(recordHTML);
        if (sectionsFromRecord.length > 0) {
          return res.status(400).json({
            error: 'يبدو أنك رفعت الملفين بالعكس — ضع جدول المواد في الخانة الأولى والسجل الأكاديمي في الخانة الثانية'
          });
        }
        return res.status(400).json({ error: 'لم يتم العثور على مواد في السجل الأكاديمي — تأكد أنك رفعت الملف الصحيح' });
      }

      // add missing passed
      const recordPassedCodes = allRecordCourses.filter(c => c.passed).map(c => c.courseCode);
      const missingPassed = recordPassedCodes.filter(code => !passedCourses.includes(code));
      if (missingPassed.length > 0) {
        passedCourses = [...passedCourses, ...missingPassed];
      }

      // get eligible courses
      let requiredWithSections = getEligibleCourses(academicPlanCS2014, passedCourses, sections);

      // force-add failed courses that have sections — skip prereq check because
      // if a student already took and failed a course, they already met prerequisites
      for (const code of failedCourses) {
        if (requiredWithSections.includes(code)) continue;
        if (!academicPlanCS2014[code]) continue;
        if (sections.some(s => s.courseCode === code))
          requiredWithSections.push(code);
      }

      // all required (including no sections)
      const failedSet = new Set(failedCourses);
      const allRequiredCourses = [];
      for (const [code, data] of Object.entries(academicPlanCS2014)) {
        if (code.startsWith('_')) continue;
        if (passedCourses.includes(code)) continue;
        // failed courses skip prereq check — student already met prereqs when they took it
        const prereqsMet = failedSet.has(code) || data.prerequisites.every(p => passedCourses.includes(p));
        if (!prereqsMet) continue;
        allRequiredCourses.push(code);
      }

      // generate schedules
      let schedules = generateSchedules(academicPlanCS2014, requiredWithSections, sections, []);

      // prefer schedules with >= 12 credits; fall back to all if none qualify
      const TARGET_MIN_CREDITS = 12;
      const fullSchedules = schedules.filter(s => s.totalCredits >= TARGET_MIN_CREDITS);
      if (fullSchedules.length > 0) schedules = fullSchedules;

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
              name: academicPlanCS2014[c.courseCode]?.name || c.name,
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
      const selectedPlan = getPlan(req.body.plan || 'CS2014');

      const timetableHTML2 = timetableFile.buffer.toString('utf-8');
      const recordHTML2    = recordFile.buffer.toString('utf-8');

      const sections = parseTimetableHTML(timetableHTML2);
      const recordResult = parseRecordHTML(recordHTML2);
      const allRecordCourses = (recordResult && recordResult.allCourses) || [];

      if (sections.length === 0) {
        const sectionsFromRecord = parseTimetableHTML(recordHTML2);
        if (sectionsFromRecord.length > 0) {
          return res.status(400).json({
            error: 'يبدو أنك رفعت الملفين بالعكس — ضع جدول المواد في الخانة الأولى والسجل الأكاديمي في الخانة الثانية'
          });
        }
        return res.status(400).json({ error: 'لم يتم العثور على شعب في ملف الجدول — تأكد أنك رفعت الملف الصحيح' });
      }

      if (allRecordCourses.length === 0) {
        const sectionsFromRecord = parseTimetableHTML(recordHTML2);
        if (sectionsFromRecord.length > 0) {
          return res.status(400).json({
            error: 'يبدو أنك رفعت الملفين بالعكس — ضع جدول المواد في الخانة الأولى والسجل الأكاديمي في الخانة الثانية'
          });
        }
        return res.status(400).json({ error: 'لم يتم العثور على مواد في السجل الأكاديمي — تأكد أنك رفعت الملف الصحيح' });
      }

      // group timetable by course
      const timetableCourses = {};
      for (const s of sections) {
        if (!timetableCourses[s.courseCode]) {
          timetableCourses[s.courseCode] = { code: s.courseCode, name: s.courseName, sections: [] };
        }
        timetableCourses[s.courseCode].sections.push({
          section: s.section,
          instructor: s.instructor,
          capacity: s.capacity,
          enrolled: s.enrolled,
          isFull: s.capacity > 0 && s.enrolled >= s.capacity
        });
      }

      res.json({
        record: {
          total: allRecordCourses.length,
          passed: allRecordCourses.filter(c => c.passed).length,
          failed: allRecordCourses.filter(c => c.failed).length,
          courses: allRecordCourses.map(c => {
            const planCourse = selectedPlan[c.courseCode];
            // always use plan name when available
            const cleanName = planCourse ? planCourse.name : c.name;
            // trust the grade from the parser; only clear if no name at all and no plan entry
            const cleanGrade = c.grade || '';
            return {
              code: c.courseCode,
              name: cleanName,
              grade: cleanGrade,
              passed: c.passed,
              failed: c.failed,
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
            sectionsCount: c.sections.length,
            sections: c.sections
          }))
        }
      });
    } catch (err) {
      console.error('error:', err);
      res.status(500).json({ error: 'حدث خطأ: ' + err.message });
    }
  }
);

// GET /api/plan?id=CS2014 or CS46
router.get('/plan', (req, res) => {
  res.json(getPlan(req.query.id || 'CS2014'));
});

// GET /api/plans - list available plans
router.get('/plans', (req, res) => {
  const list = Object.entries(getAllPlans()).map(([id, data]) => ({
    id,
    name: data._meta?.name || id
  }));
  res.json(list);
});

export default router;
