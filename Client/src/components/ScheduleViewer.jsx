import { useState } from 'react';
import CourseCard from './CourseCard';
import ScheduleGrid from './ScheduleGrid';
import StudyPlanGrid from './StudyPlanGrid';
import NextSemesterAdvisor from './NextSemesterAdvisor';

function ScheduleViewer({ result }) {
  const [activeSchedule, setActiveSchedule] = useState(0);
  const [showVerification, setShowVerification] = useState(false);
  const [showPlanCourses, setShowPlanCourses] = useState(false);

  const { schedules, summary, verification, planCourses } = result;

  if (!schedules || schedules.length === 0) {
    return (
      <div className="schedule-viewer">
        <div className="no-schedules">
          <h3>لم يتم إنشاء جداول</h3>
          <p>لا توجد مواد متاحة في الجدول تناسب سجلك الأكاديمي</p>
        </div>
      </div>
    );
  }

  const current = schedules[activeSchedule];

  return (
    <div className="schedule-viewer">

      {/* summary */}
      <div className="summary">
        <h3>ملخص النتائج</h3>
        <div className="summary-grid">
          <div className="summary-item passed-item">
            <div className="value">{summary.passedCount}</div>
            <div className="label">مواد ناجحة</div>
          </div>
          <div className="summary-item failed-item">
            <div className="value">{summary.failedCount}</div>
            <div className="label">مواد راسبة</div>
          </div>
          <div className="summary-item">
            <div className="value">{summary.requiredCoursesCount}</div>
            <div className="label">مواد مطلوبة</div>
          </div>
          <div className="summary-item">
            <div className="value">{summary.coursesWithSections}</div>
            <div className="label">مواد متاحة في الجدول</div>
          </div>
          <div className="summary-item">
            <div className="value">{summary.schedulesGenerated}</div>
            <div className="label">جداول تم إنشاؤها</div>
          </div>
        </div>
      </div>

      {/* schedule navigation */}
      <div className="schedule-nav">
        <h3>الجداول المقترحة</h3>
        <div className="schedule-tabs">
          {schedules.map((s, i) => (
            <button
              key={i}
              className={`schedule-tab ${activeSchedule === i ? 'active' : ''}`}
              onClick={() => setActiveSchedule(i)}
            >
              جدول {i + 1}
              
              
              <span  className="tab-credits">  <br></br>   {s.totalCredits} ساعة   </span>
            </button>
          ))}
        </div>
      </div>

      {/* current schedule */}
      <div className="schedule-content">
        <div className="schedule-header">
          <h4>جدول {activeSchedule + 1}</h4>
          <span className="credits-badge">{current.totalCredits} ساعة معتمدة</span>
        </div>

       

        {/* weekly timetable grid */}
        <ScheduleGrid sections={current.sections} />

        {/* course cards list */}
        <div className="courses-grid">
          {current.sections.map((section, i) => (
            <CourseCard key={i} section={section} />
          ))}
        </div>

      </div>

      {/* next semester advisor */}
      <NextSemesterAdvisor
        planCourses={planCourses}
        recordCourses={verification?.record?.courses}
      />

      {/* plan courses status */}
      {planCourses && planCourses.length > 0 && (
        <div className="verification-section">
          <button
            className="toggle-section-btn"
            onClick={() => setShowPlanCourses(!showPlanCourses)}
          >
            حالة مواد الخطة الدراسية
            <span className="toggle-arrow">{showPlanCourses ? '▲' : '▼'}</span>
          </button>
          {showPlanCourses && <StudyPlanGrid planCourses={planCourses} />}
        </div>
      )}

      {/* verification */}
      {verification && (
        <div className="verification-section">
          <button
            className="toggle-section-btn"
            onClick={() => setShowVerification(!showVerification)}
          >
            تفاصيل السجل الأكاديمي والجدول
            <span className="toggle-arrow">{showVerification ? '▲' : '▼'}</span>
          </button>

          {showVerification && (
            <div className="verify-content">
              <h4>السجل الأكاديمي ({verification.record.total} مادة)</h4>
              <table className="verify-table">
                <thead>
                  <tr>
                    <th>رمز المادة</th>
                    <th>اسم المادة</th>
                    <th>التقدير</th>
                  </tr>
                </thead>
                <tbody>
                  {verification.record.courses.map((c, i) => (
                    <tr key={i} className={c.passed ? 'passed' : c.failed ? 'failed' : 'in-progress'}>
                      <td>{c.code}</td>
                      <td>{c.name}</td>
                      <td>{c.grade}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <h4 style={{ marginTop: '20px' }}>المواد في الجدول ({verification.timetable.totalCourses} مادة)</h4>
              <table className="verify-table">
                <thead>
                  <tr>
                    <th>رمز المادة</th>
                    <th>اسم المادة</th>
                    <th>عدد الشعب</th>
                  </tr>
                </thead>
                <tbody>
                  {verification.timetable.courses.map((c, i) => (
                    <tr key={i}>
                      <td>{c.code}</td>
                      <td>{c.name}</td>
                      <td>{c.sectionsCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ScheduleViewer;
