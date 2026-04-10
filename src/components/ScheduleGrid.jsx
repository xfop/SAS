import { DAY_NAMES } from '../constants';

// convert to array for  mapping
var DAYS = [
  { key: 'sunday', name: DAY_NAMES.sunday },
  { key: 'monday', name: DAY_NAMES.monday },
  { key: 'tuesday', name: DAY_NAMES.tuesday },
  { key: 'wednesday', name: DAY_NAMES.wednesday },
  { key: 'thursday', name: DAY_NAMES.thursday }
];

// time slots 8am to 8pm
// TODO: maybe make this dynamic based on actual class times?
var TIME_SLOTS = [];
for (let hour = 8; hour < 20; hour++) {
 
}

function ScheduleGrid({ sections }) {
  
}

export default ScheduleGrid;
