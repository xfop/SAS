// schedule generator using backtracking

const MIN_CREDITS = 12;
const MAX_CREDITS = 19;
const MAX_SCHEDULES = 10000;

var DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'];

var ELECTIVE_PLACEHOLDERS = ['FE1', 'FE2', 'SCI100', 'GSE1', 'GSE2', 'CS1', 'CS2', 'CS3'];

// check if two time slots overlap
function timesOverlap(a, b) {
  if (!a || !b) return false;
  return a.start < b.end && b.start < a.end;
}

// check if a section conflicts with any section already in the schedule
function hasConflict(section, schedule) {
  for (var i = 0; i < schedule.length; i++) {
    var existing = schedule[i];
    for (var d = 0; d < DAY_NAMES.length; d++) {
      var day = DAY_NAMES[d];
      if (timesOverlap(section.days[day], existing.days[day])) {
        return true;
      }
    }
  }
  return false;
}

function totalCredits(scheduleSections, planData) {
  var total = 0;
  for (var i = 0; i < scheduleSections.length; i++) {
    var code = scheduleSections[i].courseCode;
    total += (planData[code] && planData[code].credits) ? planData[code].credits : 3;
  }
  return total;
}

// score schedule - lower is better (prefers more courses, balanced days)
function scoreSchedule(schedule, requiredCount) {
  // prefer schedules with more required courses
  var coverageScore = (requiredCount - schedule.length) * 100;

  // prefer schedules with earlier classes
  var timeScore = 0;
  for (var i = 0; i < schedule.length; i++) {
    for (var d = 0; d < DAY_NAMES.length; d++) {
      var slot = schedule[i].days[DAY_NAMES[d]];
      if (slot) timeScore += slot.start;
    }
  }

  return coverageScore + timeScore / 1000;
}

export function isElectivePlaceholder(code) {
  return /^(CS[123]|FE[12]|GSE[12])$/.test(code);
}

// get courses the student is eligible to take that have sections in timetable
export function getEligibleCourses(planData, passedCourses, sections) {
  var passedSet = new Set(passedCourses);
  var eligible = [];

  for (var code in planData) {
    if (code.startsWith('_')) continue; // skip _meta and any internal keys  //************** */
    if (passedSet.has(code)) continue;
    var course = planData[code];
    var prereqsMet = course.prerequisites.every(function(p) { return passedSet.has(p); });
    if (!prereqsMet) continue;
    var hasSections = sections.some(function(s) { return s.courseCode === code; });
    if (hasSections) eligible.push(code);
  }

  return eligible;
}

export function getElectivePlaceholders(planData, passedCourses) {
  var passedSet = new Set(passedCourses);
  return ELECTIVE_PLACEHOLDERS.filter(function(code) { return !passedSet.has(code); });
}

// electives from timetable not in plan
export function getElectiveCourses(planData, passedCourses, sections) {
  var result = [];
  for (var i = 0; i < sections.length; i++) {
    var code = sections[i].courseCode;
    if (!planData[code]) result.push(code);
  }
  return [...new Set(result)];
}

export function separateRequiredCourses(requiredCourses) {
  var withSections = [];
  var withoutSections = [];
  for (var i = 0; i < requiredCourses.length; i++) {
    if (requiredCourses[i].hasSection) withSections.push(requiredCourses[i]);
    else withoutSections.push(requiredCourses[i]);
  }
  return { withSections, withoutSections };
}

export function getAllPlanCoursesWithStatus(planData, passedCourses, failedCourses, sections) {
  var passedSet = new Set(passedCourses);
  var failedSet = new Set(failedCourses);
  var sectionCodes = new Set(sections.map(function(s) { return s.courseCode; }));

  var result = [];
  for (var code in planData) {
    if (code.startsWith('_')) continue; // skip _meta and any internal keys
    var course = planData[code];
    var status;
    if (passedSet.has(code)) {
      status = 'passed';
    } else if (failedSet.has(code)) {
      status = 'failed';
    } else {
      var prereqsMet = course.prerequisites.every(function(p) { return passedSet.has(p); });
      if (prereqsMet) {
        status = sectionCodes.has(code) ? 'available' : 'eligible';
      } else {
        status = 'not_taken';
      }
    }
    result.push({
      code,
      name: course.name,
      credits: course.credits,
      prerequisites: course.prerequisites,
      status,
      hasSection: sectionCodes.has(code)
    });
  }
  return result;
}

// backtracking to generate all valid non-conflicting schedules
export function generateSchedules(planData, requiredCourses, sections, electiveCourses) {
  var results = [];
  var seenKeys = new Set(); // prevent duplicates

  // group sections by course code
  var sectionsByCourse = {};
  for (var i = 0; i < sections.length; i++) {
    var s = sections[i];
    if (!sectionsByCourse[s.courseCode]) sectionsByCourse[s.courseCode] = [];
    sectionsByCourse[s.courseCode].push(s);
  }

  // only keep courses that have sections
  var coursesToSchedule = requiredCourses.filter(function(code) {
    return sectionsByCourse[code] && sectionsByCourse[code].length > 0;
  });

  if (coursesToSchedule.length === 0) return [];

  function backtrack(courseIdx, currentSchedule) {
    if (results.length >= MAX_SCHEDULES) return;

    // record valid schedule only if credits > MIN
    if (currentSchedule.length > 0) {
      var credits = totalCredits(currentSchedule, planData);
      if (credits > MIN_CREDITS) {
        // build unique key from sorted section identifiers to prevent duplicates
        var key = currentSchedule
          .map(function(s) { return s.courseCode + ':' + s.section; })
          .sort()
          .join('|');
        if (!seenKeys.has(key)) { 
          seenKeys.add(key);
          results.push({
            sections: [...currentSchedule],
            totalCredits: credits,
            courseCount: currentSchedule.length,
            score: scoreSchedule(currentSchedule, coursesToSchedule.length)
          });
        }
      }
    }

    if (courseIdx >= coursesToSchedule.length) return;

    for (var i = courseIdx; i < coursesToSchedule.length; i++) {
      var code = coursesToSchedule[i];
      var courseSections = sectionsByCourse[code];

      for (var j = 0; j < courseSections.length; j++) {
        var section = courseSections[j];
        var credits = totalCredits(currentSchedule, planData) + ((planData[code] && planData[code].credits) || 3);

        if (credits > MAX_CREDITS) continue;
        if (hasConflict(section, currentSchedule)) continue;

        currentSchedule.push(section);
        backtrack(i + 1, currentSchedule);
        currentSchedule.pop();

        if (results.length >= MAX_SCHEDULES) return;
      }
    }
  }

  backtrack(0, []);

  // sort by most courses first, then by score (earlier times)
  results.sort(function(a, b) {
    if (b.courseCount !== a.courseCount) return b.courseCount - a.courseCount;
    return a.score - b.score;
  });

  return results;
}
