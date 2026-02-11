
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Configuration
const SUPABASE_URL = 'https://htskiitfjiaeupexvalo.supabase.co';
const SUPABASE_KEY = 'sb_publishable_95k9XN77rpfdoogJThv2eg_WpN29aCd'; 

// Reset Correction: Manual adjustment for failed challenges (fees/losses not in trades)
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
    
    // Normalize Account Names
    allTrades.forEach(t => {
        if (!t.account_id) return;

        // Auto-fix labels for consistency
        if (t.account_id === 'SpiceProp #001') t.account_id = 'SpiceProp #001 (Failed)';
        if (t.account_id === 'SpiceProp #002') t.account_id = 'SpiceProp #002 (Failed)';
        if (t.account_id === 'FundingPips #003') t.account_id = 'Funding Pips (Failed)';
        if (t.account_id === 'Funding Pips #003 (Failed)') t.account_id = 'Funding Pips (Failed)';
        
        // Phase normalization
        if (t.account_id === 'Funding Pips') t.account_id = 'Funding Pips P1';
        if (t.account_id === 'SpiceProp') t.account_id = 'SpiceProp P1';
    });
    
    updateView('all');
    setupFilters();
}

function setupFilters() {
    const accounts = [...new Set(allTrades.map(t => t.account_id).filter(Boolean))];
    
    const active = accounts.filter(acc => !acc.includes('Failed'));
    const archive = accounts.filter(acc => acc.includes('Failed'));

    filterContainer.innerHTML = '';
    
    // Header for All
    const allBtn = document.createElement('button');
    allBtn.className = 'filter-btn active';
    allBtn.innerText = 'All Accounts';
    allBtn.onclick = () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        allBtn.classList.add('active');
        updateView('all');
    };
    filterContainer.appendChild(allBtn);

    // Active Challenges Section
    if (active.length > 0) {
        const title = document.createElement('div');
        title.style.cssText = 'width: 100%; margin: 20px 0 10px 0; font-size: 0.6rem; opacity: 0.3; letter-spacing: 2px; text-transform: uppercase;';
        title.innerText = 'Active Challenges';
        filterContainer.appendChild(title);
        
        active.sort().forEach(acc => {
            const btn = document.createElement('button');
            btn.className = 'filter-btn';
            btn.innerText = acc;
            btn.onclick = () => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                updateView(acc);
            };
            filterContainer.appendChild(btn);
        });
    }

    // Archive Section
    if (archive.length > 0) {
        const title = document.createElement('div');
        title.style.cssText = 'width: 100%; margin: 20px 0 10px 0; font-size: 0.6rem; opacity: 0.3; letter-spacing: 2px; text-transform: uppercase;';
        title.innerText = 'Archive / Failed';
        filterContainer.appendChild(title);
        
        archive.sort().forEach(acc => {
            const btn = document.createElement('button');
            btn.className = 'filter-btn archive-btn';
            btn.innerText = acc;
            btn.onclick = () => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                updateView(acc);
            };
            filterContainer.appendChild(btn);
        });
    }
}

function updateView(accountFilter) {
    let filteredTrades = allTrades;
    if (accountFilter !== 'all') {
        filteredTrades = allTrades.filter(t => t.account_id === accountFilter);
    }

    // Calculate cumulative and identify resets
    let cumulative = 0;
    const chartData = [];
    const resets = [];

    filteredTrades.forEach((t, index) => {
        cumulative += (t.pnl || 0);
        chartData.push({
            x: new Date(t.date || t.created_at).toLocaleDateString(),
            y: cumulative
        });

        // "RESET" Logic: If account name contains "(Failed)" or symbol is "**RESET**"
        if (t.account_id && t.account_id.includes('(Failed)')) {
            const nextTrade = filteredTrades[index + 1];
            if (!nextTrade || nextTrade.account_id !== t.account_id) {
                resets.push(chartData.length - 1);
            }
        } else if (t.symbol === '**RESET**') {
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

    // Update Table
    populateTable(filteredTrades.slice().reverse().slice(0, 20));

    // Render Chart
    renderChart(chartData, resets);
}

function populateTable(trades) {
    tradesTableBody.innerHTML = '';
    trades.forEach(t => {
        const row = document.createElement('tr');
        const color = (t.pnl || 0) >= 0 ? 'var(--neon-green)' : 'var(--neon-red)';
        const accName = t.account_id || 'Unknown';
        
        row.innerHTML = `
            <td style="padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.05);">
                <div style="font-size: 0.85rem;">${new Date(t.date || t.created_at).toLocaleDateString()}</div>
                <div style="font-size: 0.65rem; opacity: 0.5; color: ${accName.includes('Failed') ? 'var(--neon-red)' : '#fff'}">${accName}</div>
            </td>
            <td style="padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.05); color: #fff; font-family: var(--font-mono);">${t.symbol || 'N/A'}</td>
            <td style="padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 0.7rem; color: ${(t.direction?.toUpperCase() === 'LONG' || t.direction?.toUpperCase() === 'BUY' || t.type?.toUpperCase() === 'BUY') ? 'var(--neon-green)' : 'var(--neon-red)'};">${(t.direction || t.type || '-').toUpperCase()}</td>
            <td style="padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.05); color: ${color}; font-weight: bold;">${(t.pnl || 0) >= 0 ? '+' : ''}${t.pnl?.toFixed(2) || '0.00'}</td>
        `;
        tradesTableBody.appendChild(row);
    });
}

function renderChart(data, resets) {
    if (chartInstance) chartInstance.destroy();

    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(0, 255, 157, 0.1)');
    gradient.addColorStop(1, 'rgba(0, 255, 157, 0)');

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => d.x),
            datasets: [{
                label: 'Equity',
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
        },
        plugins: [{
            id: 'resets',
            afterDraw: (chart) => {
                const {ctx, scales: {x, y}} = chart;
                resets.forEach(resetIdx => {
                    const xPos = x.getPixelForValue(chart.data.labels[resetIdx]);
                    
                    // Draw vertical line with gradient
                    const gradient = ctx.createLinearGradient(0, y.top, 0, y.bottom);
                    gradient.addColorStop(0, 'rgba(255, 59, 48, 1)');
                    gradient.addColorStop(1, 'rgba(255, 59, 48, 0)');
                    
                    ctx.save();
                    ctx.beginPath();
                    ctx.strokeStyle = gradient;
                    ctx.lineWidth = 2;
                    ctx.setLineDash([6, 4]);
                    ctx.moveTo(xPos, y.top);
                    ctx.lineTo(xPos, y.bottom);
                    ctx.stroke();
                    
                    // Draw Badge
                    const label = 'ACCOUNT RESET';
                    ctx.font = 'bold 10px "Space Grotesk", sans-serif';
                    const textWidth = ctx.measureText(label).width;
                    const padding = 6;
                    
                    ctx.fillStyle = 'rgba(255, 59, 48, 0.9)';
                    
                    // Helper-like drawing for rounded rect
                    const bx = xPos - (textWidth/2 + padding);
                    const by = y.top + 10;
                    const bw = textWidth + (padding * 2);
                    const bh = 20;
                    const r = 4;
                    
                    ctx.beginPath();
                    ctx.moveTo(bx + r, by);
                    ctx.lineTo(bx + bw - r, by);
                    ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + r);
                    ctx.lineTo(bx + bw, by + bh - r);
                    ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - r, by + bh);
                    ctx.lineTo(bx + r, by + bh);
                    ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - r);
                    ctx.lineTo(bx, by + r);
                    ctx.quadraticCurveTo(bx, by, bx + r, by);
                    ctx.closePath();
                    ctx.fill();
                    
                    ctx.fillStyle = '#fff';
                    ctx.textAlign = 'center';
                    ctx.fillText(label, xPos, y.top + 23);
                    
                    ctx.restore();
                });
            }
        }]
    });
}

document.addEventListener('DOMContentLoaded', initJournal);
