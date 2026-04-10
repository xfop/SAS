import { load } from 'cheerio';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CODE_PREFIXES = ['CS', 'COE', 'MATH', 'PHYS', 'STAT', 'ENG', 'ARAB', 'ISL', 'ISLS', 'GS', 'CHEM', 'PE', 'GE'];

function splitPrerequisites(raw) {
 
}

export function parsePlanHTML(html) {

}

// run as script
if (process.argv[1] && process.argv[1].includes('planParser')) {
 
}
