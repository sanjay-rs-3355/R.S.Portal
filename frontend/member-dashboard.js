// ===== MEMBER DASHBOARD LOGIC =====

document.addEventListener('DOMContentLoaded', initMemberDashboard);

async function initMemberDashboard() {
    // 1. Role Check (Allow Admin to view)
    const user = handleDashboardAccess('member', true);
    if (!user) return;

    // 2. Setup UI
    document.getElementById("username-display").innerText = user.name;
    document.getElementById("user-avatar").innerText = user.name.charAt(0).toUpperCase();

    // Show Admin View button if Admin
    if (user.role === 'admin') {
        const adminBtnContainer = document.getElementById('admin-view-btn-container');
        if (adminBtnContainer) adminBtnContainer.style.display = 'block';
    }

    // 3. Navigation Bindings
    setupNavigation();

    // 4. Load Data
    loadMemberStats();
    loadPerformance(); // Shared
    fetchUpcomingDeadlines();
    loadMemberActivity();
}

function setupNavigation() {
    // Navigation
    const navDashboard = document.getElementById('navDashboard');
    const navProjects = document.getElementById('navProjects');
    const navTasks = document.getElementById('navTasks');
    const navLogout = document.getElementById('navLogout');
    const btnAdminView = document.getElementById('btnAdminView');

    if (navDashboard) navDashboard.addEventListener('click', () => {
        window.location.href = 'member-dashboard.html';
    });

    if (navProjects) navProjects.addEventListener('click', () => {
        window.location.href = 'project.html';
    });

    if (navTasks) navTasks.addEventListener('click', () => {
        window.location.href = 'tasks.html';
    });

    if (navLogout) navLogout.addEventListener('click', logout);

    // Admin View Toggle
    if (btnAdminView) btnAdminView.addEventListener('click', () => {
        window.location.href = 'admin-dashboard.html';
    });

    // Logo
    document.querySelector('.logo')?.addEventListener('click', () => window.location.href = 'index.html');
}

async function loadMemberStats() {
    const data = await apiGet('/api/dashboard');
    if (!data) return;

    // Populate Stats
    setText("myProjects", data.joinedProjects || data.totalProjects || 0);
    setText("myTasks", data.assignedTasks || data.totalTasks || 0);
    setText("myCompleted", data.completedTasks || 0);
    setText("teamSize", data.totalUsers || 12);

    // Render Project Stats Chart (Shared)
    renderProjectStatsChart(data);
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.innerText = value;
}

// 3. Upcoming Deadlines
async function fetchUpcomingDeadlines() {
    const tasks = await apiGet('/api/dashboard/deadlines');
    const container = document.getElementById('deadline-list');
    if (!container) return;

    container.innerHTML = "";

    if (!tasks || tasks.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#94a3b8;">No upcoming deadlines.</p>';
        return;
    }

    tasks.forEach(t => {
        let iconClass = 'fa-calendar'; // Default
        let colorClass = 'bg-blue';
        let remaining = t.remaining;

        if (remaining === 'Today') { iconClass = 'fa-circle-exclamation'; colorClass = 'bg-orange'; }

        container.innerHTML += `
            <div class="timeline-item">
                    <div class="timeline-icon ${colorClass}">
                    <i class="fa-regular ${iconClass}"></i>
                </div>
                <div class="timeline-content">
                    <div class="timeline-text">
                        <strong>${t.title}</strong>
                        <span style="display:block; font-size:12px; color:#64748b;">${t.projectTitle}</span>
                    </div>
                    <div class="timeline-time">${remaining}</div>
                </div>
            </div>
        `;
    });
}

// 4. Activity Log (Member specific)
async function loadMemberActivity() {
    const activities = await apiGet('/api/dashboard/activity');
    const container = document.getElementById('activity-list');
    if (!container) return;

    container.innerHTML = "";

    if (!activities || activities.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#94a3b8;">No recent activity.</p>';
        return;
    }

    activities.forEach(a => {
        const timeAgo = getTimeAgo(new Date(a.created_at));

        let icon = 'fa-user';
        let colorClass = 'bg-blue';
        const act = a.action.toLowerCase();

        if (act.includes('created') || act.includes('added')) { icon = 'fa-plus'; colorClass = 'bg-green'; }
        if (act.includes('login')) { icon = 'fa-arrow-right-to-bracket'; colorClass = 'bg-purple'; }
        if (act.includes('status')) { icon = 'fa-arrow-rotate-right'; colorClass = 'bg-yellow'; }
        if (act.includes('assigned')) { icon = 'fa-user-pen'; colorClass = 'bg-blue'; }
        if (act.includes('deleted') || act.includes('removed')) { icon = 'fa-trash'; colorClass = 'bg-red'; }

        container.innerHTML += `
            <div class="timeline-item">
                <div class="timeline-icon ${colorClass}">
                    <i class="fa-solid ${icon}"></i>
                </div>
                <div class="timeline-content">
                    <div class="timeline-text">
                        <strong>${a.userName}</strong> • ${a.action}
                        ${a.projectTitle ? `<span>${a.projectTitle}</span>` : ''}
                    </div>
                    <div class="timeline-time">${timeAgo}</div>
                </div>
            </div>
        `;
    });
}
