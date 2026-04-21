import { load } from 'cheerio';

// رموز المواد المعروفة
const CODE_PREFIXES = [
  'CS', 'COE', 'MATH', 'PHYS', 'STAT', 'ENG', 'ARAB', 'ISL', 'ISLS', 'GS', 'CHEM', 'PE', 'GE', 'FE', 'GSE',
  'IT', 'SE', 'CE', 'EE', 'BIOL', 'BIO', 'ENGL', 'ECON', 'ACC', 'FIN', 'MKT', 'MGT', 'MIS'
];

function parseTimeSlot(text) {
  if (!text || text.trim() === '' || text.trim() === '&nbsp;') return null;
  const match = text.trim().match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return {
    start: parseInt(match[1]) * 60 + parseInt(match[2]),
    end: parseInt(match[3]) * 60 + parseInt(match[4]),
    display: text.trim()
  };
}

export function parseTimetableHTML(html) {
  const $ = load(html);
  const sections = [];

  $('tr').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length < 13) return;

    const cellTexts = [];
    cells.each((_, cell) => {
      cellTexts.push($(cell).text().trim());
    });

    // find course code prefix
    let prefixIdx = -1;
    let numberIdx = -1;
    for (let i = 0; i < cellTexts.length; i++) {
      const cleaned = cellTexts[i].replace(/\s+/g, '').toUpperCase();
      if (CODE_PREFIXES.includes(cleaned)) {
        prefixIdx = i;
        if (i > 0 && /^\d{1,4}$/.test(cellTexts[i - 1].trim())) {
          numberIdx = i - 1;
        } else if (i + 1 < cellTexts.length && /^\d{1,4}$/.test(cellTexts[i + 1].trim())) {
          numberIdx = i + 1;
        }
        break;
      }
    }

    if (prefixIdx === -1 || numberIdx === -1) return;

    const courseCode = cellTexts[prefixIdx].trim().toUpperCase() + cellTexts[numberIdx].trim();

    // cell indices based on RTL table structure
    const sectionIdx = prefixIdx - 3;
    const nameIdx = prefixIdx - 2;
    const instructorIdx = prefixIdx - 4;
    const sundayIdx = prefixIdx - 5;
    const mondayIdx = prefixIdx - 6;
    const tuesdayIdx = prefixIdx - 7;
    const wednesdayIdx = prefixIdx - 8;
    const thursdayIdx = prefixIdx - 9;
    const capacityIdx = prefixIdx - 10;
    const enrolledIdx = prefixIdx - 11;

    if (sundayIdx < 0 || enrolledIdx < 0) return;

    const section = {
      courseCode,
      courseName: cellTexts[nameIdx] || '',
      section: cellTexts[sectionIdx] || '',
      instructor: cellTexts[instructorIdx] || '',
      days: {
        sunday: parseTimeSlot(cellTexts[sundayIdx]),
        monday: parseTimeSlot(cellTexts[mondayIdx]),
        tuesday: parseTimeSlot(cellTexts[tuesdayIdx]),
        wednesday: parseTimeSlot(cellTexts[wednesdayIdx]),
        thursday: parseTimeSlot(cellTexts[thursdayIdx])
      },
      capacity: parseInt(cellTexts[capacityIdx]) || 0,
      enrolled: parseInt(cellTexts[enrolledIdx]) || 0
    };

    // check if has any time
    const hasTime = Object.values(section.days).some(d => d !== null);
    if (hasTime) {
      sections.push(section);
    }
  });

  return sections;
}
