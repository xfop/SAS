import { useState, useEffect } from 'react';
import FileUpload from './components/FileUpload';
import ScheduleViewer from './components/ScheduleViewer';
import InteractiveStudyPlan from './components/InteractiveStudyPlan';
import { parseFiles, generateSchedules } from './utils/api';

function App() {
  const [timetableFile, setTimetableFile] = useState(null);
  const [recordFile, setRecordFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [parseResult, setParseResult] = useState(null);
  const [scheduleResult, setScheduleResult] = useState(null);
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState('');

  // fetch available plans from server
  useEffect(() => {
    fetch('/api/plans')
      .then(r => r.json())
      .then(data => {
        setPlans(data);
        if (data.length > 0) setSelectedPlan(data[0].id);
      })
      .catch(() => {});
  }, []);

  // step 1: parse files
  async function handleParse() {
    if (!timetableFile || !recordFile) {
      setError('يرجى رفع كلا الملفين');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await parseFiles(timetableFile, recordFile, selectedPlan);
      setParseResult(data);
    } catch (err) {
      setError(err.message || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  }

  // step 2: generate schedules
  async function handleGenerate() {
    setLoading(true);
    setError(null);

    try {
      const data = await generateSchedules(timetableFile, recordFile, selectedPlan);
      setScheduleResult(data);
    } catch (err) {
      setError(err.message || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setTimetableFile(null);
    setRecordFile(null);
    setParseResult(null);
    setScheduleResult(null);
    setError(null);
  }

  return (
    <div className="app">
      <header className="header">
        <h1>الجدول الاكاديمي المقترح</h1>
        
        <p>جامعة طيبة - كلية علوم وهندسة الحاسب</p>
      </header>

      {scheduleResult ? (
        <>
          <button className="generate-btn" onClick={handleReset} style={{marginBottom: 20}}>
            رفع ملفات جديدة
          </button>
          <ScheduleViewer result={scheduleResult} />
        </>
      ) : parseResult ? (
        <>
          <button className="generate-btn" onClick={handleReset} style={{marginBottom: 20}}>
            رفع ملفات جديدة
          </button>

          <div className="summary">
            <h3>نتائج التحليل</h3>
            <div className="summary-grid">
              <div className="summary-item passed-item">
                <div className="value">{parseResult.record.passed}</div>
                <div className="label">مواد ناجحة</div>
              </div>
              <div className="summary-item failed-item">
                <div className="value">{parseResult.record.failed}</div>
                <div className="label">مواد راسبة</div>
              </div>
              <div className="summary-item">
                <div className="value">{parseResult.record.total}</div>
                <div className="label">إجمالي المواد في السجل</div>
              </div>
              <div className="summary-item">
                <div className="value">{parseResult.timetable.totalCourses}</div>
                <div className="label">مواد في الجدول</div>
              </div>
              <div className="summary-item">
                <div className="value">{parseResult.timetable.totalSections}</div>
                <div className="label">شعب متاحة</div>
              </div>
            </div>
          </div>

          <div className="verification-section">
            <h3>السجل الأكاديمي</h3>
            <div className="verify-content">
              <table className="verify-table">
                <thead>
                  <tr>
                    <th>رمز المادة</th>
                    <th>اسم المادة</th>
                    <th>التقدير</th>
                  </tr>
                </thead>
                <tbody>
                  {parseResult.record.courses.map((c, i) => (
                    <tr key={i} className={c.mosajal ? 'mosajal' : c.passed ? 'passed' : c.failed ? 'failed' : !c.grade ? 'no-grade' : 'in-progress'}>
                      <td>{c.code}</td>
                      <td>{c.name}</td>
                      <td>{c.mosajal ? 'مسجل' : c.grade || 'قيد الدراسة'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="verification-section">
            <h3>المواد المتاحة في الجدول</h3>
            <div className="verify-content">
              <table className="verify-table">
                <thead>
                  <tr>
                    <th>رمز المادة</th>
                    <th>اسم المادة</th>
                    <th>الشعب</th>
                  </tr>
                </thead>
                <tbody>
                  {parseResult.timetable.courses.map((c, i) => (
                    <tr key={i}>
                      <td>{c.code}</td>
                      <td>{c.name}</td>
                      <td>
                        <div className="section-list">
                          {c.sections.map((s, j) => (
                            <span key={j} className={`section-tag ${s.isFull ? 'full' : ''}`}>
                              {s.section}
                              {s.isFull && <span className="section-full-badge">ممتلئة</span>}
                              {s.capacity > 0 && (
                                <span className="section-capacity">{s.enrolled}/{s.capacity}</span>
                              )}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {error && <div className="error">{error}</div>}

          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
              <p>جاري إنشاء الجداول...</p>
            </div>
          ) : (
            <button className="generate-btn" onClick={handleGenerate} style={{marginTop: 20}}>
              إنشاء الجداول
            </button>
          )}
        </>
      ) : (
        <>
          {plans.length > 0 && (
            <div className="plan-selector">
              <label>الخطة الدراسية:</label>
              <div className="plan-options">
                {plans.map(p => (
                  <button
                    key={p.id}
                    className={`plan-option-btn ${selectedPlan === p.id ? 'active' : ''}`}
                    onClick={() => setSelectedPlan(p.id)}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <FileUpload
            timetableFile={timetableFile}
            recordFile={recordFile}
            onTimetableChange={setTimetableFile}
            onRecordChange={setRecordFile}
          />

          {error && <div className="error">{error}</div>}

          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
              <p>جاري تحليل الملفات...</p>
            </div>
          ) : (
            <button
              className="generate-btn"
              onClick={handleParse}
              disabled={!timetableFile || !recordFile}
            >
              تحليل الملفات
            </button>
          )}

          <InteractiveStudyPlan planId={selectedPlan} />
        </>
      )}
    </div>
  );
}

export default App;
