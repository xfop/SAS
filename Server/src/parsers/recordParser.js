import { load } from 'cheerio';

const CODE_PREFIXES = [
  'CS', 'COE', 'MATH', 'PHYS', 'STAT', 'ENG', 'ARAB', 'ISL', 'ISLS', 'GS', 'CHEM', 'PE', 'GE', 'FE', 'GSE',
  'IT', 'SE', 'CE', 'EE', 'BIOL', 'BIO', 'ENGL', 'SCI'
];
const PASSING_GRADES = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D+', 'D','TRS'];
const FAIL_GRADES = ['F', 'DN', 'W', 'IC', 'IP', 'NP', 'WP', 'WF', 'NF'];
const ALL_GRADES = [...PASSING_GRADES, ...FAIL_GRADES];
//
function extractGrade(text) {
  if (!text) return '';
  const cleaned = text.replace(/\s+/g, '').toUpperCase();
  // exact match
  for (const g of ALL_GRADES) {
    if (cleaned === g) return g;
  }
  // near match (a few extra chars)
  for (const g of ALL_GRADES) {
    if (cleaned.includes(g) && cleaned.length <= g.length + 2) {
      return g;
    }
  }
  // grade mixed with arabic text (e.g. "A+الفوزان") - sort longer grades first to avoid A matching before A+
  const sortedGrades = [...ALL_GRADES].sort((a, b) => b.length - a.length);
  for (const g of sortedGrades) {
    const escaped = g.replace('+', '\\+');
    // match grade only when not surrounded by other latin letters
    const re = new RegExp('(?:^|[^A-Z])' + escaped + '(?:[^A-Z]|$)');
    if (re.test(cleaned)) return g;
  }
  return '';
}

// تحليل السجل الأكاديمي
export function parseRecordHTML(html, debug = false) {
  const $ = load(html);
  const passedCourses = new Set();
  const allCourses = [];
  var skippedRows = [];
  // يبحث في كل صف اقل من 6 خلايا تجاهل
  $('tr').each((rowIdx, row) => {
    const cells = $(row).find('td');
    if (cells.length < 6) return;

    const cellTexts = [];
    const cellHtmls = [];
    cells.each((_, cell) => {
      cellTexts.push($(cell).text().trim());
      const innerText = $(cell).find('div, span').text().trim();
      cellHtmls.push(innerText || $(cell).text().trim());
    });

    let prefixIdx = -1;
    let numberIdx = -1;
    for (let i = 0; i < cellTexts.length; i++) {
      const cleaned = cellTexts[i].replace(/\s+/g, '').toUpperCase();
      if (CODE_PREFIXES.includes(cleaned)) {
        prefixIdx = i; // رمز المادة مثل CS
        if (i + 1 < cellTexts.length && /^\d{1,4}$/.test(cellTexts[i + 1].trim())) {
          numberIdx = i + 1; // رقم المادة مثل 101
        } else if (i > 0 && /^\d{1,4}$/.test(cellTexts[i - 1].trim())) {
          numberIdx = i - 1;
        }
        break;
      }
    }

    if (prefixIdx == -1 || numberIdx == -1) {
      const rowText = cellTexts.join(' | ');
      if (/[A-Z]{2,}/.test(rowText) && /\d{3}/.test(rowText)) {
        skippedRows.push(`Row ${rowIdx}: ${rowText.substring(0, 100)}`);
      }
      return;
    }

    const courseCode = cellTexts[prefixIdx].trim().toUpperCase() + cellTexts[numberIdx].trim();

    // find grade or "مسجل"
    let grade = '';
    let isMosajal = false;
    for (let i = 0; i < cellTexts.length; i++) {
      if (i === prefixIdx || i === numberIdx) continue;
      if (cellTexts[i].includes('مسجل')) {
        isMosajal = true;
        continue;
      }
      if (!grade) {
        grade = extractGrade(cellTexts[i]);
        if (!grade) grade = extractGrade(cellHtmls[i]);
      }
    }
    if (!grade && isMosajal) {
      grade = 'مسجل';
    }

    // find credits
    let credits = 0;
    for (let i = 0; i < cellTexts.length; i++) {
      if (i === prefixIdx || i === numberIdx) continue;
      const val = parseInt(cellTexts[i]);
      if (val >= 1 && val <= 6 && cellTexts[i].trim().length <= 3) {
        credits = val;
        break;
      }
    }

    // arabic name (skip junk words)
    const SKIP_WORDS = ['مسجل', 'إنتظ', 'انتظ', 'متوقع', 'الفئة', 'الكلية', 'القسم', 'التخصص', 'المعدل', 'المستوى', 'الداراسى'];
    let name = '';
    for (let i = 0; i < cellTexts.length; i++) {
      if (i === prefixIdx || i === numberIdx) continue;
      if (SKIP_WORDS.some(w => cellTexts[i].includes(w))) continue;
      if (/[\u0600-\u06FF]/.test(cellTexts[i]) && cellTexts[i].length > 3) {
        name = cellTexts[i];
        break;
      }
    }

    // if name is junk, clear name only — keep grade so fail grades are preserved
    if (!name || SKIP_WORDS.some(w => name.includes(w))) {
      name = '';
    }

    const passed = PASSING_GRADES.includes(grade);
    const failed = FAIL_GRADES.includes(grade);

    allCourses.push({ courseCode, name, credits, grade, passed, failed });
    if (passed) {
      passedCourses.add(courseCode);
    }
  });

  //  prefer graded version only if name is real
  const seenCodes = new Map();
  for (const course of allCourses) {
    if (!seenCodes.has(course.courseCode)) {
      seenCodes.set(course.courseCode, course);
    } else {
      const existing = seenCodes.get(course.courseCode);
      // prefer the one with a real name
      if (!existing.name && course.name) {
        seenCodes.set(course.courseCode, course);
      } else if (existing.name && !course.name) {
        // keep existing, it has a real name
      } else if (course.passed && !existing.passed) {
        seenCodes.set(course.courseCode, course);
      }
    }
  }
  const uniqueCourses = [...seenCodes.values()];

  const failedCourses = uniqueCourses.filter(c => c.failed).map(c => c.courseCode);

  // detect electives
  let freeElectiveCount = 0;
  let uniElectiveCount = 0;
  let majorElectiveCount = 0;

  for (const course of uniqueCourses) {
    if (!course.passed) continue;
    const name = course.name || '';
    const code = (course.courseCode || '').toUpperCase();
    if (name.length > 100) continue;
    if (!course.grade) continue;

    const normalizedName = name.replace(/ى/g, 'ي').replace(/أ|إ|آ/g, 'ا');

    if (code.startsWith('FE') && /^FE\d$/.test(code)) {
      freeElectiveCount++;
    }
    else if (code.startsWith('GSE') && /^GSE\d$/.test(code)) {
      uniElectiveCount++;
    }
    else if (normalizedName.includes('اختياري حر') || normalizedName.includes('مقرر حر')) {
      freeElectiveCount++;
    }
    else if (normalizedName.includes('جامع') && normalizedName.includes('اختياري')) {
      uniElectiveCount++;
    }
    else if (normalizedName.includes('تخصص') && normalizedName.includes('اختياري')) {
      majorElectiveCount++;
    }
  }

  // add placeholders
  if (freeElectiveCount >= 1) passedCourses.add('FE1');
  if (freeElectiveCount >= 2) passedCourses.add('FE2');
  if (uniElectiveCount >= 1) passedCourses.add('GSE1');
  if (uniElectiveCount >= 2) passedCourses.add('GSE2');
  if (majorElectiveCount >= 1) passedCourses.add('CS1');
  if (majorElectiveCount >= 2) passedCourses.add('CS2');
  if (majorElectiveCount >= 3) passedCourses.add('CS3');

  return { passedCourses: [...passedCourses], failedCourses, allCourses: uniqueCourses, skippedRows };
}
