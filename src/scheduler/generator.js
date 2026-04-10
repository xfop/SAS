// schedule generator using backtracking
// based on algorithm from COMP101 lol

const MAX_CREDITS = 19;
const MAX_SCHEDULES = 20;

var DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'];

// check if times overlap
function timesOverlap(a, b) {

}

// check for conflicts with existing schedule
function hasConflict(section, schedule) {
 
}

function totalCredits(schedule, planData) {
  
}

// score schedule - lower is better
// TODO: add preference for morning/afternoon classes
function scoreSchedule(schedule, requiredCount) {

}

// elective placeholders
var ELECTIVE_PLACEHOLDERS = ['FE1', 'FE2', 'SCI100', 'GSE1', 'GSE2', 'CS1', 'CS2', 'CS3'];

export function getEligibleCourses(planData, passedCourses, sections) {
 
}

export function getElectivePlaceholders(planData, passedCourses) {
  
}

// electives from timetable (not in plan)
export function getElectiveCourses(planData, passedCourses, sections) {
 
}

export function isElectivePlaceholder(code) {
  // regex for CS1, CS2, CS3, FE1, FE2, GSE1, GSE2
  return /^(CS[123]|FE[12]|GSE[12])$/.test(code);
}

export function separateRequiredCourses(requiredCourses) {
  
}

export function getAllPlanCoursesWithStatus(planData, passedCourses, failedCourses, sections) {

}

// main function
export function generateSchedules(planData, requiredCourses, sections, electiveCourses) {
 
}
