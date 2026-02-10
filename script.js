
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

// --- CONFIGURATION ---
const SUPABASE_URL = 'https://htskiitfjiaeupexvalo.supabase.co';
const SUPABASE_KEY = 'sb_publishable_95k9XN77rpfdoogJThv2eg_WpN29aCd';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const GOALS = {
    deepWorkWeekly: 25,
    debtTotal: 300000,
    subsQ1: 200
};

// Reset Correction: Manual adjustment for failed challenges (fees/losses not in trades)
// Update this value if you need to subtract a specific amount from the Total PnL
const RESET_CORRECTION = 0; 

// --- STATE MANAGEMENT ---
const store = {
    trades: [],
    sessions: [],
    debts: [],
    challenges: [],
    currentModal: null, // 'trading', 'deepwork', 'debt'
    activeTab: 'week'   // 'week', 'month', 'year'
};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
    initDateDisplay();
    await fetchData();
    renderDashboard();
    setupInteractions();
    
    // Auto-refresh every 5 minutes
    setInterval(async () => {
        await fetchData();
        renderDashboard();
    }, 300000);
});

// --- DATA FETCHING ---
async function fetchData() {
    try {
        const [trades, sessions, debts, challenges] = await Promise.all([
            supabase.from('trades').select('pnl, date, type').order('date', { ascending: false }),
            supabase.from('focus_sessions').select('duration, start_time').eq('phase', 'flow'),
            supabase.from('debts').select('amount, date'),
            supabase.from('challenges').select('*').order('id', { ascending: true })
        ]);

        store.trades = trades.data || [];
        store.sessions = sessions.data || [];
        store.debts = debts.data || [];
        store.challenges = challenges.data || [];
        
    } catch (err) {
        console.error('Data sync error:', err);
    }
}

// --- RENDERING DASHBOARD ---
function renderDashboard() {
    renderTradingCard();
    renderDeepWorkCard();
    renderDebtCard();
    renderChallenges();
    renderSubs(); // Keeping static/local logic for subs if needed
}

function renderTradingCard() {
    const { startOfWeek } = getTimeFrames();
    const weeklyTrades = store.trades.filter(t => new Date(t.date) >= startOfWeek);
    // const weeklyPnL = weeklyTrades.reduce((sum, t) => sum + (parseFloat(t.pnl) || 0), 0);
    const totalPnL = store.trades.reduce((sum, t) => sum + (parseFloat(t.pnl) || 0), 0) + RESET_CORRECTION;
    
    const wins = weeklyTrades.filter(t => (parseFloat(t.pnl) || 0) > 0).length;
    const winrate = weeklyTrades.length > 0 ? (wins / weeklyTrades.length) * 100 : 0;

    updateText('trading-total-pnl', totalPnL.toFixed(2));
    styleElement('trading-total-pnl', 'color', totalPnL >= 0 ? '#00ff9d' : '#ff3b30');
    
    updateText('trading-winrate', `${winrate.toFixed(1)}%`);
    styleElement('trading-winrate-bar', 'width', `${winrate}%`);
    updateText('trading-count', weeklyTrades.length);
    
    bindModal('trading-total-pnl', 'trading');
}

function renderDeepWorkCard() {
    const { startOfWeek } = getTimeFrames();
    const weeklySessions = store.sessions.filter(s => new Date(s.start_time) >= startOfWeek);
    const weeklyHours = (weeklySessions.reduce((sum, s) => sum + (s.duration || 0), 0) / 60).toFixed(1);
    
    const progress = Math.min((weeklyHours / GOALS.deepWorkWeekly) * 100, 100);

    updateText('deepwork-weekly', weeklyHours);
    styleElement('deepwork-progress-bar', 'width', `${progress}%`);
    styleElement('deepwork-progress-bar', 'boxShadow', progress > 0 ? `0 0 ${progress * 0.1}px #00ff9d` : 'none');
    
    bindModal('deepwork-weekly', 'deepwork');
}

function renderDebtCard() {
    const { startOfWeek } = getTimeFrames();
    const weeklyDebts = store.debts.filter(d => new Date(d.date) >= startOfWeek);
    const weeklyRepaid = weeklyDebts.reduce((sum, d) => sum + (d.amount || 0), 0);
    
    // Goals are in absolute numbers (e.g., 300,000)
    const progress = Math.min((weeklyRepaid / 23000) * 100, 100); // 23k weekly goal

    updateText('debt-weekly', (weeklyRepaid / 1000).toFixed(2));
    styleElement('debt-progress-bar', 'width', `${progress}%`);
    
    // Update global/Q1 stats if elements exist
    const q1Total = store.debts.reduce((sum, d) => sum + (d.amount || 0), 0);
    updateText('debt-q1-total', (q1Total / 1000).toFixed(0));

    bindModal('debt-weekly', 'debt');
}

function renderChallenges() {
    const container = document.getElementById('challenges-container');
    if (!container) return;
    
    container.innerHTML = '';
    store.challenges.forEach(c => {
        const startBal = c.amount || 50000;
        const current = c.balance !== null ? c.balance : startBal;
        const pnl = current - startBal;
        const color = pnl >= 0 ? '#00ff9d' : '#ff3b30';
        
        const el = document.createElement('div');
        el.style.cssText = 'margin-bottom: 12px; padding: 10px; background: rgba(255,255,255,0.03); border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);';
        el.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <span style="font-weight: 600; font-size: 0.9rem; color: #fff;">${c.name}</span>
                <span style="font-size: 0.7rem; padding: 2px 8px; border-radius: 4px; background: rgba(255,255,255,0.05); color: ${c.status === 'Active' ? '#00ff9d' : '#ff3b30'};">${c.status}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: #999;">
                    <span>${(startBal/1000)}k Account</span>
                    <span style="color: ${color}">${pnl >= 0 ? '+' : ''}${pnl.toFixed(0)}$</span>
            </div>
        `;
        container.appendChild(el);
    });
}

function renderSubs() {
    // Keeping static logic for now as no table specified
    const bar = document.getElementById('subs-bar');
    if (bar) bar.style.width = '37.5%';
}

// --- MODAL SYSTEM ---
function setupInteractions() {
    // Close button
    document.getElementById('modal-close-btn')?.addEventListener('click', closeModal);
    
    // Tabs
    ['week', 'month', 'year'].forEach(t => {
        document.getElementById(`tab-${t}`)?.addEventListener('click', () => switchTab(t));
    });

    // Close on overlay click
    document.getElementById('stats-modal')?.addEventListener('click', (e) => {
        if (e.target.id === 'stats-modal') closeModal();
    });
}

function bindModal(elementId, type) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const card = el.closest('.stat-card');
    if (card) {
        card.style.cursor = 'pointer';
        card.onclick = () => openModal(type);
    }
}

function openModal(type) {
    store.currentModal = type;
    store.activeTab = 'week';
    updateTabs();
    
    const modal = document.getElementById('stats-modal');
    modal.classList.add('active');
    
    updateModalContent();
}

function closeModal() {
    document.getElementById('stats-modal').classList.remove('active');
    store.currentModal = null;
}

function switchTab(tab) {
    store.activeTab = tab;
    updateTabs();
    updateModalContent();
}

function updateTabs() {
    ['week', 'month', 'year'].forEach(t => {
        const btn = document.getElementById(`tab-${t}`);
        if (btn) {
            if (t === store.activeTab) btn.classList.add('active');
            else btn.classList.remove('active');
        }
    });
}

function updateModalContent() {
    if (!store.currentModal) return;

    const { start } = getPeriodStart(store.activeTab);
    const body = document.getElementById('modal-body');
    const title = document.getElementById('modal-title');
    
    let html = '';
    
    if (store.currentModal === 'trading') {
        title.innerText = 'Trading Performance';
        const filtered = store.trades.filter(t => new Date(t.date) >= start);
        const pnl = filtered.reduce((sum, t) => sum + (parseFloat(t.pnl) || 0), 0);
        // Apply reset correction ONLY to Year/All time if desired, or just raw sum for periods
        // Logic: For 'year', we might want global PnL. For now, strict period sum.
        
        const wins = filtered.filter(t => (parseFloat(t.pnl) || 0) > 0).length;
        const winrate = filtered.length > 0 ? (wins / filtered.length) * 100 : 0;
        
        html = `
            <div class="stat-row">
                <span class="stat-label">Net PnL</span>
                <span class="stat-val ${pnl >= 0 ? 'positive' : 'negative'}">${formatCurrency(pnl)}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Winrate</span>
                <span class="stat-val">${winrate.toFixed(1)}%</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Trades Taken</span>
                <span class="stat-val">${filtered.length}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Average PnL</span>
                <span class="stat-val">${filtered.length > 0 ? formatCurrency(pnl/filtered.length) : '$0.00'}</span>
            </div>
        `;
    } 
    else if (store.currentModal === 'deepwork') {
        title.innerText = 'Deep Work Analytics';
        const filtered = store.sessions.filter(s => new Date(s.start_time) >= start);
        const minutes = filtered.reduce((sum, s) => sum + (s.duration || 0), 0);
        const hours = minutes / 60;
        
        html = `
            <div class="stat-row">
                <span class="stat-label">Total Hours</span>
                <span class="stat-val positive">${hours.toFixed(1)}h</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Sessions</span>
                <span class="stat-val">${filtered.length}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Avg Session</span>
                <span class="stat-val">${filtered.length > 0 ? (minutes/filtered.length).toFixed(0) + ' min' : '0 min'}</span>
            </div>
        `;
    }
    else if (store.currentModal === 'debt') {
        title.innerText = 'Debt Repayment';
        const filtered = store.debts.filter(d => new Date(d.date) >= start);
        const repaid = filtered.reduce((sum, d) => sum + (d.amount || 0), 0);
        
        html = `
            <div class="stat-row">
                <span class="stat-label">Repaid</span>
                <span class="stat-val positive">${formatCurrency(repaid/1000)}k</span> <!-- Display in k -->
            </div>
            <div class="stat-row">
                <span class="stat-label">Transactions</span>
                <span class="stat-val">${filtered.length}</span>
            </div>
        `;
    }

    body.innerHTML = html;
}

// --- UTILITIES ---
function initDateDisplay() {
    const today = new Date();
    const startOfYear = new Date('2026-01-01');
    const dayOfYear = Math.floor((today - startOfYear) / (1000 * 60 * 60 * 24)) + 1;
    
    updateText('current-date', today.toLocaleDateString('ru-RU'));
    const dayValEl = document.querySelector('.hero-stats .stat-item:last-child .value');
    if (dayValEl) dayValEl.innerText = `${dayOfYear}/365`;
}

function getTimeFrames() {
    const now = new Date();
    
    // Start of Week (Monday)
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0,0,0,0);
    
    return { startOfWeek };
}

function getPeriodStart(period) {
    const now = new Date();
    now.setHours(0,0,0,0);
    
    if (period === 'week') {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        const start = new Date(now);
        start.setDate(diff);
        return { start };
    }
    else if (period === 'month') {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        return { start };
    }
    else if (period === 'year') {
        const start = new Date(now.getFullYear(), 0, 1);
        return { start };
    }
    return { start: new Date(0) };
}

function updateText(id, text) {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
}

function styleElement(id, prop, value) {
    const el = document.getElementById(id);
    if (el) el.style[prop] = value;
}

function formatCurrency(val) {
    const v = parseFloat(val);
    return (v >= 0 ? '+' : '') + '$' + Math.abs(v).toFixed(2);
}
