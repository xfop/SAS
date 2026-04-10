function FileUpload({ timetableFile, recordFile, onTimetableChange, onRecordChange }) {
  
  function handleFileChange(setter) {
    return (e) => {
      const file = e.target.files[0];
      if (file) setter(file);
    };
  }
  
  return (
    <section className="upload-section">
      <h2>رفع الملفات</h2>
      <div className="upload-grid">
        <div className={`upload-box ${timetableFile ? 'has-file' : ''}`}>
          <input
            type="file"
            id="timetable"
            accept=".html,.htm,.pdf"
            onChange={handleFileChange(onTimetableChange)}
          />
          <label htmlFor="timetable">
            <div className="upload-icon">📅</div>
            <h3>جدول المواد المتاحة</h3>
            <p>ملف HTML أو PDF من نظام الجامعة</p>
            {timetableFile && (
              <div className="file-name">
                {timetableFile.name}
                <button className="remove-file-btn" onClick={(e) => { e.preventDefault(); onTimetableChange(null); document.getElementById('timetable').value = ''; }}>✕</button>
              </div>
            )}
          </label>
        </div>
        
          {/*  left (السجل الاكاديمي ) */}
        <div className={`upload-box ${recordFile ? 'has-file' : ''}`}> 
          <input
            type="file"
            id="record"
            accept=".html,.htm,.pdf"
            onChange={handleFileChange(onRecordChange)}
          />
          <label htmlFor="record">
            <div className="upload-icon">📋</div>
            <h3>السجل الأكاديمي</h3>
            <p>ملف HTML أو PDF من نظام الجامعة</p>
            {recordFile && (
              <div className="file-name">
                {recordFile.name}
                <button className="remove-file-btn" onClick={(e) => { e.preventDefault(); onRecordChange(null); document.getElementById('record').value = ''; }}>✕</button>
              </div>
            )}
          </label>
        </div>
      </div>
    </section>
  );
}

export default FileUpload;
