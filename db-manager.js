// ===== DATABASE MANAGER PAGE LOGIC =====

document.addEventListener('DOMContentLoaded', initDbManager);

let dbState = {
    currentTable: 'users',
    page: 1,
    limit: 50,
    search: '',
    totalPages: 1,
    currentColumns: [],
    editRecordId: null,
    sortBy: 'id',
    sortOrder: 'ASC'
};

async function initDbManager() {
    // 1. Role Check - Must be admin
    const user = handleDashboardAccess('admin');
    if (!user) return;

    // 2. Setup Navigation & Interactions
    setupNavigation();
    setupDbManagerListeners();

    // 3. UI Tweaks
    const navUsers = document.getElementById('navUsers');
    if (navUsers) navUsers.style.display = 'block';

    // Initial data load
    loadDbTableData();
}

function setupDbManagerListeners() {
    // Sidebar table selection
    document.getElementById('db-sidebar-list')?.addEventListener('click', (e) => {
        const item = e.target.closest('.db-sidebar-item');
        if (!item) return;

        document.querySelectorAll('.db-sidebar-item').forEach(el => el.classList.remove('active'));
        item.classList.add('active');

        dbState.currentTable = item.dataset.table;
        dbState.page = 1;
        dbState.search = '';
        const searchInput = document.getElementById('dbSearch');
        if (searchInput) searchInput.value = '';

        loadDbTableData();
    });

    // Search functionality
    const dbSearch = document.getElementById('dbSearch');
    let searchTimeout = null;
    dbSearch?.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            dbState.search = e.target.value;
            dbState.page = 1;
            loadDbTableData();
        }, 500);
    });

    // Add button
    document.getElementById('addDbRecordBtn')?.addEventListener('click', () => openDbRecordFormModal());

    // Form submission
    document.getElementById('dbRecordForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        handleDbRecordSubmit(e);
    });

    // Close modal triggers
    document.querySelectorAll('.close').forEach(btn => {
        btn.onclick = () => {
            const modalId = btn.getAttribute('data-modal');
            closeModal(modalId);
        };
    });
}

async function loadDbTableData() {
    const tableBody = document.getElementById('dbTableBody');
    const tableHead = document.getElementById('dbTableHead');
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="100%" style="text-align:center; padding:100px; color:#cbd5e1;"><i class="fa-solid fa-spinner fa-spin"></i> Loading data...</td></tr>';

    try {
        const url = `/api/admin/db/${dbState.currentTable}?page=${dbState.page}&limit=${dbState.limit}&search=${encodeURIComponent(dbState.search)}&sortBy=${dbState.sortBy}&sortOrder=${dbState.sortOrder}`;
        const res = await apiGet(url);

        if (!res || !res.success) throw new Error(res?.message || 'Failed to fetch');

        dbState.currentColumns = res.columns;
        dbState.totalPages = res.pagination.totalPages;

        // Apply "starts with" sorting priority for the current page
        let tableData = res.data || [];
        if (dbState.search.trim() !== '') {
            const allColNames = res.columns.map(c => c.Field);
            // Prioritize ID/Name related fields
            const priorityFields = allColNames.filter(name =>
                ['id', 'name', 'title', 'email', '_id'].includes(name.toLowerCase())
            );
            const otherFields = allColNames.filter(name => !priorityFields.includes(name));
            tableData = sortSearchResults(tableData, dbState.search, [...priorityFields, ...otherFields]);
        }
        dbState.loadedData = tableData;

        // Update UI
        updateDbPaginationUI(res.pagination.total);
        setText('db-pagination-top', `Showing ${res.data.length} of ${res.pagination.total} records`);

        // Render Headers
        tableHead.innerHTML = `
            <tr>
                <th style="width: 80px; background: #f8fafc; border-bottom: 2px solid #e2e8f0; cursor: default;">
                    S.No
                </th>
                ${res.columns.map(col => {
            const isSorted = dbState.sortBy.toLowerCase() === col.Field.toLowerCase();
            const indicator = isSorted
                ? (dbState.sortOrder === 'ASC' ? '<span style="color:#6366f1; margin-left:4px;">▲</span>' : '<span style="color:#6366f1; margin-left:4px;">▼</span>')
                : '<span style="opacity:0.2; margin-left:4px;">▲</span>';
            return `<th style="cursor: pointer; background: #f8fafc; border-bottom: 2px solid #e2e8f0;" onclick="changeSort('${col.Field}')">${col.Field} ${indicator}</th>`;
        }).join('')}
                <th style="text-align:right; min-width:120px; background:#f8fafc; z-index:10; border-left:1px solid #f1f5f9; position:sticky; right:0; border-bottom: 2px solid #e2e8f0;">Actions</th>
            </tr>
        `;

        // Render Body
        if (dbState.loadedData.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="100%" style="text-align:center; padding:100px; color:#94a3b8;"><i class="fa-regular fa-folder-open" style="font-size:48px; margin-bottom:15px; display:block; opacity:0.2;"></i> No records found for "${dbState.currentTable}"</td></tr>`;
            return;
        }

        tableBody.innerHTML = dbState.loadedData.map((row, index) => {
            const serialNo = (dbState.page - 1) * dbState.limit + index + 1;
            return `
                <tr>
                    <td style="font-weight: 700; color: #64748b; background: rgba(248, 250, 252, 0.5);">${serialNo}</td>
                    ${res.columns.map(col => `<td>${renderCell(row[col.Field], col.Field)}</td>`).join('')}
                    <td style="text-align:right; background:rgba(255,255,255,0.9); backdrop-filter:blur(10px); z-index:10; border-left:1px solid #f1f5f9; position:sticky; right:0;">
                        <button class="db-action-btn edit" onclick="openDbRecordFormModal(${index})" title="Edit">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button class="db-action-btn delete" onclick="confirmDeleteRecord(${row.id})" title="Delete">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

    } catch (err) {
        tableBody.innerHTML = `<tr><td colspan="100%" style="text-align:center; padding:100px; color:#ef4444;"><i class="fa-solid fa-circle-exclamation"></i> Error: ${err.message}</td></tr>`;
    }
}

function renderCell(val, field) {
    if (val === null || val === undefined) return '<span style="color:#cbd5e1; font-style:italic; font-size:11px;">NULL</span>';

    // 1. Date formatting
    if (field.includes('_at') || field === 'deadline' || field === 'date') {
        const d = new Date(val);
        if (!isNaN(d.getTime())) {
            return `<div style="display:flex; flex-direction:column;">
                <span style="font-weight:600;">${d.toLocaleDateString()}</span>
                <span style="font-size:10px; color:#94a3b8;">${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>`;
        }
    }

    // 2. Boolean / ID formatting
    if (typeof val === 'boolean' || val === 0 || val === 1) {
        if (field.startsWith('is_') || field === 'status') {
            const isTrue = val === true || val === 1 || val === 'completed' || val === 'active' || val === 'online';
            const text = String(val).toUpperCase();
            return `<span style="padding:4px 10px; border-radius:12px; font-size:10px; font-weight:800; background:${isTrue ? '#ecfdf5' : '#f1f5f9'}; color:${isTrue ? '#10b981' : '#64748b'}; border:1px solid ${isTrue ? '#10b98120' : '#e2e8f0'};">${text}</span>`;
        }
    }

    // 3. Status/Priority Specific
    if (field === 'priority' || field === 'role' || field === 'status') {
        const colors = {
            high: { bg: '#fef2f2', text: '#ef4444' },
            medium: { bg: '#fffbeb', text: '#f59e0b' },
            low: { bg: '#f0fdf4', text: '#10b981' },
            admin: { bg: '#eef2ff', text: '#6366f1' },
            manager: { bg: '#faf5ff', text: '#a855f7' },
            member: { bg: '#f1f5f9', text: '#475569' },
            pending: { bg: '#fff7ed', text: '#ea580c' },
            completed: { bg: '#ecfdf5', text: '#10b981' },
            in_progress: { bg: '#eff6ff', text: '#3b82f6' }
        };
        const style = colors[String(val).toLowerCase()] || { bg: '#f1f5f9', text: '#64748b' };
        return `<span style="padding:4px 12px; border-radius:12px; font-size:10px; font-weight:800; text-transform:uppercase; background:${style.bg}; color:${style.text}; letter-spacing:0.5px;">${val}</span>`;
    }

    // 4. Truncate long text
    const str = escapeHTML(String(val));
    if (str.length > 50) {
        return `<span title="${str}">${str.substring(0, 47)}...</span>`;
    }

    return str;
}

function openDbRecordFormModal(recordIndex = null) {
    const rowData = recordIndex !== null ? dbState.loadedData[recordIndex] : null;
    dbState.editRecordId = rowData ? rowData.id : null;

    setText('dbModalTitle', dbState.editRecordId ? 'Edit Record' : 'Add New Record');
    setText('dbModalTableLabel', `Table: ${dbState.currentTable}`);

    const formFields = document.getElementById('dbFormFields');
    if (!formFields) return;
    formFields.innerHTML = '';

    dbState.currentColumns.forEach(col => {
        const isAI = col.Extra === 'auto_increment';
        const isTime = ['created_at', 'updated_at'].includes(col.Field);

        if (isAI || isTime) return;

        const val = rowData ? rowData[col.Field] : '';
        const inputType = col.Type.includes('int') ? 'number' : (col.Type.includes('date') ? 'date' : 'text');

        formFields.innerHTML += `
            <div style="display:flex; flex-direction:column; gap:6px;">
                <label style="font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:0.4px;">${col.Field}</label>
                <input type="${inputType}" name="${col.Field}" value="${val ?? ''}" 
                    placeholder="Enter value..." 
                    style="padding:12px; border-radius:12px; border:1.5px solid #e2e8f0; font-size:14px; focus-within:border-color:#6366f1;">
            </div>
        `;
    });

    openModal('dbRecordModal');
}

async function handleDbRecordSubmit(e) {
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerText;

    const formData = new FormData(e.target);
    const payload = {};
    formData.forEach((value, key) => payload[key] = value);

    try {
        btn.disabled = true;
        btn.innerText = 'Processing...';

        const method = dbState.editRecordId ? 'PUT' : 'POST';
        const url = dbState.editRecordId
            ? `/api/admin/db/${dbState.currentTable}/${dbState.editRecordId}`
            : `/api/admin/db/${dbState.currentTable}`;

        const res = await apiRequest(url, method, payload);

        if (res && res.success) {
            showToast(dbState.editRecordId ? 'Entry updated' : 'New entry created', 'success');
            closeModal('dbRecordModal');
            loadDbTableData();
        } else {
            throw new Error(res?.message || 'Action failed');
        }
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerText = originalText;
    }
}

function confirmDeleteRecord(id) {
    openModal('deleteModal');
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    if (confirmBtn) {
        confirmBtn.onclick = async () => {
            confirmBtn.disabled = true;
            confirmBtn.innerText = 'Deleting...';
            try {
                const res = await apiRequest(`/api/admin/db/${dbState.currentTable}/${id}`, 'DELETE');
                if (res && res.success) {
                    showToast('Record nuked', 'success');
                    closeModal('deleteModal');
                    loadDbTableData();
                } else {
                    throw new Error(res?.message || 'Delete failed');
                }
            } catch (err) {
                showToast(err.message, 'error');
            } finally {
                confirmBtn.disabled = false;
                confirmBtn.innerText = 'Yes, Delete';
            }
        };
    }
}

function changeSort(field) {
    if (dbState.sortBy.toLowerCase() === field.toLowerCase()) {
        dbState.sortOrder = dbState.sortOrder === 'ASC' ? 'DESC' : 'ASC';
    } else {
        dbState.sortBy = field;
        dbState.sortOrder = 'ASC';
    }
    dbState.page = 1;
    loadDbTableData();
}

function changeDbPage(delta) {
    const next = dbState.page + delta;
    goToDbPage(next);
}

function goToDbPage(pageNum) {
    if (pageNum >= 1 && pageNum <= dbState.totalPages) {
        dbState.page = pageNum;
        loadDbTableData();
    }
}

function updateDbPaginationUI(totalRecords) {
    const startNum = totalRecords === 0 ? 0 : (dbState.page - 1) * dbState.limit + 1;
    const endNum = Math.min(dbState.page * dbState.limit, totalRecords);

    setText('db-pagination-info', `Showing ${startNum}-${endNum} of ${totalRecords} records`);
    setText('db-total-pages', dbState.totalPages);

    const prevBtn = document.getElementById('dbPrevPage');
    const nextBtn = document.getElementById('dbNextPage');
    const numbersContainer = document.getElementById('db-page-numbers-container');

    if (prevBtn) {
        prevBtn.disabled = dbState.page === 1;
        prevBtn.style.opacity = dbState.page === 1 ? '0.4' : '1';
        prevBtn.style.cursor = dbState.page === 1 ? 'not-allowed' : 'pointer';
    }
    if (nextBtn) {
        const isLast = dbState.page >= dbState.totalPages;
        nextBtn.disabled = isLast;
        nextBtn.style.opacity = isLast ? '0.4' : '1';
        nextBtn.style.cursor = isLast ? 'not-allowed' : 'pointer';
    }

    if (numbersContainer) {
        numbersContainer.innerHTML = '';

        // Show max 5 page numbers
        let startPage = Math.max(1, dbState.page - 2);
        let endPage = Math.min(dbState.totalPages, startPage + 4);

        if (endPage - startPage < 4) {
            startPage = Math.max(1, endPage - 4);
        }

        for (let i = startPage; i <= endPage; i++) {
            const isActive = i === dbState.page;
            const btn = document.createElement('button');
            btn.innerText = i;
            btn.onclick = () => goToDbPage(i);

            // Premium styling for page buttons
            btn.style.width = '36px';
            btn.style.height = '36px';
            btn.style.borderRadius = '10px';
            btn.style.border = isActive ? 'none' : '1px solid #e2e8f0';
            btn.style.background = isActive ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'white';
            btn.style.color = isActive ? 'white' : '#64748b';
            btn.style.fontWeight = '700';
            btn.style.fontSize = '12px';
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

function changeLimit(newLimit) {
    dbState.limit = parseInt(newLimit);
    dbState.page = 1;
    loadDbTableData();
}
