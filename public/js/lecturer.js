async function loadLecturerSessions() {
    const response = await fetch('/api/lecturer/my-sessions', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const sessions = await response.json();

    const container = document.getElementById('sessions-list');
    container.innerHTML = sessions.map(s => `
        <div class="glass-card mb-3 fade-in-up">
            <div class="d-flex justify-content-between">
                <div>
                    <h5 class="m-0">${s.courseCode}</h5>
                    <small>${new Date(s.createdAt).toLocaleDateString()}</small>
                </div>
                <div class="text-end">
                    <span class="badge bg-success">${s._count.records} Present</span>
                </div>
            </div>
            <hr class="my-2">
            <button onclick="downloadPDF(${s.id})" class="btn btn-sm btn-light w-100 btn-press">
                📥 Download PDF Report
            </button>
        </div>
    `).join('');
}

function downloadPDF(sessionId) {
    // We open in a new window to trigger the browser's native download manager
    window.open(`/api/lecturer/export-session/${sessionId}?token=${localStorage.getItem('token')}`, '_blank');
}