/**
 * UNISMART - MAIN LOGIC (FINAL STABLE)
 * Integrated: Auth, Navigation, OTP, Real-time Attendance, and Course Reporting.
 */

// 1. Global State
let supabaseClient; 
let currentUser = null;
let timerInterval = null;
let activeCourseCode = null; // Tracked for reporting

// 2. Safe Initialization
function init() {
    if (typeof supabase === 'undefined') {
        setTimeout(init, 100);
        return;
    }
    
    const SB_URL = 'https://olvwogdonhsxnzyhpcpv.supabase.co';
    const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9sdndvZ2RvbmhzeG56eWhwY3B2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4MDIwOTgsImV4cCI6MjA4MzM3ODA5OH0.LszM2J9xryM6pVdwKb2vK2uArnzeNthAGvxCvHg-VQA'; 
    
    supabaseClient = supabase.createClient(SB_URL, SB_KEY);
    console.log("✅ Supabase Client Created");

    checkInitialSession();
}

// 3. Auth & Session Management
async function checkInitialSession() {
    try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        if (session) {
            handleAuthSuccess(session.user);
        }
    } catch (err) {
        console.error("Auth check failed:", err);
    }
}

// UPDATED AUTH SUCCESS
function handleAuthSuccess(user) {
    currentUser = user;
    const role = user.user_metadata.role;
    
    // ... [Your existing welcome message logic] ...

    if (role === 'LECTURER' || role === 'lecturer') {
        switchView('lecturer-view');
        checkActiveSession(); // <--- NEW: Check for existing session on login/refresh
    } else {
        switchView('student-view');
    }
}

/**
 * RECOVERY FEATURE: Restores state if page is refreshed during a class
 */
async function checkActiveSession() {
    const { data: session, error } = await supabaseClient
        .from('active_sessions')
        .select('*')
        .eq('lecturer_id', currentUser.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (session && !error) {
        console.log("🔄 Active session found! Restoring...");
        
        // 1. Restore Global State
        activeCourseCode = session.course_code;
        
        // 2. Restore UI
        const otpDisplay = document.getElementById('generated-otp') || document.getElementById('activeCode');
        if (otpDisplay) otpDisplay.innerText = session.otp;
        
        const overlay = document.getElementById('codeOverlay');
        if (overlay) overlay.classList.add('hidden');

        // 3. Calculate remaining time
        const startTime = new Date(session.created_at).getTime();
        const now = new Date().getTime();
        const elapsedSeconds = Math.floor((now - startTime) / 1000);
        const durationSeconds = 30 * 60; // Assuming 30 mins, or pull from session if saved
        const remaining = durationSeconds - elapsedSeconds;

        if (remaining > 0) {
            startTimer(remaining);
            
            // 4. Repopulate already present students
            const { data: logs } = await supabaseClient
                .from('attendance_logs')
                .select('*')
                .eq('course_code', activeCourseCode);
            
            if (logs) logs.forEach(log => renderStudentRow(log)); 
            
            // 5. Re-attach Real-time listener
            listenForAttendance(activeCourseCode);
        } else {
            finishSession();
        }
    }
}

// 4. Lecturer Functions
async function generateOTP() {
    if (!currentUser) return;
    
    // Support both ID types for different HTML structures
    const courseInput = document.getElementById('course-selection') || document.getElementById('courseCode');
    const course = courseInput.value.trim().toUpperCase();
    
    if(!course) return alert("Please enter/select a course code.");
    
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    activeCourseCode = course; // Set global state for export
    
    navigator.geolocation.getCurrentPosition(async (pos) => {
        const { error } = await supabaseClient.from('active_sessions').insert([{
            course_code: course,
            otp: otp,
            lecturer_name: currentUser.user_metadata.full_name,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            is_active: true
        }]);

        if (error) return alert("Session Error: " + error.message);

        // UI Updates
        const otpDisplay = document.getElementById('generated-otp') || document.getElementById('activeCode');
        if (otpDisplay) otpDisplay.innerText = otp;
        
        const overlay = document.getElementById('codeOverlay');
        if (overlay) overlay.classList.add('hidden');
        
        startTimer(30 * 60);
        listenForAttendance(course);
    }, (err) => {
        alert("Please enable location to start class.");
    });
}

/**
 * FEATURE: COURSE REPORT GENERATOR
 * Fetches current session data and triggers a CSV download.
 */
async function downloadCourseReport() {
    if (!activeCourseCode) return alert("No active session to report on.");

    const { data: logs, error } = await supabaseClient
        .from('attendance_logs')
        .select('student_name, matric_no, created_at')
        .eq('course_code', activeCourseCode)
        .order('created_at', { ascending: true });

    if (error || !logs || logs.length === 0) {
        return alert("No attendance records found to export.");
    }

    // Format for CSV
    const headers = ["Student Name", "Matric Number", "Time In"];
    const rows = logs.map(log => [
        log.student_name,
        `'${log.matric_no}`, // Force string to prevent Excel formatting errors
        new Date(log.created_at).toLocaleTimeString()
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
        + [headers, ...rows].map(e => e.join(",")).join("\n");

    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `Attendance_${activeCourseCode}_${new Date().toLocaleDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// 5. Student Functions
async function submitAttendance() {
    const codeInput = document.getElementById('class-code') || document.getElementById('otpInput');
    const code = codeInput.value.trim();
    if (!code) return alert("Enter class code.");

    const { data: session, error: sessError } = await supabaseClient
        .from('active_sessions')
        .select('*')
        .eq('otp', code)
        .eq('is_active', true)
        .single();

    if (!session || sessError) return alert("Invalid or Expired Code");

    const { error } = await supabaseClient.from('attendance_logs').insert([{
        student_id: currentUser.id,
        student_name: currentUser.user_metadata.full_name,
        matric_no: currentUser.user_metadata.matric_no,
        course_code: session.course_code
    }]);

    if (error) return alert("Attendance already marked!");
    switchView('success-view');
}

// 6. Real-time Attendance Listener
function listenForAttendance(courseCode) {
    supabaseClient
        .channel('attendance_changes')
        .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'attendance_logs',
            filter: `course_code=eq.${courseCode}` 
        }, payload => {
            const log = payload.new;
            const list = document.getElementById('attendance-list') || document.getElementById('studentList');
            
            if (list) {
                // Remove empty message if it exists
                const emptyMsg = document.getElementById('emptyMsg');
                if(emptyMsg) emptyMsg.remove();

                const newRow = `
                    <div class="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5 fade-in-row">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center text-[10px] font-bold text-blue-400">
                                ${log.student_name.charAt(0)}
                            </div>
                            <div>
                                <p class="text-xs font-bold">${log.student_name}</p>
                                <p class="text-[9px] text-slate-500">${log.matric_no}</p>
                            </div>
                        </div>
                        <span class="text-[8px] font-bold text-green-400 bg-green-400/10 px-2 py-1 rounded-md">VERIFIED</span>
                    </div>`;
                list.insertAdjacentHTML('afterbegin', newRow);
            }
            
            const countLabel = document.getElementById('student-count') || document.getElementById('studentCount');
            if (countLabel) {
                let currentCount = parseInt(countLabel.innerText) || 0;
                countLabel.innerText = (currentCount + 1) + " Present";
            }
        })
        .subscribe();
}

// 7. Utilities
function switchView(viewId) {
    document.querySelectorAll('.view-section, main > div').forEach(s => {
        if(s.id !== 'header') s.classList.add('hidden');
    });
    const target = document.getElementById(viewId);
    if (target) target.classList.remove('hidden');
}

function startTimer(duration) {
    let timer = duration;
    const display = document.getElementById('timer-display') || document.getElementById('timer');
    const progress = document.getElementById('progress');
    
    if (timerInterval) clearInterval(timerInterval);

    timerInterval = setInterval(() => {
        let mins = Math.floor(timer / 60);
        let secs = timer % 60;
        if (display) display.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
        if (progress) progress.style.width = `${(timer / duration) * 100}%`;

        if (--timer < 0) {
            clearInterval(timerInterval);
            finishSession();
        }
    }, 1000);
}

async function finishSession() {
    if (activeCourseCode) {
        await supabaseClient.from('active_sessions')
            .update({ is_active: false })
            .eq('course_code', activeCourseCode)
            .eq('is_active', true);
    }
    const display = document.getElementById('timer-display') || document.getElementById('timer');
    if (display) display.textContent = "EXPIRED";
    const overlay = document.getElementById('codeOverlay');
    if (overlay) overlay.classList.remove('hidden');
}

function logout() {
    supabaseClient.auth.signOut().then(() => {
        location.reload();
    });
}

// Run Init
init();