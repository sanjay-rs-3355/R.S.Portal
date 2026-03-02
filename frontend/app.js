// ===== CONFIG =====
const API_BASE_URL = "http://localhost:5000";

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

    // If allowAll is true, we just return the user (assuming they are authenticated)
    if (allowAll) return user;

    // Strict Role Check
    if (user.role !== expectedRole) {
        // Redirect to their correct dashboard
        window.location.href =
            user.role === 'admin'
                ? 'admin-dashboard.html'
                : 'member-dashboard.html';
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

        if (res.status === 401) {
            logout();
            return null;
        }

        if (!res.ok) {
            throw new Error(`API Error: ${res.status}`);
        }

        return await res.json();
    } catch (error) {
        console.error("API Fetch Error:", error);
        return null;
    }
}

// ===== TIME UTILS =====
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";

    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";

    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";

    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";

    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " mins ago";

    return Math.floor(seconds) + " seconds ago";
}

// ===== SOCKET & CHAT (Keep existing logic) =====
const token = localStorage.getItem("token");
let socket;

if (token) {
    socket = io(API_BASE_URL, {
        auth: { token: token }
    });

    socket.on("connect", () => {
        console.log("Connected to command center");
    });

    // Global Chat Listeners (if any)
}

function toggleChat() {
    const popup = document.getElementById("chatPopup");
    if (popup) popup.classList.toggle("active");
}
