// ===== SHARED DASHBOARD LOGIC =====

// 1. Project Stats Chart (Doughnut)
function renderProjectStatsChart(data) {
    const ctx = document.getElementById('projectStatsChart');
    if (!ctx) return;

    // Check if chart exists and destroy
    const existingChart = Chart.getChart("projectStatsChart");
    if (existingChart) existingChart.destroy();

    const values = [
        data.completedTasks || 0,
        data.inProgressTasks || 0,
        data.pendingTasks || 0
    ];

    new Chart(ctx.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: ['Completed', 'In Progress', 'Pending'],
            datasets: [{
                data: values,
                backgroundColor: ['#10b981', '#3b82f6', '#f59e0b'],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20 } }
            },
            cutout: '70%'
        }
    });
}

// 2. Performance Chart (Line)
function renderPerformanceChart(data) {
    const ctx = document.getElementById('performanceChart');
    if (!ctx) return;

    const existingChart = Chart.getChart("performanceChart");
    if (existingChart) existingChart.destroy();

    const context = ctx.getContext('2d');
    const gradient = context.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.2)');
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');

    new Chart(context, {
        type: 'line',
        data: {
            labels: data.labels || [],
            datasets: [{
                label: 'Tasks',
                data: data.completedData || [],
                borderColor: '#3b82f6',
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 4,
                borderWidth: 2,
                fill: true,
                backgroundColor: gradient
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { display: true, beginAtZero: true, grid: { borderDash: [5, 5] } },
                x: { grid: { display: false } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

// 3. Shared Fetchers
async function loadPerformance() {
    // The endpoint is the same for both, backend handles context via Token
    const data = await apiGet('/api/dashboard/performance');
    if (data) {
        renderPerformanceChart(data);
    }
}
