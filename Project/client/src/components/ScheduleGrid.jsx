import { DAY_NAMES } from '../constants';

var DAYS = [
  { key: 'sunday',    name: DAY_NAMES.sunday },
  { key: 'monday',    name: DAY_NAMES.monday },
  { key: 'tuesday',   name: DAY_NAMES.tuesday },
  { key: 'wednesday', name: DAY_NAMES.wednesday },
  { key: 'thursday',  name: DAY_NAMES.thursday }
];

// grid starts at 8:00 and ends at 20:00
var GRID_START = 8 * 60;  // 480 minutes
var GRID_END   = 20 * 60; // 1200 minutes
var GRID_TOTAL = GRID_END - GRID_START; // 720 minutes
var HOUR_HEIGHT = 120; // px per hour
var GRID_HEIGHT = (GRID_TOTAL / 60) * HOUR_HEIGHT; // 720px

// hour labels on the side
var HOURS = [];
for (var h = 8; h <= 20; h++) {
  HOURS.push(h);
}

var COLORS = [
  { bg: 'rgba(0,217,255,0.25)',  border: '#00d9ff', text: '#00d9ff' },
  { bg: 'rgba(0,255,136,0.25)',  border: '#00ff88', text: '#00ff88' },
  { bg: 'rgba(255,165,0,0.25)',  border: '#ffa500', text: '#ffa500' },
  { bg: 'rgba(200,100,255,0.25)',border: '#c864ff', text: '#c864ff' },
  { bg: 'rgba(255,80,120,0.25)', border: '#ff5078', text: '#ff5078' },
  { bg: 'rgba(255,220,0,0.25)',  border: '#ffdc00', text: '#ffdc00' },
  { bg: 'rgba(0,200,200,0.25)',  border: '#00c8c8', text: '#00c8c8' },
  { bg: 'rgba(255,140,0,0.25)',  border: '#ff8c00', text: '#ff8c00' },
];

function ScheduleGrid({ sections }) {
  if (!sections || sections.length === 0) {
    return <div className="schedule-grid-empty">لا توجد مواد في هذا الجدول</div>;
  }

  var colorMap = {};
  var colorIdx = 0;
  sections.forEach(s => {
    if (!colorMap[s.courseCode]) {
      colorMap[s.courseCode] = COLORS[colorIdx % COLORS.length];
      colorIdx++;
    }
  });

  function getBlock(section, dayKey) {
    var slot = section.days[dayKey];
    if (!slot) return null;

    var start = Math.max(slot.start, GRID_START);
    var end   = Math.min(slot.end,   GRID_END);
    if (end <= start) return null;

    var top    = ((start - GRID_START) / 60) * HOUR_HEIGHT;
    var height = ((end - start) / 60) * HOUR_HEIGHT;
    var color  = colorMap[section.courseCode];

    return { top, height, color, slot };
  }

  return (
    <div className="schedule-grid">

      {/* header */}
      <div className="sg-header">
        <div className="sg-time-col"></div>
        {DAYS.map(d => (
          <div key={d.key} className="sg-day-header">{d.name}</div>
        ))}
      </div>

      {/* body */}
      <div className="sg-body">

        {/* time labels */}
        <div className="sg-time-col">
          {HOURS.map(h => (
            <div
              key={h}
              className="sg-hour-label"
              style={{ top: ((h - 8) * HOUR_HEIGHT) + 'px' }}
            >
              {h}:00
            </div>
          ))}
        </div>

        {/* day columns */}
        {DAYS.map(d => (
          <div key={d.key} className="sg-day-col" style={{ height: GRID_HEIGHT + 'px' }}>

            {/* hour lines */}
            {HOURS.map(h => (
              <div
                key={h}
                className="sg-hour-line"
                style={{ top: ((h - 8) * HOUR_HEIGHT) + 'px' }}
              />
            ))}

            {/* course blocks */}
            {sections.map((section, i) => {
              var block = getBlock(section, d.key);
              if (!block) return null;
              return (
                <div
                  key={i}
                  className="sg-course-block"
                  style={{
                    top:    block.top + 'px',
                    height: block.height + 'px',
                    background: block.color.bg,
                    borderColor: block.color.border,
                    color: block.color.text
                  }}
                >
                  <div className="sg-block-code">{section.courseCode} · {section.section}</div>
                  <div className="sg-block-time">{block.slot.display}</div>
                  <div className="sg-block-name">{section.courseName}</div>
                  <div className="sg-block-instructor">{section.instructor}</div>
                  
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export default ScheduleGrid;
