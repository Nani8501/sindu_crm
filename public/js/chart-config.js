// Chart.js Configuration - Sindhu Branding Colors
const chartColors = {
    primary: '#1a516f',
    primaryLight: '#2d7a9e',
    secondary: '#4aa5cc',
    success: '#00f2fe',
    warning: '#fee140',
    danger: '#f5576c',
    teal: ['#1a516f', '#2d7a9e', '#4aa5cc', '#5bb5d8', '#6ec5e4'],
    gradients: {
        tealBlue: {
            start: '#1a516f',
            end: '#4aa5cc'
        }
    }
};

// Default chart options
const defaultChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            display: true,
            position: 'top',
            labels: {
                color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary'),
                font: {
                    family: "'Inter', sans-serif",
                    size: 12
                },
                padding: 15,
                usePointStyle: true
            }
        },
        tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#fff',
            bodyColor: '#fff',
            borderColor: chartColors.primary,
            borderWidth: 1,
            padding: 12,
            displayColors: true,
            callbacks: {
                label: function (context) {
                    let label = context.dataset.label || '';
                    if (label) {
                        label += ': ';
                    }
                    label += context.parsed.y || context.parsed;
                    if (context.dataset.unit) {
                        label += context.dataset.unit;
                    }
                    return label;
                }
            }
        }
    },
    scales: {
        x: {
            grid: {
                color: 'rgba(255, 255, 255, 0.05)',
                drawBorder: false
            },
            ticks: {
                color: getComputedStyle(document.documentElement).getPropertyValue('--text-muted'),
                font: {
                    family: "'Inter', sans-serif",
                    size: 11
                }
            }
        },
        y: {
            grid: {
                color: 'rgba(255, 255, 255, 0.05)',
                drawBorder: false
            },
            ticks: {
                color: getComputedStyle(document.documentElement).getPropertyValue('--text-muted'),
                font: {
                    family: "'Inter', sans-serif",
                    size: 11
                }
            },
            beginAtZero: true
        }
    }
};

// Create gradient for chart
function createGradient(ctx, area, colorStart, colorEnd) {
    const gradient = ctx.createLinearGradient(0, area.bottom, 0, area.top);
    gradient.addColorStop(0, colorStart);
    gradient.addColorStop(1, colorEnd);
    return gradient;
}

// Export configuration
window.chartConfig = {
    colors: chartColors,
    defaultOptions: defaultChartOptions,
    createGradient: createGradient
};
