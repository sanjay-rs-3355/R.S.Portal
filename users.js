// ===== USER MANAGEMENT LOGIC =====

document.addEventListener('DOMContentLoaded', initUsersPage);

let allUsers = [];
let currentRoleFilter = 'All';
let pagination = {
    currentPage: 1,
    pageSize: 10,
    totalPages: 1,
    filteredCount: 0,
    sortBy: 'id-asc'
};

async function initUsersPage() {
    try {
        const user = handleDashboardAccess('admin');
        if (!user) return;

        setupNavigation();
        setupTopbar();

        document.getElementById('userListSearch')?.addEventListener('input', applyFilters);

        loadAllUsers();
    } catch (error) {
        console.error("Users Initialization Error:", error);
        const subtitle = document.getElementById('user-count-subtitle');
        if (subtitle) subtitle.innerText = "Error loading users. Please refresh.";
    }
}

async function loadAllUsers() {
    try {
        const users = await apiGet('/api/users');
        if (!users) return;
        allUsers = users;

        const subtitle = document.getElementById('user-count-subtitle');
        if (subtitle) subtitle.innerText = `${users.length} users found`;

        applyFilters();
    } catch (e) {
        console.error("Load Users Error:", e);
        showToast('Failed to load users', 'error');
    }
}

function renderUsersTable(users) {
    const container = document.getElementById("users-grid");
    if (!container) return;
    container.innerHTML = "";

    if (users.length === 0) {
        container.innerHTML = `
            <div style="padding: 60px 0; text-align: center; width: 100%; grid-column: 1 / -1; background: rgba(255,255,255,0.4); backdrop-filter: blur(10px); border-radius: 20px; border: 1px dashed rgba(99, 102, 241, 0.3);">
                <div style="font-size: 40px; color: #cbd5e1; margin-bottom: 10px;"><i class="fa-solid fa-users-slash"></i></div>
                <p style="color: #64748b; font-size: 16px;">No users found matching current filters.</p>
            </div>`;
        return;
    }

    const colors = ['#f87171', '#fbbf24', '#34d399', '#60a5fa', '#818cf8', '#a78bfa', '#f472b6'];

    users.forEach((u, index) => {
        const color = colors[index % colors.length];
        const name = u.name || "Unknown";
        const email = u.email || "No email";
        const role = u.role || "member";
        const designation = u.designation || "Member";
        const joinedDate = u.created_at ? new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'N/A';
        const status = (u.status || 'active').toLowerCase();
        const statusClass = status === 'active' ? 'status-active' : 'status-inactive';
        const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
        const projectsCount = u.projects_count || 0;

        const globalIndex = (pagination.currentPage - 1) * pagination.pageSize + index + 1;

        const card = document.createElement('div');
        card.className = `user-card reveal`;
        card.style.animationDelay = `${(index % 10) * 80}ms`;

        // Add top color bar class
        const uniqueClass = `card-color-${index}`;
        card.classList.add(uniqueClass);

        // Add dynamic style if not already present
        if (!document.getElementById(`style-${uniqueClass}`)) {
            const style = document.createElement('style');
            style.id = `style-${uniqueClass}`;
            style.innerHTML = `.${uniqueClass}::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 5px; background: linear-gradient(90deg, ${color}, ${color}88); }`;
            document.head.appendChild(style);
        }

        card.innerHTML = `
            <div class="user-card-header">
                <div style="position: absolute; top: 12px; left: 12px; font-size: 10px; font-weight: 800; color: white; background: rgba(0,0,0,0.1); padding: 2px 6px; border-radius: 4px; z-index: 5;">#${globalIndex}</div>
                <div style="display: flex; align-items: center; gap: 15px; margin-top: 5px;">
                    <div class="user-avatar-sm" style="background: ${color}; width: 50px; height: 50px; font-size: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; box-shadow: 0 4px 10px ${color}40;">${getInitial(name)}</div>
                    <div class="user-info">
                        <div class="user-name" style="font-size: 18px; font-weight: 600; color: #1e293b; margin-bottom: 2px;">${name}</div>
                        <div class="user-email" style="font-size: 13px; color: #64748b;">${email}</div>
                    </div>
                </div>
                <button class="btn-icon-sm" style="background: white; border: none; border-radius: 8px; width: 32px; height: 32px; cursor: pointer; box-shadow: 0 2px 5px rgba(0,0,0,0.05);"><i class="fa-solid fa-ellipsis-vertical" style="color: #94a3b8;"></i></button>
            </div>
            
            <div class="user-card-body">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="font-size: 12px; color: #94a3b8; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">Role</span>
                    <span class="role-badge ${role}" style="font-size: 11px; padding: 4px 10px; border-radius: 20px;">${role}</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="font-size: 12px; color: #94a3b8; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">Designation</span>
                    <span style="font-size: 14px; color: #475569; font-weight: 600;">${designation}</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="font-size: 12px; color: #94a3b8; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">Projects</span>
                    <span style="font-size: 13px; color: #3b82f6; font-weight: 700; background: #eff6ff; padding: 2px 8px; border-radius: 6px;">${projectsCount} Assigned</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 12px; color: #94a3b8; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">Status</span>
                    <div class="status-indicator ${statusClass}" onclick="toggleUserStatus('${u.id}', '${status}')" style="margin: 0; padding: 4px 10px; font-size: 12px; border-radius: 20px; display: flex; align-items: center; gap: 6px; cursor: pointer;" title="Click to toggle status">
                        <span class="dot" style="width: 6px; height: 6px; border-radius: 50%; background: currentColor;"></span> ${statusLabel}
                    </div>
                </div>
            </div>

            <div class="user-card-footer">
                <div style="color: #64748b; font-size: 12px; display: flex; align-items: center; gap: 5px;">
                    <i class="fa-regular fa-calendar-days"></i> Joined ${joinedDate}
                </div>
                <div class="action-buttons" style="display: flex; gap: 8px;">
                    <button class="btn-icon-premium" style="width: 36px; height: 36px; border-radius: 10px; border: 1px solid #e2e8f0; background: white; cursor: pointer;" onclick="alert('Email ${u.email}')" title="Send Email">
                        <i class="fa-regular fa-envelope"></i>
                    </button>
                    <button class="btn-icon-premium" style="width: 36px; height: 36px; border-radius: 10px; border: 1px solid rgba(239, 68, 68, 0.2); background: white; color: #ef4444; cursor: pointer;" onclick="deleteUser('${u.id || u._id}')" title="Delete User">
                        <i class="fa-regular fa-trash-can"></i>
                    </button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

function filterUsers(role) {
    currentRoleFilter = role;
    document.querySelectorAll('.filter-tab').forEach(btn => {
        if (btn.innerText.toLowerCase() === role.toLowerCase() || (role === 'All' && btn.innerText === 'All')) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    pagination.currentPage = 1;
    applyFilters();
}

function changePage(delta) {
    const next = pagination.currentPage + delta;
    goToPage(next);
}

function goToPage(pageNum) {
    if (pageNum >= 1 && pageNum <= pagination.totalPages) {
        pagination.currentPage = pageNum;
        applyFilters(false); // Don't reset to page 1
    }
}

function searchUsersTable() {
    applyFilters();
}

function applyFilters(resetPage = true) {
    if (resetPage) pagination.currentPage = 1;

    const searchInput = document.getElementById('userListSearch');
    const term = searchInput ? searchInput.value.toLowerCase().trim() : "";

    let filtered = allUsers.filter(u => {
        // 1. Case-insensitive Role Check
        const role = u.role || "";
        const matchesRole = currentRoleFilter === 'All' || role.toLowerCase() === currentRoleFilter.toLowerCase();

        // 2. Comprehensive Search Check
        const nameStr = String(u.name || "").toLowerCase();
        const emailStr = String(u.email || "").toLowerCase();
        const idStr = String(u.id || u._id || "").toLowerCase();
        const matchesSearch = nameStr.includes(term) || emailStr.includes(term) || idStr.includes(term);

        return matchesRole && matchesSearch;
    });

    // 3. Advanced Sorting
    const sortVal = document.getElementById('userSortBy')?.value || pagination.sortBy;
    const [field, order] = sortVal.split('-');

    filtered.sort((a, b) => {
        let valA, valB;

        if (field === 'id') {
            valA = a.id ?? a._id ?? 0;
            valB = b.id ?? b._id ?? 0;

            // Numeric comparison for IDs
            const numA = parseInt(valA);
            const numB = parseInt(valB);
            if (!isNaN(numA) && !isNaN(numB)) {
                return order === 'asc' ? numA - numB : numB - numA;
            }
        } else {
            valA = a[field] ?? '';
            valB = b[field] ?? '';
        }

        // Standard string/fallback comparison
        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();

        return order === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });

    // 4. Handle Pagination
    pagination.filteredCount = filtered.length;
    pagination.totalPages = Math.ceil(filtered.length / pagination.pageSize) || 1;

    const start = (pagination.currentPage - 1) * pagination.pageSize;
    const end = start + pagination.pageSize;
    const pagedData = filtered.slice(start, end);

    updatePaginationUI();
    renderUsersTable(pagedData);
}

function updatePaginationUI() {
    const startNum = pagination.filteredCount === 0 ? 0 : (pagination.currentPage - 1) * pagination.pageSize + 1;
    const endNum = Math.min(pagination.currentPage * pagination.pageSize, pagination.filteredCount);

    setText('user-pagination-info', `Showing ${startNum}-${endNum} of ${pagination.filteredCount} users`);

    const prevBtn = document.getElementById('userPrevPage');
    const nextBtn = document.getElementById('userNextPage');
    const numbersContainer = document.getElementById('page-numbers-container');

    if (prevBtn) {
        prevBtn.disabled = pagination.currentPage === 1;
        prevBtn.style.opacity = pagination.currentPage === 1 ? '0.4' : '1';
        prevBtn.style.cursor = pagination.currentPage === 1 ? 'not-allowed' : 'pointer';
    }
    if (nextBtn) {
        const isLast = pagination.currentPage >= pagination.totalPages;
        nextBtn.disabled = isLast;
        nextBtn.style.opacity = isLast ? '0.4' : '1';
        nextBtn.style.cursor = isLast ? 'not-allowed' : 'pointer';
    }

    if (numbersContainer) {
        numbersContainer.innerHTML = '';

        // Show max 5 page numbers (e.g., surrounding current page)
        let startPage = Math.max(1, pagination.currentPage - 2);
        let endPage = Math.min(pagination.totalPages, startPage + 4);

        if (endPage - startPage < 4) {
            startPage = Math.max(1, endPage - 4);
        }

        for (let i = startPage; i <= endPage; i++) {
            const isActive = i === pagination.currentPage;
            const btn = document.createElement('button');
            btn.innerText = i;
            btn.onclick = () => goToPage(i);

            // Premium styling for page buttons
            btn.style.width = '36px';
            btn.style.height = '36px';
            btn.style.borderRadius = '10px';
            btn.style.border = isActive ? 'none' : '1px solid #e2e8f0';
            btn.style.background = isActive ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'white';
            btn.style.color = isActive ? 'white' : '#64748b';
            btn.style.fontWeight = '700';
            btn.style.fontSize = '13px';
            btn.style.cursor = 'pointer';
            btn.style.transition = 'all 0.2s';
            btn.style.boxShadow = isActive ? '0 4px 12px rgba(99, 102, 241, 0.3)' : 'none';

            if (!isActive) {
                btn.onmouseover = () => {
                    btn.style.borderColor = '#6366f1';
                    btn.style.color = '#6366f1';
                    btn.style.transform = 'translateY(-2px)';
                };
                btn.onmouseout = () => {
                    btn.style.borderColor = '#e2e8f0';
                    btn.style.color = '#64748b';
                    btn.style.transform = 'translateY(0)';
                };
            }

            numbersContainer.appendChild(btn);
        }
    }
}

async function toggleUserStatus(id, currentStatus) {
    const action = currentStatus === 'active' ? 'suspend' : 'activate';
    if (!confirm(`Are you sure you want to ${action} this user?`)) return;

    try {
        const res = await apiPut(`/api/users/${id}/${action}`);
        if (res) {
            showToast(`User ${action}d successfully`, 'success');
            loadAllUsers();
        }
    } catch (e) {
        showToast(`Failed to ${action} user`, 'error');
    }
}

async function deleteUser(id) {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;
    const token = localStorage.getItem("token");

    try {
        const res = await fetch(`${API_BASE_URL}/api/users/${id}`, {
            method: "DELETE",
            headers: { "Authorization": "Bearer " + token }
        });

        const data = await res.json();
        if (res.ok) {
            showToast(data.message || "User deleted successfully", "success");
            loadAllUsers();
        } else {
            showToast(data.message || "Failed to delete user", "error");
        }
    } catch (error) {
        console.error("Delete User Error:", error);
        showToast("Server error", "error");
    }
}

async function handleAddUser(e) {
    e.preventDefault();
    const token = localStorage.getItem("token");
    const name = document.getElementById("newUserName").value;
    const email = document.getElementById("newUserEmail").value;
    const password = document.getElementById("newUserPassword").value;
    const role = document.getElementById("newUserRole").value;
    const designation = document.getElementById("newUserDesignation").value;

    try {
        const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify({ name, email, password, role, designation })
        });

        const data = await res.json();
        if (res.ok) {
            showToast("User created successfully", "success");
            closeModal('addUserModal');
            const form = document.getElementById("addUserForm");
            if (form) form.reset();
            loadAllUsers();
        } else {
            showToast(data.message || "Failed to create user", "error");
        }
    } catch (error) {
        console.error("Add User Error:", error);
        showToast("Server error", "error");
    }
}
