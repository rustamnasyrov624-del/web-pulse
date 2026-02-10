
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

// --- CONFIG ---
const SUPABASE_URL = 'https://htskiitfjiaeupexvalo.supabase.co';
const SUPABASE_KEY = 'sb_publishable_95k9XN77rpfdoogJThv2eg_WpN29aCd';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const store = { trades: [], sessions: [], debts: [], challenges: [], logs: [] };

function log(msg) {
    console.log(msg);
    store.logs.push(msg);
    const logEl = document.getElementById('debug-logs');
    if (logEl) logEl.innerText = store.logs.join('\n');
}

// --- INIT ---
document.addEventListener('DOMContentLoaded', async () => {
    // Add debug element
    const debug = document.createElement('div');
    debug.id = 'debug-logs';
    debug.style.display = 'none'; // Keep it hidden from user but visible in snapshot if I want
    document.body.appendChild(debug);

    log('App Init');
    updateDate();
    
    try {
        log('Fetching trades...');
        const { data: trades, error: tErr } = await supabase.from('trades').select('*');
        if (tErr) log('Trades Error: ' + tErr.message);
        store.trades = trades || [];
        log('Trades Loaded: ' + store.trades.length);

        log('Fetching sessions...');
        const { data: sessions, error: sErr } = await supabase.from('focus_sessions').select('*').eq('phase', 'flow');
        if (sErr) log('Sessions Error: ' + sErr.message);
        store.sessions = sessions || [];
        log('Sessions Loaded: ' + store.sessions.length);

        log('Fetching debts...');
        const { data: debts, error: dErr } = await supabase.from('debts').select('*');
        if (dErr) log('Debts Error: ' + dErr.message);
        store.debts = debts || [];
        log('Debts Loaded: ' + store.debts.length);

        log('Fetching challenges...');
        const { data: challenges, error: cErr } = await supabase.from('challenges').select('*');
        if (cErr) log('Challenges Error: ' + cErr.message);
        store.challenges = challenges || [];
        log('Challenges Loaded: ' + store.challenges.length);

        render();
        log('Render Complete');
    } catch (e) {
        log('Global Error: ' + e.message);
    }
    
    setupModals();
});

function render() {
    // Trading
    const resetCorrection = 2359.30; 
    const totalPnL = store.trades.reduce((s, t) => s + (parseFloat(t.pnl) || 0), 0) + resetCorrection;
    const pnlEl = document.getElementById('trading-total-pnl');
    if (pnlEl) {
        pnlEl.innerText = (totalPnL >= 0 ? '+' : '') + totalPnL.toFixed(2) + '$';
        pnlEl.style.color = totalPnL >= 0 ? '#00ff9d' : '#ff3b30';
    }
    
    const totalWins = store.trades.filter(t => (parseFloat(t.pnl) || 0) > 0).length;
    const winrate = store.trades.length > 0 ? (totalWins / store.trades.length) * 100 : 0;
    updateText('trading-winrate', winrate.toFixed(1) + '%');
    updateText('trading-count', store.trades.length);
    const wrBar = document.getElementById('trading-winrate-bar');
    if (wrBar) wrBar.style.width = winrate + '%';

    // Deep Work
    const totalMin = store.sessions.reduce((s, x) => s + (x.duration || 0), 0);
    const hours = (totalMin / 60).toFixed(1);
    updateText('deepwork-weekly', hours + 'h');
    const dwBar = document.getElementById('deepwork-progress-bar');
    if (dwBar) dwBar.style.width = Math.min((parseFloat(hours)/25)*100, 100) + '%';

    // Debt
    const totalPaid = store.debts.reduce((s, d) => s + (d.amount || 0), 0);
    updateText('debt-weekly', (totalPaid / 1000).toFixed(2) + 'k');
    updateText('debt-q1-total', (totalPaid / 1000).toFixed(2));
    const debtBar = document.getElementById('debt-progress-bar');
    if (debtBar) debtBar.style.width = Math.min((totalPaid/23000)*100, 100) + '%';

    // Challenges
    const cont = document.getElementById('challenges-container');
    if (cont) {
        cont.innerHTML = store.challenges.map(c => `
            <div class="challenge-item" style="margin-bottom:10px; padding:10px; background:rgba(255,255,255,0.05); border-radius:8px; border:1px solid rgba(255,255,255,0.1);">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <b style="color:#fff;">${c.name}</b>
                    <span class="status-badge" style="font-size:0.7rem; color:${c.status === 'Active' ? '#00ff9d' : '#ff3b30'}">${c.status.toUpperCase()}</span>
                </div>
                <div style="font-size:0.8rem; color:#888; margin-top:4px;">Equity: $${c.equity || 0}</div>
            </div>
        `).join('');
    }
}

function setupModals() {
    const modal = document.getElementById('stats-modal');
    if (!modal) return;
    
    document.querySelectorAll('.glass-card').forEach(card => {
        card.style.cursor = 'pointer';
        card.onclick = () => {
            modal.classList.add('active');
            const title = card.querySelector('.card-title')?.innerText || "Statistics";
            document.getElementById('modal-title').innerText = title;
            document.getElementById('modal-body').innerHTML = '<p style="color:#888; text-align:center; padding:20px;">Detailed history module loading...</p>';
        };
    });

    document.getElementById('modal-close-btn').onclick = () => modal.classList.remove('active');
}

function updateDate() {
    const today = new Date();
    const startOfYear = new Date('2026-01-01');
    const dayOfYear = Math.floor((today - startOfYear) / (1000 * 60 * 60 * 24)) + 1;
    updateText('current-date', today.toLocaleDateString('ru-RU'));
    updateText('day-counter', dayOfYear + '/365');
}

function updateText(id, txt) {
    const el = document.getElementById(id);
    if (el) el.innerText = txt;
}
