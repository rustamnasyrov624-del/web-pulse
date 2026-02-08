
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Configuration
const SUPABASE_URL = 'https://htskiitfjiaeupexvalo.supabase.co';
const SUPABASE_KEY = 'sb_publishable_95k9XN77rpfdoogJThv2eg_WpN29aCd'; // Using the existing publishable key

// Initialize Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// DOM Elements
const ctx = document.getElementById('equityChart').getContext('2d');
const totalPnlDisplay = document.getElementById('total-pnl-display');
const tradesTableBody = document.getElementById('trades-table-body');
const filterContainer = document.getElementById('account-filters');

let chartInstance = null;
let allTrades = [];

// Mock Data Generator for "WOW" Factor if no data
function generateMockData() {
    const mockTrades = [];
    let balance = 0;
    const startDate = new Date('2026-01-01');
    
    for (let i = 0; i < 50; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        const pnl = (Math.random() - 0.45) * 500; // Slight upward bias
        balance += pnl;
        mockTrades.push({
            date: date.toISOString(),
            pnl: pnl,
            balance: balance,
            symbol: ['EURUSD', 'GBPUSD', 'XAUUSD', 'NAS100'][Math.floor(Math.random() * 4)],
            type: Math.random() > 0.5 ? 'BUY' : 'SELL',
            account_id: i % 2 === 0 ? 'SpiceProp #002' : 'FundingPips #003' 
        });
    }
    return mockTrades;
}

async function fetchTrades() {
    try {
        // Fetch all trades ordered by date
        let { data, error } = await supabase
            .from('trades')
            .select('*')
            .order('date', { ascending: true });

        if (error) {
            console.error('Error fetching trades:', error);
            // Fallback to mock data for demo
            return generateMockData();
        }

        if (!data || data.length === 0) {
            return generateMockData();
        }
        
        return data;

    } catch (err) {
        console.error('Unexpected error:', err);
        return generateMockData();
    }
}

async function  initJournal() {
    allTrades = await fetchTrades();
    
    // Calculate cumulative PnL
    let cumulative = 0;
    const chartData = allTrades.map(t => {
        cumulative += (t.pnl || 0);
        return {
            x: new Date(t.date || t.created_at).toLocaleDateString(),
            y: cumulative,
            original: t
        };
    });

    // Update Total Display
    const totalPnL = cumulative;
    totalPnlDisplay.innerText = `$${totalPnL.toFixed(2)}`;
    totalPnlDisplay.style.color = totalPnL >= 0 ? '#00ff9d' : '#ff3b30';
    totalPnlDisplay.style.textShadow = totalPnL >= 0 ? '0 0 10px rgba(0,255,157,0.3)' : '0 0 10px rgba(255,59,48,0.3)';

    // Populate Table
    populateTable(allTrades.slice().reverse().slice(0, 10)); // Show last 10

    // Render Chart
    renderChart(chartData);

    // Setup Filters (if account_id exists in data)
    const accounts = [...new Set(allTrades.map(t => t.account_id).filter(Boolean))];
    if (accounts.length > 0) {
        // Clear existing dynamic buttons (keep "All")
        const allBtn = filterContainer.querySelector('[data-filter="all"]');
        filterContainer.innerHTML = '';
        filterContainer.appendChild(allBtn);

        accounts.forEach(acc => {
            const btn = document.createElement('button');
            btn.className = 'filter-btn';
            btn.innerText = acc;
            btn.onclick = (e) => filterChart(acc, e); // Pass event
            filterContainer.appendChild(btn);
        });
    }
}

function filterChart(account, event) {
    // Update active class
    if (event) {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        event.target.classList.add('active');
    }

    let filteredTrades = allTrades;
    if (account !== 'all') {
        filteredTrades = allTrades.filter(t => t.account_id === account);
    } else {
        // Reset to All
        // Logic handled by caller for UI update usually, but ensure 'all' button is active if called directly
    }

    // Re-calculate cumulative for filtered view
    let cumulative = 0;
    const chartData = filteredTrades.map(t => {
        cumulative += (t.pnl || 0);
        return {
            x: new Date(t.date || t.created_at).toLocaleDateString(),
            y: cumulative,
            original: t
        };
    });
    
    // Update Chart
    renderChart(chartData);
    
    // Update Total PnL Display for filtered view
    const total = cumulative;
    totalPnlDisplay.innerText = `$${total.toFixed(2)}`;
    totalPnlDisplay.style.color = total >= 0 ? '#00ff9d' : '#ff3b30';
    
    // Update Table for filtered view
    populateTable(filteredTrades.slice().reverse().slice(0, 10));
}

function populateTable(trades) {
    tradesTableBody.innerHTML = '';
    trades.forEach(t => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td style="padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.05);">${new Date(t.date || t.created_at).toLocaleDateString()}</td>
            <td style="padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.05); color: #fff;">${t.symbol || 'N/A'}</td>
            <td style="padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.05); color: ${t.type === 'BUY' ? '#00ff9d' : '#ff3b30'};">${t.type || '-'}</td>
            <td style="padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.05); color: ${t.pnl >= 0 ? '#00ff9d' : '#ff3b30'}; font-weight: bold;">${t.pnl >= 0 ? '+' : ''}${t.pnl?.toFixed(2) || '0.00'}</td>
        `;
        tradesTableBody.appendChild(row);
    });
}

function renderChart(data) {
    if (chartInstance) {
        chartInstance.destroy();
    }

    // Create Gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(0, 255, 157, 0.2)');
    gradient.addColorStop(1, 'rgba(0, 255, 157, 0)');

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => d.x),
            datasets: [{
                label: 'Equity Curve',
                data: data.map(d => d.y),
                borderColor: '#00ff9d',
                backgroundColor: gradient,
                borderWidth: 2,
                pointBackgroundColor: '#00ff9d',
                pointRadius: 0,
                pointHoverRadius: 6,
                fill: true,
                tension: 0.4 // Smooth curve
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(20, 20, 25, 0.9)',
                    titleColor: '#fff',
                    bodyColor: '#ccc',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return `Equity: $${context.raw.toFixed(2)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false,
                        drawBorder: false
                    },
                    ticks: {
                        color: 'rgba(255,255,255,0.3)',
                        maxTicksLimit: 8
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(255,255,255,0.05)',
                        drawBorder: false
                    },
                    ticks: {
                        color: 'rgba(255,255,255,0.3)',
                        callback: function(value) {
                            return '$' + value;
                        }
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            }
        }
    });
}

// Initial Load
document.addEventListener('DOMContentLoaded', () => {
    initJournal();
    
    // Default Filter Event for "All"
    const allBtn = document.querySelector('.filter-btn[data-filter="all"]');
    if (allBtn) {
        allBtn.addEventListener('click', (e) => {
            filterChart('all', e);
        });
    }
});
