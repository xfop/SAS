import { useState } from 'react';

const MIN_CREDITS = 12;
const MAX_CREDITS = 19;

function creditStatus(total) {
  if (total < MIN_CREDITS) return 'under';
  if (total > MAX_CREDITS) return 'over';
  return 'ok';
}

function CreditBar({ courses, label }) {
  const total = courses.reduce((sum, c) => sum + (c.credits || 3), 0);
  const status = creditStatus(total);
  const pct = Math.min((total / MAX_CREDITS) * 100, 100);

  return (
    <div className="advisor-credit-bar-wrap">
      <div className="advisor-credit-bar-label">
        {label}
        <span className={`advisor-credit-count ${status}`}>
          {total} ساعة
          {status === 'under' && ` — أقل من الحد الأدنى (${MIN_CREDITS})`}
          {status === 'over'  && ` — يتجاوز الحد الأقصى (${MAX_CREDITS})`}
          {status === 'ok'    && ` — ضمن النطاق المسموح (${MIN_CREDITS}–${MAX_CREDITS})`}
        </span>
      </div>
      <div className="advisor-credit-track">
        <div className={`advisor-credit-fill ${status}`} style={{ width: `${pct}%` }} />
        <div className="advisor-credit-min-marker" style={{ left: `${(MIN_CREDITS / MAX_CREDITS) * 100}%` }} />
      </div>
    </div>
  );
}

function NextSemesterAdvisor({ planCourses, recordCourses }) {
  const [open, setOpen] = useState(false);

  if (!planCourses || planCourses.length === 0) return null;

  // courses by status
  const available = planCourses.filter(c => c.status === 'available');
  const eligible  = planCourses.filter(c => c.status === 'eligible');
  const failed    = planCourses.filter(c => c.status === 'failed');
  const notTaken  = planCourses.filter(c => c.status === 'not_taken');

  // failed courses that have sections (can actually register)
  const failedWithSections = failed.filter(c => c.hasSection);

  // registerable this semester = available + failed-with-sections
  const registerable = [...available, ...failedWithSections];

  // credits calculation
  const registerableCredits = registerable.reduce((s, c) => s + (c.credits || 3), 0);

  // how many credits over/under
  const overBy  = Math.max(0, registerableCredits - MAX_CREDITS);
  const underBy = Math.max(0, MIN_CREDITS - registerableCredits);

  // if over max: suggest dropping lowest-priority courses to fit within 19
  let suggested = [];
  if (overBy > 0) {
    let running = registerableCredits;
    // drop from the end (lowest priority = last eligible courses) until under max
    const pool = [...registerable].reverse();
    const dropped = new Set();
    for (const c of pool) {
      if (running <= MAX_CREDITS) break;
      dropped.add(c.code);
      running -= (c.credits || 3);
    }
    suggested = registerable.filter(c => !dropped.has(c.code));
  }

  // currently passed codes
  const passedCodes = new Set(planCourses.filter(c => c.status === 'passed').map(c => c.code));

  // courses registered this semester (مسجل or no grade)
  const enrolledCodes = new Set(
    (recordCourses || [])
      .filter(c => c.mosajal || (!c.passed && !c.failed && !c.grade))
      .map(c => c.code)
  );

  // scenario: if student passes all enrolled courses
  const passedIfAllPass = new Set([...passedCodes, ...enrolledCodes]);
  const unlocksIfPass = notTaken.filter(c =>
    c.prerequisites && c.prerequisites.every(p => passedIfAllPass.has(p))
  );
  const unlocksIfFail = notTaken.filter(c =>
    c.prerequisites && c.prerequisites.every(p => passedCodes.has(p))
  );
  const onlyUnlocksIfPass = unlocksIfPass.filter(c =>
    !unlocksIfFail.some(x => x.code === c.code)
  );

  return (
    <div className="verification-section">
      <button className="toggle-section-btn" onClick={() => setOpen(!open)}>
        توصيات الفصل القادم
        <span className="toggle-arrow">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="advisor-content">

          {/* credit summary bar */}
          <CreditBar
            courses={registerable}
            label="إجمالي الساعات القابلة للتسجيل"
          />

          {/* warning if over max */}
          {overBy > 0 && (
            <div className="advisor-warning">
              تجاوز الحد الأقصى بـ {overBy} ساعة — يُنصح بالتسجيل في {suggested.length} مادة فقط:
              <div className="advisor-rows" style={{ marginTop: 8 }}>
                {suggested.map((c, i) => (
                  <div key={i} className="advisor-row">
                    <span className="advisor-code">{c.code}</span>
                    <span className="advisor-name">{c.name}</span>
                    <span className="advisor-credits">{c.credits} س</span>
                  </div>
                ))}
              </div>
              <CreditBar courses={suggested} label="الساعات بعد الحذف" />
            </div>
          )}

          {/* warning if under min */}
          {underBy > 0 && (
            <div className="advisor-warning under">
              الساعات أقل من الحد الأدنى ({MIN_CREDITS}) بفارق {underBy} ساعة
            </div>
          )}

          {/* available now */}
          {available.length > 0 && (
            <div className="advisor-block available">
              <div className="advisor-block-title">
                يمكن التسجيل الآن — {available.length} مادة
                <span className="advisor-block-credits">
                  {available.reduce((s, c) => s + (c.credits || 3), 0)} ساعة
                </span>
              </div>
              <div className="advisor-rows">
                {available.map((c, i) => (
                  <div key={i} className="advisor-row">
                    <span className="advisor-code">{c.code}</span>
                    <span className="advisor-name">{c.name}</span>
                    <span className="advisor-credits">{c.credits} س</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* failed with sections */}
          {failedWithSections.length > 0 && (
            <div className="advisor-block failed">
              <div className="advisor-block-title">
                مواد راسبة متاحة للإعادة — {failedWithSections.length} مادة
                <span className="advisor-block-credits">
                  {failedWithSections.reduce((s, c) => s + (c.credits || 3), 0)} ساعة
                </span>
              </div>
              <div className="advisor-rows">
                {failedWithSections.map((c, i) => (
                  <div key={i} className="advisor-row">
                    <span className="advisor-code">{c.code}</span>
                    <span className="advisor-name">{c.name}</span>
                    <span className="advisor-credits">{c.credits} س</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* failed without sections */}
          {failed.filter(c => !c.hasSection).length > 0 && (
            <div className="advisor-block failed-no-section">
              <div className="advisor-block-title">
                مواد راسبة بدون شعب في الجدول الحالي ({failed.filter(c => !c.hasSection).length})
              </div>
              <div className="advisor-rows">
                {failed.filter(c => !c.hasSection).map((c, i) => (
                  <div key={i} className="advisor-row">
                    <span className="advisor-code">{c.code}</span>
                    <span className="advisor-name">{c.name}</span>
                    <span className="advisor-credits">{c.credits} س</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* eligible but no sections */}
          {eligible.length > 0 && (
            <div className="advisor-block eligible">
              <div className="advisor-block-title">
                مستوفي المتطلبات لكن بدون شعب في الجدول الحالي ({eligible.length})
              </div>
              <div className="advisor-rows">
                {eligible.map((c, i) => (
                  <div key={i} className="advisor-row">
                    <span className="advisor-code">{c.code}</span>
                    <span className="advisor-name">{c.name}</span>
                    <span className="advisor-credits">{c.credits} س</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* scenario: if you pass / fail this semester */}
          {enrolledCodes.size > 0 && (
            <div className="advisor-scenarios">
              <div className="advisor-scenario-title">السيناريوهات بناءً على نتائج الفصل الحالي</div>

              <div className="advisor-scenario pass-scenario">
                <div className="scenario-label pass">
                  إذا نجحت في الفصل الحالي — ستفتح لك {unlocksIfPass.length} مادة جديدة
                </div>
                {unlocksIfPass.length > 0 ? (
                  <>
                    <div className="advisor-rows">
                      {unlocksIfPass.map((c, i) => (
                        <div key={i} className="advisor-row">
                          <span className="advisor-code">{c.code}</span>
                          <span className="advisor-name">{c.name}</span>
                          <span className="advisor-credits">{c.credits} س</span>
                          <span className="advisor-prereqs">يتطلب: {c.prerequisites.join(', ')}</span>
                        </div>
                      ))}
                    </div>
                    <CreditBar
                      courses={[...registerable, ...unlocksIfPass]}
                      label="الساعات المتاحة إذا نجحت"
                    />
                  </>
                ) : (
                  <div className="advisor-empty">لا توجد مواد جديدة تفتح</div>
                )}
              </div>

              <div className="advisor-scenario fail-scenario">
                <div className="scenario-label fail">
                  إذا رسبت في الفصل الحالي — ستبقى {available.length + eligible.length} مادة متاحة
                  {onlyUnlocksIfPass.length > 0 && ` وستخسر فتح ${onlyUnlocksIfPass.length} مادة`}
                </div>
                {onlyUnlocksIfPass.length > 0 && (
                  <div className="advisor-rows">
                    {onlyUnlocksIfPass.map((c, i) => (
                      <div key={i} className="advisor-row">
                        <span className="advisor-code">{c.code}</span>
                        <span className="advisor-name">{c.name}</span>
                        <span className="advisor-credits">{c.credits} س</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {registerable.length === 0 && eligible.length === 0 && (
            <div className="advisor-empty">لا توجد توصيات — أكملت جميع متطلبات الخطة المتاحة</div>
          )}

        </div>
      )}
    </div>
  );
}

export default NextSemesterAdvisor;
