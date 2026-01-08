/**
 * UNISMART - MAIN LOGIC (STABLE SYNCED)
 * Integrated: Auth, Recovery, Real-time UI, and CSV Export.
 */

let supabaseClient; 
let currentUser = null;
let timerInterval = null;
let activeCourseCode = null; 
let presentCount = 0; // Local counter for UI performance

// 1. Safe Initialization
function init() {
    if (typeof supabase === 'undefined') {
        setTimeout(init, 100);
        return;
    }
    
    const SB_URL = 'https://olvwogdonhsxnzyhpcpv.supabase.co';
    const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9sdndvZ2RvbmhzeG56eWhwY3B2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4MDIwOTgsImV4cCI6MjA4MzM3ODA5OH0.LszM2J9xryM6pVdwKb2vK2uArnzeNthAGvxCvHg-VQA'; 
    
    supabaseClient = supabase.createClient(SB_URL, SB_KEY);
    checkInitialSession();
}

// 2. Auth & Session Management
async function checkInitialSession() {
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session) {
            currentUser = session.user;
            document.getElementById('lecturerDisplayName').innerText = `Certified: ${currentUser.user_metadata.full_name || 'Staff'}`;
            checkActiveSession(); 
        } else {
            window.location.href = 'login.html';
        }
    } catch (err) {
        console.error("Auth check failed:", err);
    }
}

/**
 * RECOVERY FEATURE: Restores state if page is refreshed during a class
 */
async function checkActiveSession() {
    const { data: session } = await supabaseClient
        .from('active_sessions')
        .select('*')
        .eq('is_active', true)
        .eq('lecturer_name', currentUser.user_metadata.full_name) // Match by name as fallback
        .maybeSingle();

    if (session) {
        console.log("🔄 Session Restored:", session.course_code);
        activeCourseCode = session.course_code;
        
        // UI Restore
        document.getElementById('activeCode').innerText = session.otp;
        document.getElementById('codeOverlay').classList.add('hidden');
        document.getElementById('statusDot').className = "w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]";
        document.getElementById('geoStatus').innerText = "Broadcasting Live";

        // Restore Students & Start Listener
        fetchExistingLogs(session.course_code);
        listenForAttendance(session.course_code);
    }
}

// 3. Lecturer Functions
async function startSession() {
    const courseInput = document.getElementById('courseCode');
    const course = courseInput.value.trim().toUpperCase();
    
    if(!course) return alert("Please enter a course code.");
    
    navigator.geolocation.getCurrentPosition(async (pos) => {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        activeCourseCode = course; 

        // Close old sessions first
        await supabaseClient.from('active_sessions')
            .update({ is_active: false })
            .eq('lecturer_name', currentUser.user_metadata.full_name);

        const { data, error } = await supabaseClient.from('active_sessions').insert([{
            course_code: course,
            otp: otp,
            lecturer_name: currentUser.user_metadata.full_name,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            is_active: true
        }]).select().single();

        if (error) return alert("Session Error: " + error.message);

        // Update UI
        document.getElementById('activeCode').innerText = otp;
        document.getElementById('codeOverlay').classList.add('hidden');
        document.getElementById('statusDot').className = "w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]";
        document.getElementById('geoStatus').innerText = "Broadcasting Live";
        
        listenForAttendance(course);
    }, (err) => {
        alert("GPS Required to secure attendance.");
    });
}

// 4. Real-time Attendance & Rendering
async function fetchExistingLogs(courseCode) {
    const { data: logs } = await supabaseClient
        .from('attendance_logs')
        .select('*')
        .eq('course_code', courseCode);
    
    if (logs) {
        document.getElementById('studentList').innerHTML = ""; // Clear placeholder
        logs.forEach(log => renderStudentRow(log));
    }
}

function listenForAttendance(courseCode) {
    supabaseClient
        .channel('attendance_changes')
        .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'attendance_logs',
            filter: `course_code=eq.${courseCode}` 
        }, payload => {
            renderStudentRow(payload.new);
        })
        .subscribe();
}

function renderStudentRow(log) {
    const list = document.getElementById('studentList');
    // Prevent duplicate entries on screen
    if (document.getElementById(`student-${log.matric_no}`)) return;

    const rowHtml = `
        <div id="student-${log.matric_no}" class="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5 animate-in fade-in duration-500">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center text-xs font-bold text-blue-400">
                    ${log.student_name.charAt(0)}
                </div>
                <div>
                    <p class="text-[10px] font-black uppercase text-slate-100">${log.student_name}</p>
                    <p class="text-[8px] text-slate-500 font-mono tracking-widest">${log.matric_no}</p>
                </div>
            </div>
            <span class="text-[7px] font-black text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-md">VERIFIED</span>
        </div>`;
    
    list.insertAdjacentHTML('afterbegin', rowHtml);
    
    presentCount++;
    document.getElementById('studentCount').innerText = `${presentCount} PRESENT`;
}

// 5. Reporting
async function downloadCourseReport() {
    if (!activeCourseCode) return alert("No active class records to export.");

    const { data: logs } = await supabaseClient
        .from('attendance_logs')
        .select('student_name, matric_no, created_at')
        .eq('course_code', activeCourseCode);

    if (!logs || logs.length === 0) return alert("No check-ins recorded yet.");

    let csv = "Full Name,Matric Number,Check-in Time\n" + 
        logs.map(l => `"${l.student_name}","${l.matric_no}","${new Date(l.created_at).toLocaleTimeString()}"`).join("\n");
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Attendance_${activeCourseCode}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
}

function logout() {
    supabaseClient.auth.signOut().then(() => {
        location.reload();
    });
}

// Start System
init();