
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Configuration
const SUPABASE_URL = 'https://htskiitfjiaeupexvalo.supabase.co';
const SUPABASE_KEY = 'sb_publishable_95k9XN77rpfdoogJThv2eg_WpN29aCd'; 

// Manual Adjustment for Dashboard
const RESET_CORRECTION = 2359.30; 

// Initialize Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// DOM Elements
const ctx = document.getElementById('equityChart').getContext('2d');
const totalPnlDisplay = document.getElementById('total-pnl-display');
const tradesTableBody = document.getElementById('trades-table-body');
const filterContainer = document.getElementById('account-filters');

let chartInstance = null;
let allTradesRaw = [];

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
    allTradesRaw = await fetchTrades();
    
    // HEURISTIC CLEANING & LABELING
    // We only process trades that have an account_id or specific markers
    // This removes import noise and NULL duplicates
    const cleanedTrades = allTradesRaw.filter(t => {
        // 1. Must have an account_id
        if (!t.account_id) return false;
        
        // 2. Filter out tiny artifacts (Dust)
        if (t.pnl !== null && Math.abs(t.pnl) < 0.1 && t.symbol !== '**RESET**') return false;
        
        return true;
    });

    // Label Normalization
    cleanedTrades.forEach(t => {
        const acc = t.account_id;
        
        // Active Challenges Phase 1
        if (acc === 'Funding Pips' || acc === 'FundingPips #003' || acc === 'Funding Pips P1') {
            t.account_id = 'Funding Pips Challenge P1';
        } else if (acc === 'SpiceProp' || acc === 'SpiceProp #002' || acc === 'SpiceProp P1') {
            t.account_id = 'SpiceProp Challenge P1';
        } else if (acc === 'SpiceProp #001') {
            t.account_id = 'SpiceProp #001 (Failed)';
        }
    });
    
    window.journalData = cleanedTrades;
    updateView('all');
    setupFilters();
}

function setupFilters() {
    const data = window.journalData || [];
    const accounts = [...new Set(data.map(t => t.account_id))];
    
    const activeAccs = accounts.filter(acc => acc.includes('Challenge'));
    const archiveAccs = accounts.filter(acc => !acc.includes('Challenge'));

    filterContainer.innerHTML = '';
    
    // Total button
    const allBtn = document.createElement('button');
    allBtn.className = 'filter-btn active';
    allBtn.innerText = 'TOTAL PORTFOLIO';
    allBtn.onclick = () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        allBtn.classList.add('active');
        updateView('all');
    };
    filterContainer.appendChild(allBtn);

    const createSection = (titleText, list, isArchive = false) => {
        if (list.length === 0) return;
        const title = document.createElement('div');
        title.className = 'section-label';
        title.innerText = titleText;
        filterContainer.appendChild(title);
        
        list.sort().forEach(acc => {
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

    createSection('Active Cycles', activeAccs);
    createSection('History & Archive', archiveAccs, true);
}

function updateView(accountFilter) {
    const data = window.journalData || [];
    let filtered = data;
    if (accountFilter !== 'all') {
        filtered = data.filter(t => t.account_id === accountFilter);
    }

    // DIVIDE: Active vs Realized
    const active = filtered.filter(t => t.pnl === null);
    const realized = filtered.filter(t => t.pnl !== null);

    // Calculate Realized Stats
    let totalPnL = realized.reduce((sum, t) => sum + (t.pnl || 0), 0) + (accountFilter === 'all' ? RESET_CORRECTION : 0);
    
    totalPnlDisplay.innerText = `$${totalPnL.toFixed(2)}`;
    totalPnlDisplay.style.color = totalPnL >= 0 ? 'var(--neon-green)' : 'var(--neon-red)';

    // Table Content
    renderTable(active, realized);

    // Chart (Realized Equity)
    let cumulative = 0;
    const chartPoints = realized.map(t => {
        cumulative += t.pnl;
        return { x: new Date(t.date || t.created_at).toLocaleDateString(), y: cumulative };
    });
    renderChart(chartPoints);
}

function renderTable(active, realized) {
    tradesTableBody.innerHTML = '';

    // 1. ACTIVE POSITIONS SECTION
    if (active.length > 0) {
        const h = document.createElement('tr');
        h.innerHTML = `<td colspan="7" class="table-section-header">◉ OPEN POSITIONS [MARKET]</td>`;
        tradesTableBody.appendChild(h);

        active.slice().reverse().forEach(t => {
            tradesTableBody.appendChild(createRow(t, true));
        });
    }

    // 2. REALIZED HISTORY SECTION
    if (realized.length > 0) {
        const h = document.createElement('tr');
        h.innerHTML = `<td colspan="7" class="table-section-header">▽ CLOSED TRADES [REALIZED]</td>`;
        tradesTableBody.appendChild(h);

        realized.slice().reverse().slice(0, 50).forEach(t => {
            tradesTableBody.appendChild(createRow(t, false));
        });
    }
}

function createRow(t, isActive) {
    const tr = document.createElement('tr');
    if (isActive) tr.className = 'active-pos-row';
    
    const statusText = isActive ? '<span class="status-badge-open">LIVE</span>' : (t.pnl >= 0 ? '+' : '') + t.pnl.toFixed(2);
    const pnlColor = isActive ? 'var(--neon-green)' : (t.pnl >= 0 ? 'var(--neon-green)' : 'var(--neon-red)');

    // Parse SL/TP from notes if available
    let sl = '-', tp = '-';
    if (t.notes) {
        const slMatch = t.notes.match(/SL:\s*([\d\.]+)/);
        const tpMatch = t.notes.match(/TP:\s*([\d\.]+)/);
        if (slMatch) sl = slMatch[1];
        if (tpMatch) tp = tpMatch[1];
    }
    
    // Fallback for entry if not set
    const entry = t.entry_price ? t.entry_price : '-';

    tr.innerHTML = `
        <td style="padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.03);">
            <div style="font-size: 0.8rem;">${new Date(t.date || t.created_at).toLocaleDateString()}</div>
            <div style="font-size: 0.6rem; opacity: 0.4;">${t.account_id}</div>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.03); font-family: var(--font-mono); color: #fff;">${t.symbol}</td>
        <td style="padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.03); font-size: 0.7rem; color: ${(t.direction === 'LONG' || t.direction === 'BUY') ? 'var(--neon-green)' : 'var(--neon-red)'}">${t.direction}</td>
        <td style="padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.03); font-family: var(--font-mono); font-size: 0.8rem;">${entry}</td>
        <td style="padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.03); font-family: var(--font-mono); font-size: 0.8rem; color: var(--neon-red);">${sl}</td>
        <td style="padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.03); font-family: var(--font-mono); font-size: 0.8rem; color: var(--neon-green);">${tp}</td>
        <td style="padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.03); color: ${pnlColor}; font-weight: 700; text-align: right;">${statusText}</td>
    `;
    return tr;
}

function renderChart(points) {
    if (chartInstance) chartInstance.destroy();
    if (points.length === 0) return;

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: points.map(p => p.x),
            datasets: [{
                data: points.map(p => p.y),
                borderColor: '#00ff9d',
                backgroundColor: 'rgba(0, 255, 157, 0.05)',
                borderWidth: 2,
                pointRadius: 0,
                fill: true,
                tension: 0.2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false }, ticks: { color: '#444', maxTicksLimit: 8 } },
                y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#444' } }
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', initJournal);
