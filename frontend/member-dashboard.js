// ===== MEMBER DASHBOARD LOGIC =====

document.addEventListener('DOMContentLoaded', initMemberDashboard);

let allActivities = [];
let allDeadlines = [];
let isActivityExpanded = false;
let isDeadlinesExpanded = false;


async function initMemberDashboard() {
    // 1. Role Check (Allow Admin to view)
    const user = handleDashboardAccess('member', true);
    if (!user) return;

    // 2. UI Setup (Common elements handled by app.js)
    const welcomeName = document.getElementById("welcome-name");
    if (welcomeName) welcomeName.innerText = user.name;

    if (user.role === 'admin') {
        const adminBtnContainer = document.getElementById('admin-view-btn-container');
        if (adminBtnContainer) adminBtnContainer.style.display = 'block';
    }

    // 3. Navigation Bindings
    setupNavigation();
    setupInteractions();

    // Admin View Toggle (Member dashboard specific)
    const btnAdminView = document.getElementById('btnAdminView');
    if (btnAdminView) {
        btnAdminView.addEventListener('click', () => {
            window.location.href = 'admin-dashboard.html';
        });
    }

    // 4. Load Data
    loadMemberStats();
    loadPerformance(); // Shared
    fetchUpcomingDeadlines();
    loadMemberActivity();
}

function setupInteractions() {
    // 2. Chart Filters
    document.getElementById('projectStatsFilter')?.addEventListener('change', async (e) => {
        const data = await apiGet('/api/dashboard');
        if (data) renderProjectStatsChart(data);
    });

    document.getElementById('performanceFilter')?.addEventListener('change', async (e) => {
        await loadPerformance();
    });

    // 3. Search
    const searchInput = document.querySelector('.search');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            renderActivityLog();
            renderDeadlines();
        });
    }

    // 4. View More Buttons
    document.getElementById('viewMoreActivityBtn')?.addEventListener('click', toggleActivityView);
    document.getElementById('viewMoreDeadlinesBtn')?.addEventListener('click', toggleDeadlinesView);
}




async function loadMemberStats() {
    const data = await apiGet('/api/dashboard');
    if (!data) return;

    // Populate Stats
    animateValue("myProjects", data.joinedProjects || data.totalProjects || 0);
    animateValue("myTasks", data.assignedTasks || data.totalTasks || 0);
    animateValue("myCompleted", data.completedTasks || 0);
    animateValue("teamSize", data.totalUsers || 0);

    // Render Project Stats Chart (Shared)
    renderProjectStatsChart(data);
}



// 3. Upcoming Deadlines
async function fetchUpcomingDeadlines() {
    allDeadlines = await apiGet('/api/dashboard/deadlines') || [];
    renderDeadlines();
}

function renderDeadlines() {
    const container = document.getElementById('deadline-list');
    if (!container) return;

    const searchInput = document.querySelector('.search');
    const q = searchInput ? searchInput.value.toLowerCase().trim() : '';

    let data = allDeadlines || [];

    if (q !== '') {
        data = data.filter(t =>
            (t.title && t.title.toLowerCase().includes(q)) ||
            (t.projectTitle && t.projectTitle.toLowerCase().includes(q))
        );
        data = sortSearchResults(data, q, ['title', 'projectTitle']);
    }

    container.innerHTML = "";

    if (!data || data.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:30px 10px; color:#94a3b8;">
                <i class="fa-solid fa-calendar-check" style="font-size:30px; margin-bottom:10px; display:block; opacity:0.3;"></i>
                <p style="margin:0; font-size:13px;">${q !== '' ? 'No matches' : 'No upcoming deadlines'}</p>
            </div>`;
        return;
    }

    const limit = isDeadlinesExpanded ? data.length : 5;
    const displayDeadlines = data.slice(0, limit);

    displayDeadlines.forEach((t, index) => {
        let dotColor = '#10b981';
        let badgeBg = '#dcfce7';
        let badgeColor = '#15803d';
        let remaining = t.remaining;

        if (remaining.toLowerCase().includes('today') || remaining.toLowerCase().includes('overdue')) {
            dotColor = '#ef4444';
            badgeBg = '#fee2e2';
            badgeColor = '#ef4444';
        } else if (remaining.toLowerCase().includes('tomorrow') || remaining.includes('1 Day')) {
            dotColor = '#f97316';
            badgeBg = '#fff7ed';
            badgeColor = '#f97316';
        }

        container.innerHTML += `
            <div class="deadline-item-modern reveal" style="animation-delay: ${index * 60}ms;">
                <div class="deadline-dot-glow" style="background:${dotColor};"></div>
                <div class="timeline-content" style="padding:0; flex:1;">
                    <div style="display:flex; justify-content:space-between; align-items:start; gap:10px;">
                        <div style="flex:1;">
                            <div style="font-weight:700; font-size:14px; color:#1e293b; margin-bottom:2px;">${t.title}</div>
                            <div style="font-size:11px; color:#64748b; display:flex; align-items:center; gap:5px; opacity:0.75;">
                                <i class="fa-regular fa-folder" style="font-size:10px;"></i> ${t.projectTitle}
                            </div>
                        </div>
                        <div style="text-align:right;">
                            <div class="deadline-badge-modern" style="background:${badgeBg}; color:${badgeColor}; border: 1px solid ${badgeColor}15; min-width: 75px; text-align: center;">
                                ${remaining}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    const btn = document.getElementById('viewMoreDeadlinesBtn');
    if (btn) {
        btn.style.display = allDeadlines.length <= 5 ? 'none' : 'inline-block';
        btn.innerHTML = isDeadlinesExpanded
            ? 'Show Less <i class="fa-solid fa-chevron-up"></i>'
            : `View All ${allDeadlines.length} Deadlines <i class="fa-solid fa-chevron-down"></i>`;
    }
}

async function loadMemberActivity() {
    allActivities = await apiGet('/api/dashboard/activity') || [];
    renderActivityLog();
}

function getActivityMeta(actionText) {
    const act = (actionText || '').toLowerCase();

    if (act.includes('created task') || act.includes('added task')) {
        return { icon: 'fa-tasks', bg: '#10b981', badge: 'Task Created', badgeColor: '#10b981' };
    }
    if (act.includes('completed task') || act.includes('finished task')) {
        return { icon: 'fa-check-circle', bg: '#10b981', badge: 'Completed', badgeColor: '#10b981' };
    }
    if (act.includes('updated task status')) {
        return { icon: 'fa-arrows-rotate', bg: '#3b82f6', badge: 'Status Update', badgeColor: '#3b82f6' };
    }
    if (act.includes('updated task priority')) {
        return { icon: 'fa-flag', bg: '#f59e0b', badge: 'Priority Set', badgeColor: '#f59e0b' };
    }
    if (act.includes('assigned task')) {
        return { icon: 'fa-user-check', bg: '#06b6d4', badge: 'Assigned', badgeColor: '#06b6d4' };
    }
    if (act.includes('created project')) {
        return { icon: 'fa-folder-plus', bg: '#f97316', badge: 'New Project', badgeColor: '#f97316' };
    }
    if (act.includes('added member')) {
        return { icon: 'fa-user-plus', bg: '#6366f1', badge: 'Member Added', badgeColor: '#6366f1' };
    }
    if (act.includes('uploaded file') || act.includes('added attachment')) {
        return { icon: 'fa-file-arrow-up', bg: '#6366f1', badge: 'File Upload', badgeColor: '#6366f1' };
    }
    if (act.includes('commented on file') || act.includes('added comment')) {
        return { icon: 'fa-comment-dots', bg: '#8b5cf6', badge: 'File Comment', badgeColor: '#8b5cf6' };
    }
    if (act.includes('scheduled meeting') || act.includes('scheduled a meeting')) {
        return { icon: 'fa-calendar-plus', bg: '#f59e0b', badge: 'Meeting Set', badgeColor: '#f59e0b' };
    }
    // Default
    return { icon: 'fa-circle-dot', bg: '#64748b', badge: 'Activity', badgeColor: '#64748b' };
}

function renderActivityLog() {
    const container = document.getElementById('activity-list');
    if (!container) return;

    const searchInput = document.querySelector('.search');
    const q = searchInput ? searchInput.value.toLowerCase().trim() : '';

    let data = allActivities || [];

    if (q !== '') {
        data = data.filter(a =>
            (a.action && a.action.toLowerCase().includes(q)) ||
            (a.userName && a.userName.toLowerCase().includes(q)) ||
            (a.projectTitle && a.projectTitle.toLowerCase().includes(q))
        );
        data = sortSearchResults(data, q, ['userName', 'action', 'projectTitle']);
    }

    container.innerHTML = "";
    if (data.length === 0) {
        container.innerHTML = `<p style="text-align:center; padding: 40px 20px; color:#94a3b8;">${q !== '' ? 'No matches' : 'No recent activity.'}</p>`;
        return;
    }

    const limit = isActivityExpanded ? data.length : 5;
    const displayActivities = data.slice(0, limit);

    let html = "";
    displayActivities.forEach((a, index) => {
        const timeAgo = getTimeAgo(new Date(a.created_at));
        const absDate = new Date(a.created_at).toLocaleString('en-US', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
        const { icon, bg, badge, badgeColor } = getActivityMeta(a.action);
        const initial = a.userName ? a.userName.charAt(0).toUpperCase() : 'S';

        html += `
            <div class="activity-item reveal" style="animation-delay: ${index * 60}ms; display: flex; gap: 16px; margin-bottom: 12px; padding: 16px; background: white; border-radius: 12px; border: 1px solid #f1f5f9; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02); transition: all 0.2s ease;">
                <!-- Left: Colored Icon -->
                <div style="
                    width: 40px; height: 40px; min-width: 40px;
                    border-radius: 12px;
                    background: ${bg}18;
                    border: 1.5px solid ${bg}40;
                    display: flex; align-items: center; justify-content: center;
                    color: ${bg}; font-size: 15px;
                ">
                    <i class="fa-solid ${icon}"></i>
                </div>

                <!-- Middle: Content -->
                <div style="flex: 1; min-width: 0;">
                    <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 4px;">
                        <div style="
                            width: 22px; height: 22px; border-radius: 6px;
                            background: ${bg}; color: white;
                            font-size: 11px; font-weight: 700;
                            display: inline-flex; align-items: center; justify-content: center;
                            flex-shrink: 0;
                        ">${initial}</div>
                        <span style="font-weight: 600; font-size: 13px; color: #1e293b;">${a.userName || 'System'}</span>
                        <span style="
                            font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;
                            padding: 2px 8px; border-radius: 20px;
                            background: ${badgeColor}15; color: ${badgeColor}; border: 1px solid ${badgeColor}30;
                        ">${badge}</span>
                    </div>
                    <div style="font-size: 13px; color: #475569; line-height: 1.4; word-break: break-word;">
                        ${a.action}
                        ${a.projectTitle ? `<span style="
                            display: inline-flex; align-items: center; gap: 4px;
                            margin-left: 5px; font-size: 11px; color: #6366f1;
                            background: #eef2ff; padding: 1px 7px; border-radius: 20px;
                        "><i class="fa-regular fa-folder" style="font-size:10px;"></i> ${a.projectTitle}</span>` : ''}
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px; border-top: 1px solid #f1f5f9; padding-top: 6px;">
                         <span style="font-size: 11px; font-weight: 600; color: #94a3b8;">${timeAgo}</span>
                         <span style="font-size: 10px; color: #cbd5e1;" title="${absDate}">${absDate}</span>
                    </div>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;

    const btn = document.getElementById('viewMoreActivityBtn');
    if (btn) {
        btn.style.display = allActivities.length <= 5 ? 'none' : 'inline-block';
        btn.innerHTML = isActivityExpanded ? 'Show Less <i class="fa-solid fa-chevron-up"></i>' : 'View More <i class="fa-solid fa-chevron-down"></i>';
    }
}

function toggleActivityView() {
    isActivityExpanded = !isActivityExpanded;
    renderActivityLog();
}

function toggleDeadlinesView() {
    isDeadlinesExpanded = !isDeadlinesExpanded;
    renderDeadlines();
}
