import { useState } from 'react';

function DropZone({ id, file, onFileChange, icon, title, description }) {
  const [dragging, setDragging] = useState(false);

  function handleDragOver(e) {
    e.preventDefault();
    setDragging(true);
  }

  function handleDragLeave() {
    setDragging(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) onFileChange(dropped);
  }

  function handleInputChange(e) {
    const selected = e.target.files[0];
    if (selected) onFileChange(selected);
  }

  function handleRemove(e) {
    e.preventDefault();
    onFileChange(null);
    document.getElementById(id).value = '';
  }

  return (
    <div
      className={`upload-box ${file ? 'has-file' : ''} ${dragging ? 'dragging' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type="file"
        id={id}
        accept=".html,.htm"
        onChange={handleInputChange}
      />
      <label htmlFor={id}>
        <div className="upload-icon">{icon}</div>
        <h3>{title}</h3>
        <p>{description}</p>
        {file ? (
          <div className="file-name">
            {file.name}
            <button className="remove-file-btn" onClick={handleRemove}>✕</button>
          </div>
        ) : (
          <p className="drag-hint">اسحب الملف هنا أو اضغط للاختيار</p>
        )}
      </label>
    </div>
  );
}

function HowToSave({ title, steps }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="how-to-save">
      <button className="how-to-btn" onClick={() => setOpen(!open)}>
        ؟ كيف أحفظ الملف
      </button>

      {open && (
        <div className="how-to-popup">
          <div className="how-to-header">
            <strong>{title}</strong>
            <button className="how-to-close" onClick={() => setOpen(false)}>✕</button>
          </div>
          <ol className="how-to-steps">
            {steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
          <div className="how-to-tip">
            الاختصار: <kbd>Ctrl</kbd> + <kbd>S</kbd> ثم اختر <strong>Webpage, HTML Only</strong>
          </div>
        </div>
      )}
    </div>
  );
}

function FileUpload({ timetableFile, recordFile, onTimetableChange, onRecordChange }) {
  return (
    <section className="upload-section">
      <div className="upload-header">
        <h2>رفع الملفات</h2>
        <HowToSave
          title="كيف تحفظ صفحة الجدول أو السجل كملف HTML"
          steps={[
            'افتح نظام الجامعة في المتصفح (Chrome أو Edge)',
            'انتقل إلى صفحة الجدول الدراسي أو السجل الأكاديمي',
            'اضغط Ctrl + S على لوحة المفاتيح',
            'في نافذة الحفظ، غيّر نوع الملف إلى Webpage, HTML Only',
            'احفظ الملف ثم ارفعه هنا',
          ]}
        />
      </div>
      <div className="upload-grid">
        <DropZone
          id="timetable"
          file={timetableFile}
          onFileChange={onTimetableChange}
          icon="📅"
          title="جدول المواد المتاحة"
          description="ملف HTML من نظام الجامعة"
        />
        <DropZone
          id="record"
          file={recordFile}
          onFileChange={onRecordChange}
          icon="📋"
          title="السجل الأكاديمي"
          description="ملف HTML من نظام الجامعة"
        />
      </div>
    </section>
  );
}

export default FileUpload;
