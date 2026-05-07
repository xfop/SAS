function StudyPlanGrid({ planCourses }) {
  if (!planCourses || planCourses.length === 0) {
    return <div className="study-plan-grid-empty">لا توجد بيانات للخطة الدراسية</div>;
  }

  var statusLabel = {
    passed:    'ناجح',
    failed:    'راسب',
    available: 'متاح في الجدول',
    eligible:  'مكتملة متطلباته',
    not_taken: 'لم يدرسها بعد'
  };

  var counts = {
    passed:    planCourses.filter(c => c.status === 'passed').length,
    failed:    planCourses.filter(c => c.status === 'failed').length,
    available: planCourses.filter(c => c.status === 'available').length,
    eligible:  planCourses.filter(c => c.status === 'eligible').length,
    not_taken: planCourses.filter(c => c.status === 'not_taken').length,
  };

  return (
    <div className="study-plan-grid">
      {/* status legend with counts */}
      <div className="spg-legend">
        <span className="spg-badge passed">{counts.passed} ناجح</span>
        <span className="spg-badge failed">{counts.failed} راسب</span>
        <span className="spg-badge available">{counts.available} متاح في الجدول</span>
        <span className="spg-badge eligible">{counts.eligible} مكتملة متطلباته</span>
        <span className="spg-badge not_taken">{counts.not_taken} لم يدرسها بعد</span>
      </div>

      <table className="verify-table spg-table">
        <thead>
          <tr>
            <th>رمز المادة</th>
            <th>اسم المادة</th>
            <th>الساعات</th>
            <th>المتطلبات</th>
            <th>الحالة</th>
          </tr>
        </thead>
        <tbody>
          {planCourses.map((c, i) => (
            <tr key={i} className={`spg-row ${c.status}`}>
              <td>{c.code}</td>
              <td>{c.name}</td>
              <td>{c.credits}</td>
              <td className="spg-prereqs">
                {c.prerequisites && c.prerequisites.length > 0
                  ? c.prerequisites.join(', ')
                  : '—'}
              </td>
              <td>
                <span className={`spg-badge ${c.status}`}>
                  {statusLabel[c.status] || c.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default StudyPlanGrid;
