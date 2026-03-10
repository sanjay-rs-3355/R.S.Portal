// ===== ADMIN DASHBOARD LOGIC =====

document.addEventListener('DOMContentLoaded', initAdminDashboard);

// Global Data Storage for filtering
let allMembers = [];
let allActivities = [];
let isMembersExpanded = false;
let isActivityExpanded = false;


async function initAdminDashboard() {
    // 1. Role Check
    const user = handleDashboardAccess('admin');
    if (!user) return;

    // 2. Setup UI
    document.getElementById("username-display").innerText = user.name;
    const welcomeName = document.getElementById("welcome-name");
    if (welcomeName) welcomeName.innerText = user.name;
    document.getElementById("user-avatar").innerText = user.name.charAt(0).toUpperCase();

    // 3. Live date in welcome banner
    const dashDate = document.getElementById('dash-date');
    if (dashDate) {
        const now = new Date();
        const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
        const dateFull = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        dashDate.innerHTML = `<div style="font-size:11px; opacity:0.75; margin-bottom:2px;">${dayName}</div>${dateFull}`;
    }

    // 4. Navigation & Interactions
    setupNavigation();
    setupInteractions();

    const navUsers = document.getElementById('navUsers');
    if (navUsers) navUsers.style.display = 'block';

    // 5. Load Data
    loadAdminStats();
    loadPerformance(); // From dashboard-common.js
    fetchUserGrowth();
    fetchMembersForGrid('/api/users');
    loadAdminActivity();
}



function setupInteractions() {
    // 1. Search (Debounced)
    const searchInput = document.getElementById('globalSearch');
    let timeout = null;
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => handleSearch(e.target.value), 300);
        });
        // 3. Team Search & Sort
        const teamSearchInput = document.getElementById('teamSearchInput');
        if (teamSearchInput) {
            teamSearchInput.addEventListener('input', (e) => {
                applyTeamFilters();
            });
        }
        const teamSortSelect = document.getElementById('teamSortSelect');
        if (teamSortSelect) {
            teamSortSelect.addEventListener('change', () => {
                applyTeamFilters();
            });
        }

        // 4. Team Role Filters
        const filterContainer = document.getElementById('teamFilters');
        if (filterContainer) {
            filterContainer.addEventListener('click', (e) => {
                if (e.target.tagName === 'BUTTON') {
                    // UI Update
                    filterContainer.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
                    e.target.classList.add('active');

                    // Logic
                    applyTeamFilters();
                }
            });
        }

        // 5. Chart Filters
        document.getElementById('projectStatsFilter')?.addEventListener('change', async (e) => {
            const data = await apiGet('/api/dashboard');
            if (data) renderProjectStatsChart(data);
        });

        document.getElementById('performanceFilter')?.addEventListener('change', async (e) => {
            await loadPerformance();
        });

        // 6. View More Buttons
        document.getElementById('viewMoreActivityBtn')?.addEventListener('click', toggleActivityView);

        const viewMoreMembersBtn = document.getElementById('viewMoreMembersBtn');
        if (viewMoreMembersBtn) {
            viewMoreMembersBtn.addEventListener('click', toggleMembersView);
        }

        // 7. Team Filter Horizontal Scroll
        initTeamFilterScroll();
    }


}


function handleSearch(query) {
    if (!query) {
        // Reset or Reload
        fetchMembersForGrid('/api/users');
        return;
    }

    // Filter Members
    const q = query.toLowerCase().trim();
    if (q === '') {
        renderMembers(allMembers);
        return;
    }

    let filteredMembers = allMembers.filter(m =>
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        (m.role && m.role.toLowerCase().includes(q)) ||
        String(m.id || '').toLowerCase().includes(q) ||
        String(m._id || '').toLowerCase().includes(q)
    );

    filteredMembers = sortSearchResults(filteredMembers, q, ['name', 'email', 'id', '_id']);
    renderMembers(filteredMembers);
}

async function loadAdminStats() {
    const containers = document.querySelectorAll('.stat-card-premium');
    containers.forEach(c => c.classList.add('skeleton'));
    try {
        const data = await apiGet('/api/dashboard');
        containers.forEach(c => c.classList.remove('skeleton'));
        if (!data) return;

        // Populate Stats
        animateValue("totalProjects", data.totalProjects || 0);
        animateValue("totalTasks", data.totalTasks || 0);
        animateValue("completedTasks", data.completedTasks || 0);
        animateValue("totalMembers", data.totalUsers || 0);

        // Populate Priority Stats
        animateValue("highPriorityTasks", data.highPriorityTasks || 0);
        animateValue("mediumPriorityTasks", data.mediumPriorityTasks || 0);
        animateValue("lowPriorityTasks", data.lowPriorityTasks || 0);
        animateValue("overdueTasks", data.overdueTasks || 0);

        // Render Project Stats Chart (Shared)
        renderProjectStatsChart(data);

    } catch (error) {
        console.error("Admin stats error:", error);
    }
}



// 3. User Growth Chart (Bar)
async function fetchUserGrowth() {
    const data = await apiGet('/api/dashboard/user-growth');
    if (data) {
        renderUserGrowthChart(data);
    }
}

function renderUserGrowthChart(data) {
    const ctx = document.getElementById('userGrowthChart');
    if (!ctx) return;

    const existingChart = Chart.getChart('userGrowthChart');
    if (existingChart) existingChart.destroy();

    const context = ctx.getContext('2d');

    // Vertical gradient for bars
    const gradBar = context.createLinearGradient(0, 0, 0, 220);
    gradBar.addColorStop(0, '#6366f1');
    gradBar.addColorStop(1, '#818cf8');

    new Chart(context, {
        type: 'bar',
        data: {
            labels: data.labels || [],
            datasets: [{
                label: 'New Users',
                data: data.data || [],
                backgroundColor: gradBar,
                hoverBackgroundColor: '#4f46e5',
                borderRadius: { topLeft: 8, topRight: 8 },
                borderSkipped: false,
                barThickness: 'flex',
                maxBarThickness: 32
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 900, easing: 'easeInOutQuart' },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(148, 163, 184, 0.12)',
                        drawBorder: false
                    },
                    border: { dash: [4, 4], display: false },
                    ticks: {
                        precision: 0,
                        font: { size: 11 },
                        padding: 8
                    }
                },
                x: {
                    grid: { display: false },
                    border: { display: false },
                    ticks: { font: { size: 11 }, maxRotation: 0 }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#1e293b',
                    titleColor: '#f8fafc',
                    bodyColor: '#cbd5e1',
                    padding: 12,
                    cornerRadius: 10,
                    callbacks: {
                        title: (items) => items[0].label,
                        label: (item) => `  ${item.parsed.y} new user${item.parsed.y !== 1 ? 's' : ''}`
                    }
                }
            }
        }
    });
}

// 4. Members Grid (Compact)
async function fetchMembersForGrid(endpoint) {
    const members = await apiGet(endpoint);
    if (!members) return;

    allMembers = members; // Store for filtering

    renderRoleFilters(members);

    if (document.getElementById('total-members-count-2'))
        document.getElementById('total-members-count-2').innerText = members.length;

    applyTeamFilters();
}

function renderRoleFilters(members) {
    const filterContainer = document.getElementById('teamFilters');
    if (!filterContainer) return;

    // Extract unique designations
    const designations = new Set();
    members.forEach(m => {
        if (m.designation) designations.add(m.designation.trim());
    });

    // Start with "All"
    let html = '<button class="chip active" data-filter="all">All</button>';

    // Sort and add other designations
    Array.from(designations).sort().forEach(d => {
        html += `<button class="chip" data-filter="${d}">${d}</button>`;
    });

    filterContainer.innerHTML = html;

    // Staggered Entry for Profile handled by HTML classes
    initScrollReveal();
    updateTeamScrollButtons();
}

function initTeamFilterScroll() {
    const container = document.getElementById('teamFilters');
    const leftBtn = document.getElementById('scrollLeftTeam');
    const rightBtn = document.getElementById('scrollRightTeam');

    if (!container || !leftBtn || !rightBtn) return;

    leftBtn.onclick = () => {
        container.scrollBy({ left: -200, behavior: 'smooth' });
    };

    rightBtn.onclick = () => {
        container.scrollBy({ left: 200, behavior: 'smooth' });
    };

    container.onscroll = updateTeamScrollButtons;
    window.addEventListener('resize', updateTeamScrollButtons);
}

function updateTeamScrollButtons() {
    const container = document.getElementById('teamFilters');
    const leftBtn = document.getElementById('scrollLeftTeam');
    const rightBtn = document.getElementById('scrollRightTeam');

    if (!container || !leftBtn || !rightBtn) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;

    // Show left button if we've scrolled right
    leftBtn.style.display = scrollLeft > 5 ? 'flex' : 'none';

    // Show right button if there's more content to the right
    rightBtn.style.display = (scrollWidth - scrollLeft - clientWidth) > 5 ? 'flex' : 'none';
}

function applyTeamFilters() {
    const searchInput = document.getElementById('teamSearchInput');
    const sortSelect = document.getElementById('teamSortSelect');
    const roleChip = document.querySelector('#teamFilters .chip.active');

    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const sortBy = sortSelect ? sortSelect.value : 'name-asc';
    const roleFilter = roleChip ? roleChip.getAttribute('data-filter') : 'all';

    let filtered = [...allMembers];

    // 1. Role Filter
    if (roleFilter !== 'all') {
        filtered = filtered.filter(m => m.designation === roleFilter);
    }

    // 2. Search Query
    if (query) {
        filtered = filtered.filter(m =>
            m.name.toLowerCase().includes(query) ||
            (m.email && m.email.toLowerCase().includes(query)) ||
            (m.designation && m.designation.toLowerCase().includes(query))
        );
        filtered = sortSearchResults(filtered, query, ['name', 'email', 'designation']);
    }

    // 3. Sort Logic (if not already sorted by sortSearchResults)
    if (!query) {
        filtered.sort((a, b) => {
            if (sortBy === 'name-asc') return (a.name || '').localeCompare(b.name || '');
            if (sortBy === 'name-desc') return (b.name || '').localeCompare(a.name || '');
            if (sortBy === 'designation-asc') return (a.designation || '').localeCompare(b.designation || '');
            return 0;
        });
    }

    renderMembers(filtered);
}

function toggleMembersView() {
    isMembersExpanded = !isMembersExpanded;
    applyTeamFilters();

    const btn = document.getElementById('viewMoreMembersBtn');
    if (btn) btn.innerHTML = isMembersExpanded ? 'Show Less <i class="fa-solid fa-chevron-up"></i>' : 'View More <i class="fa-solid fa-chevron-down"></i>';
}

function renderMembers(members) {
    const container = document.getElementById('members-grid-container');
    if (!container) return;

    container.innerHTML = "";

    // Use the same avatar coloring as project cards for consistency
    const getAvatarColor = (name) => {
        const colors = ['#6366f1', '#8b5cf6', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#f97316', '#ef4444'];
        let hash = 0;
        for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
        return colors[Math.abs(hash) % colors.length];
    };

    const limit = 6;
    const hasMore = members.length > limit;
    const displayMembers = isMembersExpanded ? members : members.slice(0, limit);

    if (members.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; color: #94a3b8; background: #f8fafc; border-radius: 20px; border: 1.5px dashed #e2e8f0;">
                <i class="fa-solid fa-users-slash" style="font-size: 32px; margin-bottom: 12px; opacity: 0.5;"></i>
                <p style="margin: 0; font-size: 14px; font-weight: 500;">No members match your criteria</p>
            </div>`;
        const btn = document.getElementById('viewMoreMembersBtn');
        if (btn) btn.style.display = 'none';
        return;
    }

    let html = "";
    displayMembers.forEach((m, index) => {
        const name = m.name || 'Unknown User';
        const color = getAvatarColor(name);
        const init = name.charAt(0).toUpperCase();
        const designation = m.designation || 'Team Member';

        html += `
            <div class="member-card-compact reveal" style="animation-delay: ${index * 60}ms;">
                <div class="member-avatar-md" style="background: linear-gradient(135deg, ${color}, ${color}dd); box-shadow: 0 4px 12px ${color}40;">
                    ${init}
                </div>
                <div style="flex: 1; min-width: 0;">
                    <div class="member-name-sm" title="${escapeHTML(name)}">${escapeHTML(name)}</div>
                    <div class="member-role-sm" style="display: flex; align-items: center; gap: 4px;">
                        <span style="width: 6px; height: 6px; border-radius: 50%; background: #10b981;"></span>
                        ${escapeHTML(designation)}
                    </div>
                </div>
                <div class="member-action-hint">
                    <i class="fa-solid fa-chevron-right"></i>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;

    // View More Button logic
    const btn = document.getElementById('viewMoreMembersBtn');
    if (btn) {
        btn.style.display = hasMore ? 'inline-flex' : 'none';
        btn.innerHTML = isMembersExpanded
            ? 'Show Less <i class="fa-solid fa-chevron-up" style="margin-left:8px;"></i>'
            : `View All ${members.length} <i class="fa-solid fa-chevron-right" style="margin-left:8px;"></i>`;

        // Update its class to match the premium icon style if not already
        btn.className = "btn-text-sm";
        btn.style.marginTop = "15px";
        btn.style.width = "100%";
        btn.style.display = hasMore ? "flex" : "none";
        btn.style.justifyContent = "center";
        btn.style.padding = "10px 0";
        btn.style.borderTop = "1px solid #f1f5f9";
    }
}

// 5. Activity Log
async function loadAdminActivity() {
    const activities = await apiGet('/api/dashboard/activity');
    if (!activities) return;

    allActivities = activities;
    renderActivityLog();
}

function toggleActivityView() {
    isActivityExpanded = !isActivityExpanded;
    renderActivityLog();
}

function getActivityMeta(action) {
    const act = (action || '').toLowerCase();

    if (act.includes('logged in') || act.includes('login')) {
        return { icon: 'fa-arrow-right-to-bracket', bg: '#8b5cf6', badge: 'Login', badgeColor: '#8b5cf6' };
    }
    if (act.includes('created task') || act.includes('create task')) {
        return { icon: 'fa-plus-circle', bg: '#10b981', badge: 'Task Created', badgeColor: '#10b981' };
    }
    if (act.includes('deleted task') || act.includes('delete task')) {
        return { icon: 'fa-trash', bg: '#ef4444', badge: 'Task Deleted', badgeColor: '#ef4444' };
    }
    if (act.includes('updated task status')) {
        return { icon: 'fa-rotate', bg: '#3b82f6', badge: 'Status Update', badgeColor: '#3b82f6' };
    }
    if (act.includes('updated task priority')) {
        return { icon: 'fa-flag', bg: '#f59e0b', badge: 'Priority Set', badgeColor: '#f59e0b' };
    }
    if (act.includes('assigned task')) {
        return { icon: 'fa-user-check', bg: '#06b6d4', badge: 'Assigned', badgeColor: '#06b6d4' };
    }
    if (act.includes('created a new project') || act.includes('created project')) {
        return { icon: 'fa-folder-plus', bg: '#f97316', badge: 'New Project', badgeColor: '#f97316' };
    }
    if (act.includes('added member')) {
        return { icon: 'fa-user-plus', bg: '#6366f1', badge: 'Member Added', badgeColor: '#6366f1' };
    }
    if (act.includes('removed member')) {
        return { icon: 'fa-user-minus', bg: '#f43f5e', badge: 'Member Removed', badgeColor: '#f43f5e' };
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

    container.innerHTML = '';

    if (!allActivities || allActivities.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding: 40px 20px; color:#94a3b8;">
                <i class="fa-solid fa-clipboard-list" style="font-size:36px; margin-bottom:10px; display:block; opacity:0.4;"></i>
                <p style="margin:0; font-size:14px;">No recent activity to display.</p>
            </div>`;
        return;
    }

    const limit = isActivityExpanded ? allActivities.length : 5;
    const displayActivities = allActivities.slice(0, limit);

    let html = "";
    displayActivities.forEach((a, index) => {
        const timeAgo = getTimeAgo(new Date(a.created_at));
        const absDate = new Date(a.created_at).toLocaleString('en-US', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
        const { icon, bg, badge, badgeColor } = getActivityMeta(a.action);
        const initial = a.userName ? a.userName.charAt(0).toUpperCase() : 'S';

        html += `
            <div class="activity-item reveal" style="animation-delay: ${index * 60}ms;">
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
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px; border-top: 1px solid #f1f5f9; pt: 6px;">
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
        btn.innerHTML = isActivityExpanded
            ? 'Show Less <i class="fa-solid fa-chevron-up"></i>'
            : `View All ${allActivities.length} Activities <i class="fa-solid fa-chevron-down"></i>`;
    }
}
