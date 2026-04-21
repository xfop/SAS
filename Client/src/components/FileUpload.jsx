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
        accept=".html,.htm,.pdf"
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

function FileUpload({ timetableFile, recordFile, onTimetableChange, onRecordChange }) {
  return (
    <section className="upload-section">
      <h2>رفع الملفات</h2>
      <div className="upload-grid">
        <DropZone
          id="timetable"
          file={timetableFile}
          onFileChange={onTimetableChange}
          icon="📅"
          title="جدول المواد المتاحة"
          description="ملف HTML أو PDF من نظام الجامعة"
        />
        <DropZone
          id="record"
          file={recordFile}
          onFileChange={onRecordChange}
          icon="📋"
          title="السجل الأكاديمي"
          description="ملف HTML أو PDF من نظام الجامعة"
        />
      </div>
    </section>
  );
}

export default FileUpload;
