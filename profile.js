// ===== PROFILE PAGE LOGIC =====

document.addEventListener('DOMContentLoaded', initProfilePage);

async function initProfilePage() {
    // 1. Auth Check
    const user = handleDashboardAccess('member', true); // Allow all
    if (!user) return;

    // 2. Navigation
    setupNavigation();

    // 3. Load Profile Data
    await fetchProfile();

    // 4. Form Submission
    document.getElementById('profileForm').addEventListener('submit', handleUpdateProfile);

    // Staggered Entry for Profile
    initScrollReveal();
}

async function fetchProfile() {
    try {
        const profile = await apiGet('/api/users/profile');
        if (!profile) return;

        // Fill Form
        document.getElementById('profileName').value = profile.name || '';
        document.getElementById('profileEmail').value = profile.email || '';
        document.getElementById('profileDesignation').value = profile.designation || 'Member';

        // Update UI displays
        const dispName = document.getElementById('display-name');
        const dispEmail = document.getElementById('display-email');
        const dispAvatar = document.getElementById('profile-avatar');
        const dispRole = document.getElementById('display-role-text');

        if (dispName) dispName.innerText = profile.name;
        if (dispEmail) dispEmail.innerText = profile.email;
        if (dispAvatar) dispAvatar.innerText = getInitial(profile.name);
        if (dispRole) dispRole.innerText = profile.designation || profile.role || 'Member';

        // Set Designation Select
        const designationSelect = document.getElementById('profileDesignation');
        if (designationSelect) designationSelect.value = profile.designation || 'Member';

        // Placeholder stats (Could be fetched from real endpoints later)
        setText('stat-projects', profile.projectCount || '0');
        setText('stat-tasks', profile.taskCount || '0');

    } catch (error) {
        console.error("Fetch Profile Error:", error);
        showToast("Failed to load profile", "error");
    }
}

async function handleUpdateProfile(e) {
    e.preventDefault();

    const name = document.getElementById('profileName').value;
    const designation = document.getElementById('profileDesignation').value;
    const password = document.getElementById('profilePassword').value;

    const token = localStorage.getItem("token");

    try {
        const res = await fetch('/api/users/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name, designation, password })
        });

        const data = await res.json();
        if (res.ok) {
            showToast("Profile updated successfully!");
            // Refresh displays
            document.getElementById('display-name').innerText = name;
            document.getElementById('profile-avatar').innerText = getInitial(name);

            // Repopulate topbar (if needed) - app.js populates from token, 
            // but we can manually update the DOM for immediate feedback
            const topbarName = document.getElementById('usernameDisplay');
            const topbarAvatar = document.getElementById('user-avatar');
            if (topbarName) topbarName.innerText = name;
            if (topbarAvatar) topbarAvatar.innerText = getInitial(name);

            // Clear password field
            document.getElementById('profilePassword').value = '';

            // Update local token name if possible (optional, since token is usually just ID/Role but sometimes has Name)
            // But we fetch profile from DB anyway, so it's fresh.
        } else {
            showToast(data.message || "Update failed", "error");
        }
    } catch (error) {
        console.error("Update Profile Error:", error);
        showToast("Server error", "error");
    }
}
