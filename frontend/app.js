// Use relative API paths when frontend and backend are served together.
// If you deploy the frontend separately, update this to the backend URL.
const API_BASE_URL = "";


// Global error handler for debugging
window.onerror = function (msg, url, line, col, error) {
    console.error("Global Error:", msg, "at", url, ":", line, ":", col, error);
    return false;
};

function getInitial(name) {
    if (!name || typeof name !== 'string') return "?";
    return name.charAt(0).toUpperCase();
}

// ===== UI UTILS (GLOBAL) =====
function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const icons = {
        success: '<i class="fa-solid fa-check"></i>',
        error: '<i class="fa-solid fa-xmark"></i>',
        warning: '<i class="fa-solid fa-exclamation"></i>',
        info: '<i class="fa-solid fa-info"></i>'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-icon">${icons[type] || icons.info}</div>
        <div class="toast-content">${message}</div>
    `;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s forwards';
        toast.addEventListener('animationend', () => toast.remove());
    }, 4500);
}

function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'flex';
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'none';
}

// ===== AUTH UTILS =====
function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
}

function requireAuth() {
    const token = localStorage.getItem("token");
    if (!token) {
    window.location.href = "index.html";
        return null;
    }
    return token;
}

function handleDashboardAccess(expectedRole, allowAll = false) {
    const token = requireAuth();
    if (!token) return;

    const user = parseJwt(token);

    if (!user) {
        logout();
        return null;
    }

    // --- Common UI Personalization ---
    // Use a small timeout to ensure DOM is ready
    setTimeout(() => {
        // 1. Username Display
        const usernameDisplay = document.getElementById("usernameDisplay");
        if (usernameDisplay) usernameDisplay.innerText = user.name || "User";

        // 2. Avatar Initial
        const userAvatar = document.getElementById("user-avatar");
        if (userAvatar) userAvatar.innerText = (user.name || "U").charAt(0).toUpperCase();

        // 3. Live Date (if banner exists)
        const dashDate = document.getElementById('dash-date');
        if (dashDate) {
            const now = new Date();
            const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
            const dateFull = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
            dashDate.innerHTML = `<div style="font-size:11px; opacity:0.8; margin-bottom:2px;">${dayName}</div>${dateFull}`;
        }
    }, 0);

    // If allowAll is true, we just return the user (assuming they are authenticated)
    if (allowAll) return user;

    // Strict Role Check
    if (user.role !== expectedRole) {
        // Redirect to their correct dashboard
        window.location.href = user.role === 'admin' ? 'admin-dashboard.html' : 'member-dashboard.html';
        return null;
    }
    return user;
}

function logout() {
    localStorage.clear();
    window.location.href = "index.html";
}

// ===== API HELPERS =====
async function apiGet(endpoint) {
    const token = localStorage.getItem("token");
    if (!token) {
    window.location.href = "index.html";
        return null;
    }

    try {
        const res = await fetch(`${API_BASE_URL}${endpoint}`, {
            headers: { "Authorization": "Bearer " + token }
        });

        console.log(`GET ${endpoint} Status: ${res.status}`);

        if (res.status === 401) {
            logout();
            return null;
        }

        if (!res.ok) {
            console.error(`API Error for ${endpoint}: ${res.status}`);
            return null;
        }

        return await res.json();
    } catch (error) {
        console.error(`API Fetch Error for ${endpoint}:`, error);
        return null;
    }
}

async function apiRequest(endpoint, method = 'GET', data = null) {
    const token = localStorage.getItem("token");
    if (!token) {
    window.location.href = "index.html";
        return null;
    }

    const options = {
        method,
        headers: {
            "Authorization": "Bearer " + token,
            "Content-Type": "application/json"
        }
    };

    if (data && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(data);
    }

    try {
        const res = await fetch(`${API_BASE_URL}${endpoint}`, options);
        const result = await res.json();

        if (!res.ok) {
            throw new Error(result.message || `Request failed with status ${res.status}`);
        }

        return result;
    } catch (error) {
        console.error(`API ${method} Error for ${endpoint}:`, error);
        throw error;
    }
}

async function apiPost(endpoint, data = {}) {
    const token = localStorage.getItem("token");
    if (!token) { window.location.href = "index.html"; return null; }
    try {
        const res = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.message || `POST ${endpoint} failed: ${res.status}`);
        return result;
    } catch (error) { console.error(`API POST Error for ${endpoint}:`, error); throw error; }
}

async function apiPut(endpoint, data = {}) {
    const token = localStorage.getItem("token");
    if (!token) { window.location.href = "index.html"; return null; }
    try {
        const res = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'PUT',
            headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.message || `PUT ${endpoint} failed: ${res.status}`);
        return result;
    } catch (error) { console.error(`API PUT Error for ${endpoint}:`, error); throw error; }
}

async function apiDelete(endpoint) {
    const token = localStorage.getItem("token");
    if (!token) { window.location.href = "index.html"; return null; }
    try {
        const res = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'DELETE',
            headers: { "Authorization": "Bearer " + token }
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.message || `DELETE ${endpoint} failed: ${res.status}`);
        return result;
    } catch (error) { console.error(`API DELETE Error for ${endpoint}:`, error); throw error; }
}

function debounce(func, wait) {
    let timeout;
    return function (...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

// Global intersection observer for reveal effect
let revealObserver;

/**
 * Persistent Scroll Reveal System
 */
function initScrollReveal() {
    if (revealObserver) {
        // Just refresh observation for current elements
        document.querySelectorAll('.reveal:not(.revealed)').forEach(el => revealObserver.observe(el));
        return;
    }

    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                revealObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.05, // More sensitive
        rootMargin: '0px 0px -50px 0px'
    });

    // Initial observation
    const initialElements = document.querySelectorAll('.reveal');
    initialElements.forEach(el => revealObserver.observe(el));

    // Persistent observation for dynamic content AND attribute changes
    const mutationObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) { // ELEMENT_NODE
                        if (node.classList.contains('reveal')) {
                            revealObserver.observe(node);
                        }
                        node.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
                    }
                });
            } else if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                if (mutation.target.classList.contains('reveal') && !mutation.target.classList.contains('revealed')) {
                    revealObserver.observe(mutation.target);
                }
            }
        });
    });

    mutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class']
    });
}

/**
 * Apply staggered delay to children
 * @param {string} selector - Container selector
 * @param {string} childSelector - Children selector
 * @param {number} baseDelay - Initial delay in ms
 * @param {number} step - Delay increment in ms
 */
function applyStagger(selector, childSelector, baseDelay = 100, step = 50) {
    const container = document.querySelector(selector);
    if (!container) return;
    const children = container.querySelectorAll(childSelector);
    children.forEach((el, i) => {
        el.style.animationDelay = `${baseDelay + (i * step)}ms`;
        el.classList.add('reveal'); // Ensure it has reveal class
    });
    // Trigger observer refresh if needed, usually initScrollReveal handles it
}


function escapeHTML(str) {
    if (!str || typeof str !== 'string') return '';
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * Common search sorting logic: prioritize items starting with the query.
 * @param {Array} data - Array of objects to sort
 * @param {string} query - Search term
 * @param {Array} fields - Array of strings (field names) to check for "starts with"
 * @returns {Array} Sorted array
 */
function sortSearchResults(data, query, fields) {
    if (!query) return data;
    const q = query.toLowerCase().trim();
    if (!q) return data;

    return [...data].sort((a, b) => {
        // Find best match for A
        let aScore = 100; // lower is better
        fields.forEach((f, idx) => {
            const val = String(a[f] || '').toLowerCase();
            if (val.startsWith(q)) aScore = Math.min(aScore, idx);
        });

        // Find best match for B
        let bScore = 100;
        fields.forEach((f, idx) => {
            const val = String(b[f] || '').toLowerCase();
            if (val.startsWith(q)) bScore = Math.min(bScore, idx);
        });

        if (aScore !== bScore) return aScore - bScore;

        // If same score (both start with query in same weighted field, or neither starts), 
        // sort alphabetically by the first field.
        const primaryField = fields[0];
        return String(a[primaryField] || '').localeCompare(String(b[primaryField] || ''));
    });
}

// ===== TIME UTILS =====
function getTimeAgo(date) {
    const diff = new Date() - new Date(date);
    const seconds = Math.floor(Math.abs(diff) / 1000);
    const isFuture = diff < 0;

    let interval = seconds / 31536000;
    let res = "";
    if (interval > 1) res = Math.floor(interval) + " years";
    else {
        interval = seconds / 2592000;
        if (interval > 1) res = Math.floor(interval) + " months";
        else {
            interval = seconds / 86400;
            if (interval > 1) res = Math.floor(interval) + " days";
            else {
                interval = seconds / 3600;
                if (interval > 1) res = Math.floor(interval) + " hours";
                else {
                    interval = seconds / 60;
                    if (interval > 1) res = Math.floor(interval) + " mins";
                    else res = Math.floor(seconds) + " seconds";
                }
            }
        }
    }

    if (isFuture) return "in " + res;
    return res + " ago";
}

// ===== UI UTILS =====
function animateValue(id, end, duration = 1000) {
    const el = document.getElementById(id);
    if (!el) return;

    let start = parseInt(el.innerText) || 0;
    if (start === end) {
        el.innerText = end;
        return;
    }

    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        el.innerText = Math.floor(progress * (end - start) + start);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            el.innerText = end;
        }
    };
    window.requestAnimationFrame(step);
}

function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.innerText = val;
}

function setupNavigation() {
    // Helper to set active state based on current page
    const currentPath = window.location.pathname;
    const page = currentPath.split("/").pop();

    if (page === 'admin-dashboard.html' || page === 'member-dashboard.html') navDashboard?.classList.add('active');
    if (page === 'project.html') navProjects?.classList.add('active');
    if (page === 'tasks.html') navTasks?.classList.add('active');
    if (page === 'users.html') navUsers?.classList.add('active');
    if (page === 'db-manager.html') navDbManager?.classList.add('active');

    if (navDashboard) navDashboard.addEventListener('click', goToDashboard);
    if (navProjects) navProjects.addEventListener('click', () => window.location.href = 'project.html');
    if (navTasks) navTasks.addEventListener('click', () => window.location.href = 'tasks.html');
    if (navUsers) navUsers.addEventListener('click', () => window.location.href = 'users.html');
    if (navDbManager) navDbManager.addEventListener('click', () => window.location.href = 'db-manager.html');

    // Role-based visibility for Users link
    const token = localStorage.getItem("token");
    if (token) {
        const user = parseJwt(token);
        if (user && user.role === 'admin') {
            if (navUsers) navUsers.style.setProperty('display', 'block', 'important');
            if (navDbManager) navDbManager.style.setProperty('display', 'block', 'important');
        } else {
            // Show Tasks for members
            if (navTasks) navTasks.style.setProperty('display', 'block', 'important');
        }
    }

    // Logo redirect: Use goToDashboard logic instead of hardcoding index.html
    const logo = document.querySelector('.logo');
    if (logo) {
        logo.style.cursor = 'pointer';
        logo.addEventListener('click', (e) => {
            console.log("Logo clicked, redirecting...");
            goToDashboard();
        });
    }

    setupTopbar();
}

function setupTopbar() {
    const userMenuBtn = document.getElementById('userMenuBtn');
    const userDropdown = document.getElementById('userDropdown');
    const notifBtn = document.getElementById('notifBtn');
    const notifDropdown = document.getElementById('notifDropdown');

    if (userMenuBtn && userDropdown) {
        userMenuBtn.addEventListener('click', (e) => {
            // If the user clicks specifically on the name or avatar, redirect to profile
            const isClickOnNameOrAvatar = e.target.id === 'usernameDisplay' || e.target.id === 'user-avatar' || e.target.id === 'userAvatar';
            if (isClickOnNameOrAvatar) {
                window.location.href = 'profile.html';
                return;
            }

            e.stopPropagation();
            userDropdown.classList.toggle('active');
            notifDropdown?.classList.remove('active');
        });
    }

    if (notifBtn && notifDropdown) {
        notifBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            notifDropdown.classList.toggle('active');
            userDropdown?.classList.remove('active');
        });
    }

    // Close on outside click
    document.addEventListener('click', (e) => {
        if (userDropdown && !userMenuBtn?.contains(e.target)) {
            userDropdown.classList.remove('active');
        }
        if (notifDropdown && !notifBtn?.contains(e.target)) {
            notifDropdown.classList.remove('active');
        }
    });

    populateTopbarUser();

    // Notifications Init
    if (notifBtn) {
        fetchNotifications();
        // Hook up Mark All Read if it exists
        const markAllReadBtn = document.getElementById('markAllRead');
        if (markAllReadBtn) {
            markAllReadBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                markAllNotificationsRead();
            });
        }
    }
}

async function fetchNotifications() {
    try {
        const notifs = await apiGet('/api/notifications');
        renderNotifications(notifs || []);
    } catch (error) {
        console.error("Failed to fetch notifications:", error);
    }
}

function renderNotifications(notifs) {
    const list = document.getElementById('notifList');
    const dot = document.getElementById('notifDot');
    if (!list) return;

    if (dot) {
        const unreadCount = notifs.filter(n => !n.is_read).length;
        dot.style.display = unreadCount > 0 ? 'block' : 'none';
        dot.textContent = unreadCount > 9 ? '9+' : unreadCount;
        if (unreadCount === 0) dot.style.display = 'none';
    }

    if (notifs.length === 0) {
        list.innerHTML = '<p class="notif-empty">No new notifications</p>';
        return;
    }

    list.innerHTML = notifs.map(n => `
        <div class="notif-item ${n.is_read ? '' : 'unread'}" onclick="markNotificationRead(${n.id})">
            <div class="notif-item-title">${escapeHTML(n.title) || 'System Update'}</div>
            <div class="notif-item-desc">${escapeHTML(n.message)}</div>
            <div class="notif-item-time">${getTimeAgo(n.created_at)}</div>
        </div>
    `).join('');
}

async function markNotificationRead(id) {
    try {
        await apiPut(`/api/notifications/${id}/read`);
        fetchNotifications();
    } catch (e) {
        console.error(e);
    }
}

async function markAllNotificationsRead() {
    try {
        await apiDelete('/api/notifications/clear-all');
        fetchNotifications();
    } catch (e) {
        console.error(e);
    }
}

function populateTopbarUser() {
    const token = localStorage.getItem("token");
    if (!token) return;

    const user = parseJwt(token);
    if (!user) return;

    const usernameDisplay = document.getElementById('usernameDisplay');
    const usernameDisplayAlt = document.getElementById('username-display');
    const welcomeName = document.getElementById('welcome-name');
    const userAvatar = document.getElementById('user-avatar') || document.getElementById('userAvatar');

    if (usernameDisplay) {
        usernameDisplay.textContent = user.name || 'User';
    }
    if (usernameDisplayAlt) {
        usernameDisplayAlt.textContent = user.name || 'User';
    }
    if (welcomeName) {
        welcomeName.textContent = user.name || 'User';
    }
    if (userAvatar && user.name) {
        userAvatar.textContent = getInitial(user.name);
    }
}


/**
 * Global Token and Error Handler for OAuth Redirects
 */
function handleAuthParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const error = urlParams.get('error');

    if (token) {
        localStorage.setItem("token", token);
        // Clean the URL
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);

        showToast("Login successful! Redirecting...");
        
        setTimeout(() => {
            const user = parseJwt(token);
            if (user) {
                window.location.href = user.role === 'admin' ? "admin-dashboard.html" : "member-dashboard.html";
            }
        }, 1500);
    } else if (error) {
        showToast("Authentication failed: " + error.replace(/_/g, ' '), "error");
        // Clean the URL
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
    }
}

// Initialize global UI features on DOM content load
document.addEventListener('DOMContentLoaded', () => {
    initScrollReveal();
    handleAuthParams();
});


// ===== SOCKET & CHAT (Keep existing logic) =====
const token = localStorage.getItem("token");
let socket;

if (token && typeof io !== 'undefined') {
    try {
        socket = io(API_BASE_URL || window.location.origin, {
            auth: { token: token }
        });

        socket.on("connect", () => {
            console.log("Connected to command center");
        });
    } catch (e) {
        console.error("Socket connection failed:", e);
    }
}

function toggleChat() {
    const popup = document.getElementById("chatPopup");
    if (popup) popup.classList.toggle("active");
}

function goToDashboard() {
    const token = localStorage.getItem("token");
    if (!token) {
    window.location.href = "index.html";
        return;
    }
    const user = parseJwt(token);
    if (user) {
        window.location.href = user.role === 'admin' ? 'admin-dashboard.html' : 'member-dashboard.html';
    } else {
        window.location.href = 'index.html';
    }
}
