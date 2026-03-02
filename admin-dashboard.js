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
    document.getElementById("user-avatar").innerText = user.name.charAt(0).toUpperCase();

    // 3. Navigation & Interactions
    setupNavigation();
    setupInteractions();

    // 4. Load Data
    loadAdminStats();
    loadPerformance(); // From dashboard-common.js
    fetchUserGrowth();
    fetchMembersForGrid('/api/users');
    loadAdminActivity();
}

function setupNavigation() {
    // Navigation
    const navDashboard = document.getElementById('navDashboard');
    const navProjects = document.getElementById('navProjects');
    const navUsers = document.getElementById('navUsers');
    const navLogout = document.getElementById('navLogout');

    if (navDashboard) navDashboard.addEventListener('click', () => {
        window.location.href = 'admin-dashboard.html';
    });

    if (navProjects) navProjects.addEventListener('click', () => {
        window.location.href = 'project.html';
    });

    if (navUsers) navUsers.addEventListener('click', () => {
        window.location.href = 'users.html';
    });

    if (navLogout) navLogout.addEventListener('click', logout);

    // Logo
    document.querySelector('.logo')?.addEventListener('click', () => window.location.href = 'index.html');
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
    }

    // 2. Notification
    const notifBtn = document.getElementById('notifBtn');
    if (notifBtn) {
        notifBtn.addEventListener('click', () => {
            alert("No new notifications"); // Placeholder for now
        });
    }

    // 3. Team Filters
    const filterContainer = document.getElementById('teamFilters');
    if (filterContainer) {
        filterContainer.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') {
                // UI Update
                filterContainer.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
                e.target.classList.add('active');

                // Logic
                const filter = e.target.getAttribute('data-filter');
                filterMembers(filter);
            }
        });
    }

    // 4. Chart Filters
    const projectFilter = document.getElementById('projectStatsFilter');
    if (projectFilter) {
        projectFilter.addEventListener('change', () => {
            console.log("Project filter changed:", projectFilter.value);
        });
    }

    const perfFilter = document.getElementById('performanceFilter');
    if (perfFilter) {
        perfFilter.addEventListener('change', () => {
            console.log("Performance filter changed:", perfFilter.value);
        });
    }

    // 5. View More Buttons
    document.getElementById('viewMoreActivityBtn')?.addEventListener('click', toggleActivityView);
    document.getElementById('viewMoreMembersBtn')?.addEventListener('click', toggleMembersView);
}

function handleSearch(query) {
    if (!query) {
        // Reset or Reload
        fetchMembersForGrid('/api/users');
        return;
    }

    // Filter Members
    const lowerQ = query.toLowerCase();
    const filteredMembers = allMembers.filter(m =>
        m.name.toLowerCase().includes(lowerQ) ||
        m.email.toLowerCase().includes(lowerQ) ||
        (m.role && m.role.toLowerCase().includes(lowerQ))
    );
    renderMembers(filteredMembers);
}

async function loadAdminStats() {
    try {
        const data = await apiGet('/api/dashboard');
        if (!data) return;

        // Populate Stats
        setText("totalProjects", data.totalProjects || 0);
        setText("totalTasks", data.totalTasks || 0);
        setText("completedTasks", data.completedTasks || 0);
        setText("totalMembers", data.totalUsers || 0);

        // Populate Priority Stats
        setText("highPriorityTasks", data.highPriorityTasks || 0);
        setText("mediumPriorityTasks", data.mediumPriorityTasks || 0);
        setText("lowPriorityTasks", data.lowPriorityTasks || 0);
        setText("overdueTasks", data.overdueTasks || 0);

        // Render Project Stats Chart (Shared)
        renderProjectStatsChart(data);

    } catch (error) {
        console.error("Admin stats error:", error);
    }
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.innerText = value;
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

    const existingChart = Chart.getChart("userGrowthChart");
    if (existingChart) existingChart.destroy();

    // Theme Colors
    new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'New Users',
                data: data.data,
                backgroundColor: '#6366f1',
                borderRadius: 4,
                barThickness: 20
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { display: true, borderDash: [2, 2], drawBorder: false },
                    ticks: { precision: 0, font: { size: 10 } }
                },
                x: {
                    grid: { display: false },
                    ticks: { font: { size: 10 } }
                }
            },
            plugins: { legend: { display: false } }
        }
    });
}

// 4. Members Grid (Compact)
async function fetchMembersForGrid(endpoint) {
    const members = await apiGet(endpoint);
    if (!members) return;

    allMembers = members; // Store for filtering

    if (document.getElementById('total-members-count-2'))
        document.getElementById('total-members-count-2').innerText = members.length;

    renderMembers(members);
}

function filterMembers(role) {
    if (role === 'all') {
        renderMembers(allMembers);
        return;
    }
    // Simple substring match for role
    const filtered = allMembers.filter(m => m.role && m.role.toLowerCase().includes(role.toLowerCase()));
    renderMembers(filtered);
}

function toggleMembersView() {
    isMembersExpanded = !isMembersExpanded;
    const activeChip = document.querySelector('#teamFilters .chip.active');
    const filter = activeChip ? activeChip.getAttribute('data-filter') : 'all';
    filterMembers(filter);

    const btn = document.getElementById('viewMoreMembersBtn');
    if (btn) btn.innerHTML = isMembersExpanded ? 'Show Less <i class="fa-solid fa-chevron-up"></i>' : 'View More <i class="fa-solid fa-chevron-down"></i>';
}

function renderMembers(members) {
    const container = document.getElementById('members-grid-container');
    if (!container) return;

    container.innerHTML = "";
    const colors = ['#f87171', '#fbbf24', '#34d399', '#60a5fa', '#818cf8'];

    const limit = isMembersExpanded ? members.length : 5;
    const displayMembers = members.slice(0, limit);

    if (members.length === 0) {
        container.innerHTML = '<p class="text-sm text-gray-500">No members found</p>';
        return;
    }

    displayMembers.forEach((m, index) => {
        const color = colors[index % colors.length];
        const init = m.name ? m.name.charAt(0).toUpperCase() : '?';
        container.innerHTML += `
            <div class="member-card-compact">
                <div class="member-avatar-md" style="background:${color};">${init}</div>
                <div>
                    <div class="member-name-sm">${m.name || 'Unknown'}</div>
                    <div class="member-role-sm">${m.role || 'Member'}</div>
                </div>
            </div>
        `;
    });

    const btn = document.getElementById('viewMoreMembersBtn');
    if (btn) {
        btn.style.display = members.length <= 5 ? 'none' : 'inline-block';
        btn.innerHTML = isMembersExpanded ? 'Show Less <i class="fa-solid fa-chevron-up"></i>' : 'View More <i class="fa-solid fa-chevron-down"></i>';
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

function renderActivityLog() {
    const container = document.getElementById('activity-list');
    if (!container) return;

    container.innerHTML = "";

    if (!allActivities || allActivities.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#94a3b8;">No recent activity.</p>';
        return;
    }

    const limit = isActivityExpanded ? allActivities.length : 5;
    const displayActivities = allActivities.slice(0, limit);

    displayActivities.forEach(a => {
        const timeAgo = getTimeAgo(new Date(a.created_at));

        let icon = 'fa-user';
        let colorClass = 'bg-blue';
        const act = a.action ? a.action.toLowerCase() : '';

        if (act.includes('created')) { icon = 'fa-plus'; colorClass = 'bg-green'; }
        if (act.includes('login')) { icon = 'fa-arrow-right-to-bracket'; colorClass = 'bg-purple'; }
        if (act.includes('project')) { icon = 'fa-folder'; colorClass = 'bg-orange'; }

        container.innerHTML += `
            <div class="timeline-item">
                <div class="timeline-icon ${colorClass}">
                    <i class="fa-solid ${icon}"></i>
                </div>
                <div class="timeline-content">
                    <div class="timeline-text">
                        <strong>${a.userName || 'System'}</strong> • ${a.action}
                        ${a.projectTitle ? `<span>${a.projectTitle}</span>` : ''}
                    </div>
                    <div class="timeline-time">${timeAgo}</div>
                </div>
            </div>
        `;
    });

    const btn = document.getElementById('viewMoreActivityBtn');
    if (btn) {
        btn.style.display = allActivities.length <= 5 ? 'none' : 'inline-block';
        btn.innerHTML = isActivityExpanded ? 'Show Less <i class="fa-solid fa-chevron-up"></i>' : 'View More <i class="fa-solid fa-chevron-down"></i>';
    }
}
