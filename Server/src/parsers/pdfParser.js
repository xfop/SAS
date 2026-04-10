import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

const CODE_PREFIXES = ['CS', 'COE', 'MATH', 'PHYS', 'STAT', 'ENG', 'ARAB', 'ISL', 'ISLS', 'GS', 'CHEM', 'PE', 'GE'];
const PASSING_GRADES = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D+', 'D'];
const DAY_PATTERNS = {
  sunday: /الاحد|الأحد|Sunday/i,
  monday: /الاثنين|الإثنين|Monday/i,
  tuesday: /الثلاثاء|Tuesday/i,
  wednesday: /الاربعاء|الأربعاء|Wednesday/i,
  thursday: /الخميس|Thursday/i
};

export async function extractPdfText(buffer) {
  
}

function parseTimeSlot(text) {
  
}

export function parseTimetablePdf(text) {
  
}

export function parseRecordPdf(text) {

}

export function parsePlanPdf(text) {
 
}
