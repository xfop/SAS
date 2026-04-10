import { DAY_NAMES } from '../constants';

function CourseCard({ section }) {
 // get days that have classes 
  var activeDays = [];
  var day;
  for (day in section.days) {
    if (section.days[day] != null) {
      activeDays.push({
        day: DAY_NAMES[day],
        time: section.days[day].display
      });
    }
  }

  return (
    <div className="course-card">
      <div className="course-card-header">
        <span className="course-card-code">{section.courseCode}</span>
        <span className="course-card-section">{section.section}</span>
      </div>
      <div className="course-card-name">{section.courseName}</div>
      <div className="course-card-instructor">{section.instructor}</div>
      <div className="course-card-times">
        {activeDays.map(({ day, time }, idx) => (
          <span key={idx} className="day-time">
            {day}: {time}
          </span>
        ))}
      </div>
    </div>
  );
}

export default CourseCard;
