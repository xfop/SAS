import { useState, useEffect } from 'react';
import { LEVEL_NAMES } from '../constants';
import { getPlan } from '../utils/api';

function InteractiveStudyPlan({ planId = 'CS2014' }) {
  const [plan, setPlan] = useState({});
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [showPlan, setShowPlan] = useState(false);
  const [highlightedCourses, setHighlightedCourses] = useState({
    selected: null,
    prerequisites: [],
    unlocks: []
  });

  // fetch plan data when planId changes
  useEffect(() => {
    setPlan({});
    setSelectedCourse(null);
    setHighlightedCourses({ selected: null, prerequisites: [], unlocks: [] });
    getPlan(planId)
      .then(data => setPlan(data))
      .catch(err => console.log('failed to load:', err));
  }, [planId]);

  // get all prereqs - recursive
  function getAllPrerequisites(code, visited) {
    if (!visited) visited = new Set();
    if (visited.has(code)) return [];
    visited.add(code);

    const course = plan[code];
    if (!course || !course.prerequisites) {
      return [];
    }

    var prereqs = [];
    for (var i = 0; i < course.prerequisites.length; i++) {
      prereqs.push(course.prerequisites[i]);
      var more = getAllPrerequisites(course.prerequisites[i], visited); // يسأل المادة وش متطلبها 
      prereqs = prereqs.concat(more);
    }
    // remove duplicates
    return [...new Set(prereqs)];
  }

  // get courses that need this one // مهمة 
  function getUnlockedCourses(code, visited) {
    if (!visited) visited = new Set();
    if (visited.has(code)) return [];
    visited.add(code);

    var unlocks = [];
    for (var courseCode in plan) {
      var data = plan[courseCode];
      if (data.prerequisites && data.prerequisites.includes(code)) {
        unlocks.push(courseCode);
        // get recursive unlocks too
        var more = getUnlockedCourses(courseCode, visited);
        for (var j = 0; j < more.length; j++) {
          if (unlocks.indexOf(more[j]) == -1) {
            unlocks.push(more[j]);
          }
        }
      }
    }
    return unlocks;
  }

  function handleCourseClick(code) {
    if (selectedCourse === code) {
      // deselect
      setSelectedCourse(null);
      setHighlightedCourses({ selected: null, prerequisites: [], unlocks: [] });
    } else {
      setSelectedCourse(code);
      setHighlightedCourses({
        selected: code,
        prerequisites: getAllPrerequisites(code),
        unlocks: getUnlockedCourses(code)
      });
    }
  }

  function getCourseStatus(code) {
    if (highlightedCourses.selected === code) return 'selected';
    if (highlightedCourses.prerequisites.indexOf(code) != -1) return 'prerequisite';
    if (highlightedCourses.unlocks.indexOf(code) != -1) return 'unlocked';
    return 'inactive';
  }

  // * // graph - recursive 

  var levels = (plan._meta && plan._meta.levels) ? plan._meta.levels : {};

  // organize by level
  var coursesByLevel = {};
  for (var i = 1; i <= 10; i++) {
    coursesByLevel[i] = [];
    if (levels[i]) {
      for (var j = 0; j < levels[i].length; j++) {
        var code = levels[i][j];
        if (plan[code]) coursesByLevel[i].push(code);
      }
    }
  }
  
  // loading state
  if (Object.keys(plan).length === 0) {
    return (
      <div className="interactive-study-plan">
        <button className="plan-toggle-btn" onClick={() => setShowPlan(!showPlan)}>
          {plan._meta?.name || planId}
          <span className="toggle-arrow">{showPlan ? '▲' : '▼'}</span>
        </button>
        {showPlan && (
          <div className="interactive-plan-loading">
            <div className="spinner"></div>
            <p>جاري تحميل الخطة الدراسية...</p>
          </div>
        )}
      </div>
    );
  }
      
  return (
    <div className="interactive-study-plan">
      <button className="plan-toggle-btn" onClick={() => setShowPlan(!showPlan)}>
        {plan._meta?.name || planId}
        <span className="toggle-arrow">{showPlan ? '▲' : '▼'}</span>
      </button>

      {showPlan && (
      <>
      <div className="plan-header">
        <p className="plan-instruction">اضغط على أي مادة لرؤية المتطلبات السابقة والمواد التي تفتحها</p>
        <div className="plan-legend-interactive">
          <span className="legend-item">
            <span className="legend-dot selected"></span>
            المادة المختارة
          </span>
          <span className="legend-item">
            <span className="legend-dot prerequisite"></span>
            متطلب سابق
          </span>
          <span className="legend-item">
            <span className="legend-dot unlocked"></span>
            مادة تفتح بعدها
          </span>
          <span className="legend-item">
            <span className="legend-dot inactive"></span>
            غير مرتبطة
          </span>
        </div>
      </div>

      <div className="plan-grid-container">
        <div className="plan-levels-grid">
          {Object.entries(coursesByLevel).map(([level, courses]) => (
            <div key={level} className="level-column-interactive">
              <div className="level-header-interactive">{LEVEL_NAMES[level]}</div>
              <div className="level-courses-interactive">
                {courses.map(code => {
                  const course = plan[code];
                  if (!course) return null;
                  const status = getCourseStatus(code);
                  return (
                    <div
                      key={code}
                      className={`course-card-interactive ${status}`}
                      onClick={() => handleCourseClick(code)}
                    >
                      <div className="card-code">{code}</div>
                      <div className="card-name">{course.name}</div>
                      <div className="card-credits">{course.credits} ساعات</div>
                      {course.prerequisites && course.prerequisites.length > 0 && (
                        <div className="card-prereqs">
                          متطلب: {course.prerequisites.join(', ')}
                        </div>
                      )}
                      {course.hoursRequired && (
                        <div className="card-prereqs">
                          يشترط اجتياز {course.hoursRequired} ساعة
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedCourse && plan[selectedCourse] && (
        <div className="selected-course-info">
          <h3>{plan[selectedCourse].name} ({selectedCourse})</h3>
          <div className="info-grid">
            <div className="info-box prereqs-box">
              <h4>المتطلبات السابقة ({highlightedCourses.prerequisites.length})</h4>
              {highlightedCourses.prerequisites.length > 0 ? (
                <div className="course-chips">
                  {highlightedCourses.prerequisites.map(code => (
                    <span key={code} className="chip prereq-chip">{code}</span>
                  ))}
                </div>
              ) : (
                <p className="no-items">لا يوجد متطلبات</p>
              )}
              {plan[selectedCourse]?.hoursRequired && (
                <p className="hours-required">يشترط اجتياز {plan[selectedCourse].hoursRequired} ساعة معتمدة</p>
              )}
            </div>
            <div className="info-box unlocks-box">
              <h4>المواد التي تفتح بعدها ({highlightedCourses.unlocks.length})</h4>
              {highlightedCourses.unlocks.length > 0 ? (
                <div className="course-chips">
                  {highlightedCourses.unlocks.map(code => (
                    <span key={code} className="chip unlock-chip">{code}</span>
                  ))}
                </div>
              ) : (
                <p className="no-items">لا يوجد مواد تعتمد عليها</p>
              )}
            </div>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  ); 

}

export default InteractiveStudyPlan;
