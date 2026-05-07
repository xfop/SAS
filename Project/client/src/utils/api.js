var API_BASE = '/api';

export async function generateSchedules(timetableFile, recordFile, plan = 'CS2014') {
  const formData = new FormData();
  formData.append('timetable', timetableFile);
  formData.append('record', recordFile);
  formData.append('plan', plan);

  const response = await fetch(`${API_BASE}/generate-schedules`, {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'خطأ في الخادم');
  }

  return data;
}

// parse files only
export async function parseFiles(timetableFile, recordFile, plan = 'CS2014') {
  const formData = new FormData();
  formData.append('timetable', timetableFile);
  formData.append('record', recordFile);
  formData.append('plan', plan);

  const response = await fetch(`${API_BASE}/parse`, {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'خطأ في الخادم');
  }

  return data;
}

// get academic plan data
export async function getPlan(planId = 'CS2014') {
  const response = await fetch(`${API_BASE}/plan?id=${planId}`);
  const data = await response.json();
  return data;
}
