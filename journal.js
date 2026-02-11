
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Configuration
const SUPABASE_URL = 'https://htskiitfjiaeupexvalo.supabase.co';
const SUPABASE_KEY = 'sb_publishable_95k9XN77rpfdoogJThv2eg_WpN29aCd'; 

// Reset Correction
const RESET_CORRECTION = 0; 

// Initialize Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// DOM Elements
const ctx = document.getElementById('equityChart').getContext('2d');
const totalPnlDisplay = document.getElementById('total-pnl-display');
const tradesTableBody = document.getElementById('trades-table-body');
const filterContainer = document.getElementById('account-filters');

let chartInstance = null;
let allTrades = [];

async function fetchTrades() {
    try {
        let { data, error } = await supabase
            .from('trades')
            .select('*')
            .order('date', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('Error fetching trades:', err);
        return [];
    }
}

async function initJournal() {
    allTrades = await fetchTrades();
    
    // Normalize Account Names (Legacy fix if any nulls left)
    allTrades.forEach(t => {
        if (!t.account_id) {
            t.account_id = 'Legacy / History';
        }
    });
    
    updateView('all');
    setupFilters();
}

function setupFilters() {
    const accounts = [...new Set(allTrades.map(t => t.account_id).filter(Boolean))];
    
    const activeAccs = accounts.filter(acc => acc.includes('P1') || acc.includes('P2'));
    const archiveAccs = accounts.filter(acc => !acc.includes('P1') && !acc.includes('P2'));

    filterContainer.innerHTML = '';
    
    // Total button
    const allBtn = document.createElement('button');
    allBtn.className = 'filter-btn active';
    allBtn.innerText = 'All Challenges';
    allBtn.onclick = () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        allBtn.classList.add('active');
        updateView('all');
    };
    filterContainer.appendChild(allBtn);

    // Section Labels
    const createSection = (titleText, accList, isArchive = false) => {
        if (accList.length === 0) return;
        const title = document.createElement('div');
        title.className = 'section-label';
        title.innerText = titleText;
        filterContainer.appendChild(title);
        
        accList.sort().forEach(acc => {
            const btn = document.createElement('button');
            btn.className = `filter-btn ${isArchive ? 'archive-btn' : 'challenge-btn'}`;
            btn.innerText = acc;
            btn.onclick = () => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                updateView(acc);
            };
            filterContainer.appendChild(btn);
        });
    };

    createSection('Active Challenges', activeAccs);
    createSection('Archives & History', archiveAccs, true);
}

function updateView(accountFilter) {
    let filteredTrades = allTrades;
    if (accountFilter !== 'all') {
        filteredTrades = allTrades.filter(t => t.account_id === accountFilter);
    }

    // Separate Active (pnl is null) and Realized
    const activePositions = filteredTrades.filter(t => t.pnl === null);
    const realizedTrades = filteredTrades.filter(t => t.pnl !== null);

    // Calculate cumulative only for realized
    let cumulative = 0;
    const chartData = [];
    const resets = [];

    realizedTrades.forEach((t, index) => {
        cumulative += (t.pnl || 0);
        chartData.push({
            x: new Date(t.date || t.created_at).toLocaleDateString(),
            y: cumulative
        });

        if (t.symbol === '**RESET**') {
            resets.push(chartData.length - 1);
        }
    });

    if (accountFilter === 'all') {
        cumulative += RESET_CORRECTION;
        if (chartData.length > 0) chartData[chartData.length - 1].y = cumulative;
    }

    // Update Total Display
    totalPnlDisplay.innerText = `$${cumulative.toFixed(2)}`;
    totalPnlDisplay.style.color = cumulative >= 0 ? 'var(--neon-green)' : 'var(--neon-red)';

    // Update Table with Sections
    renderTable(activePositions, realizedTrades);

    // Render Chart
    renderChart(chartData, resets);
}

function renderTable(active, realized) {
    tradesTableBody.innerHTML = '';

    // 1. Render Active Positions Header
    if (active.length > 0) {
        const headerRow = document.createElement('tr');
        headerRow.innerHTML = `
            <td colspan="4" style="padding: 20px 12px 10px 12px; font-family: var(--font-heading); font-size: 0.7rem; color: var(--neon-green); opacity: 0.8; letter-spacing: 2px;">
                ◉ CURRENT OPEN POSITIONS (${active.length})
            </td>
        `;
        tradesTableBody.appendChild(headerRow);

        active.slice().reverse().forEach(t => {
            tradesTableBody.appendChild(createTradeRow(t, true));
        });
    }

    // 2. Render Realized Trades Header
    const headerRowRel = document.createElement('tr');
    headerRowRel.innerHTML = `
        <td colspan="4" style="padding: 30px 12px 10px 12px; font-family: var(--font-heading); font-size: 0.7rem; color: var(--text-secondary); opacity: 0.5; letter-spacing: 2px;">
            HISTORY / REALIZED TRADES
        </td>
    `;
    tradesTableBody.appendChild(headerRowRel);

    realized.slice().reverse().slice(0, 50).forEach(t => {
        tradesTableBody.appendChild(createTradeRow(t, false));
    });
}

function createTradeRow(t, isActive = false) {
    const row = document.createElement('tr');
    const color = isActive ? '#fff' : ((t.pnl || 0) >= 0 ? 'var(--neon-green)' : 'var(--neon-red)');
    const accName = t.account_id || 'Unknown';
    
    row.style.opacity = isActive ? '1' : '0.8';
    if (isActive) row.style.background = 'rgba(0, 255, 157, 0.02)';

    row.innerHTML = `
        <td style="padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.05);">
            <div style="font-size: 0.85rem;">${new Date(t.date || t.created_at).toLocaleDateString()}</div>
            <div style="font-size: 0.65rem; opacity: 0.5; color: ${accName.includes('Failed') ? 'var(--neon-red)' : '#fff'}">${accName}</div>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.05); color: #fff; font-family: var(--font-mono);">${t.symbol || 'N/A'}</td>
        <td style="padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 0.7rem; color: ${(t.direction?.toUpperCase() === 'LONG' || t.direction?.toUpperCase() === 'BUY' || t.type?.toUpperCase() === 'BUY') ? 'var(--neon-green)' : 'var(--neon-red)'};">${(t.direction || t.type || '-').toUpperCase()}</td>
        <td style="padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.05); color: ${color}; font-weight: bold;">
            ${isActive ? '<span style="color:var(--text-muted); font-weight: normal; font-size: 0.6rem;">OPEN</span>' : ((t.pnl || 0) >= 0 ? '+' : '') + (t.pnl?.toFixed(2) || '0.00')}
        </td>
    `;
    return row;
}

function renderChart(data, resets) {
    if (chartInstance) chartInstance.destroy();
    if (data.length === 0) return;

    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(0, 255, 157, 0.1)');
    gradient.addColorStop(1, 'rgba(0, 255, 157, 0)');

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => d.x),
            datasets: [{
                label: 'Realized Equity',
                data: data.map(d => d.y),
                borderColor: '#00ff9d',
                backgroundColor: gradient,
                borderWidth: 2,
                pointRadius: 0,
                pointHoverRadius: 5,
                fill: true,
                tension: 0.2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(10, 10, 15, 0.9)',
                    titleColor: '#fff',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1
                }
            },
            scales: {
                x: { grid: { display: false }, ticks: { color: '#555', maxTicksLimit: 10 } },
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#555' } }
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', initJournal);
