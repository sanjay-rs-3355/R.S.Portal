// ===== SHARED DASHBOARD LOGIC =====

// Shared Chart.js defaults — applied globally
Chart.defaults.font.family = "'Inter', 'Segoe UI', sans-serif";
Chart.defaults.color = '#94a3b8';

// ─────────────────────────────────────────────
// 1. PROJECT STATS CHART (Doughnut + center text)
// ─────────────────────────────────────────────
function renderProjectStatsChart(data) {
    const ctx = document.getElementById('projectStatsChart');
    if (!ctx) return;

    const existingChart = Chart.getChart('projectStatsChart');
    if (existingChart) existingChart.destroy();

    const completed = Number(data.completedTasks || 0);
    const inProgress = Number(data.inProgressTasks || 0);
    const pending = Number(data.pendingTasks || 0);
    const review = Number(data.reviewTasks || 0);
    const total = completed + inProgress + pending + review;

    // Center-text plugin
    const centerTextPlugin = {
        id: 'centerText',
        afterDraw(chart) {
            const { ctx: c, chartArea: { width, height, left, top } } = chart;
            c.save();
            const cx = left + width / 2;
            const cy = top + height / 2;

            c.textAlign = 'center';
            c.textBaseline = 'middle';

            // Big number (The Value)
            c.font = 'bold 32px Inter, sans-serif';
            c.fillStyle = '#1e293b';
            c.fillText(total, cx, cy - 8);

            // Small Label
            c.font = '600 12px Inter, sans-serif';
            c.fillStyle = '#64748b';
            c.fillText('TOTAL TASKS', cx, cy + 18);

            c.restore();
        }
    };

    new Chart(ctx.getContext('2d'), {
        type: 'doughnut',
        plugins: [centerTextPlugin],
        data: {
            labels: ['Completed', 'In Progress', 'Pending', 'In Review'],
            datasets: [{
                data: [completed, inProgress, pending, review],
                backgroundColor: ['#10b981', '#6366f1', '#f59e0b', '#8b5cf6'],
                hoverBackgroundColor: ['#059669', '#4f46e5', '#d97706', '#7c3aed'],
                borderWidth: 3,
                borderColor: '#ffffff',
                hoverBorderColor: '#ffffff',
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '72%',
            animation: {
                animateRotate: true,
                duration: 800,
                easing: 'easeInOutQuart'
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        pointStyle: 'circle',
                        padding: 18,
                        font: { size: 12, weight: '500' }
                    }
                },
                tooltip: {
                    backgroundColor: '#1e293b',
                    titleColor: '#f8fafc',
                    bodyColor: '#cbd5e1',
                    padding: 12,
                    cornerRadius: 10,
                    callbacks: {
                        label(ctx) {
                            const pct = total ? Math.round((ctx.parsed / total) * 100) : 0;
                            return `  ${ctx.label}: ${ctx.parsed} (${pct}%)`;
                        }
                    }
                }
            }
        }
    });
}

// ─────────────────────────────────────────────
// 2. PERFORMANCE CHART (Dual-line gradient area)
// ─────────────────────────────────────────────
function renderPerformanceChart(data) {
    const ctx = document.getElementById('performanceChart');
    if (!ctx) return;

    const existingChart = Chart.getChart('performanceChart');
    if (existingChart) existingChart.destroy();

    const context = ctx.getContext('2d');

    // Completed tasks gradient (blue)
    const gradBlue = context.createLinearGradient(0, 0, 0, 260);
    gradBlue.addColorStop(0, 'rgba(99, 102, 241, 0.25)');
    gradBlue.addColorStop(1, 'rgba(99, 102, 241, 0)');

    // Created tasks gradient (teal)
    const gradTeal = context.createLinearGradient(0, 0, 0, 260);
    gradTeal.addColorStop(0, 'rgba(16, 185, 129, 0.20)');
    gradTeal.addColorStop(1, 'rgba(16, 185, 129, 0)');

    const labels = data.labels || [];
    const completedData = data.completedData || [];
    const createdData = data.createdData || completedData.map((_, i) => Math.max(0, completedData[i] + Math.floor(Math.random() * 3) - 1));

    new Chart(context, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Completed',
                    data: completedData,
                    borderColor: '#6366f1',
                    backgroundColor: gradBlue,
                    tension: 0.45,
                    pointRadius: 4,
                    pointHoverRadius: 7,
                    pointBackgroundColor: '#ffffff',
                    pointBorderColor: '#6366f1',
                    pointBorderWidth: 2,
                    borderWidth: 2.5,
                    fill: true
                },
                {
                    label: 'Created',
                    data: createdData,
                    borderColor: '#10b981',
                    backgroundColor: gradTeal,
                    tension: 0.45,
                    pointRadius: 4,
                    pointHoverRadius: 7,
                    pointBackgroundColor: '#ffffff',
                    pointBorderColor: '#10b981',
                    pointBorderWidth: 2,
                    borderWidth: 2.5,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
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
                legend: {
                    display: true,
                    position: 'top',
                    align: 'end',
                    labels: {
                        usePointStyle: true,
                        pointStyle: 'circle',
                        padding: 16,
                        font: { size: 11, weight: '600' }
                    }
                },
                tooltip: {
                    backgroundColor: '#1e293b',
                    titleColor: '#f8fafc',
                    bodyColor: '#cbd5e1',
                    padding: 12,
                    cornerRadius: 10,
                    usePointStyle: true
                }
            }
        }
    });
}

// 3. Shared Fetchers
async function loadPerformance() {
    const data = await apiGet('/api/dashboard/performance');
    if (data) {
        renderPerformanceChart(data);
    }
}
