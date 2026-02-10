
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const SUPABASE_URL = 'https://htskiitfjiaeupexvalo.supabase.co';
const SUPABASE_KEY = 'sb_publishable_95k9XN77rpfdoogJThv2eg_WpN29aCd';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const store = { trades: [], sessions: [], debts: [], challenges: [] };

document.addEventListener('DOMContentLoaded', async () => {
    console.log("Dashboard v11.0 Booting...");
    
    // Initial display
    updateClock();
    setInterval(updateClock, 1000);

    // Initial Load
    await forceReload();
    
    // Refresh loop
    setInterval(forceReload, 30000); // Faster refresh for "live" feel

    setupModals();
});

async function forceReload() {
    try {
        // Fetch all data with timestamp to avoid any client-side caching
        const now = Date.now();
        const [t, s, d, c] = await Promise.all([
            supabase.from('trades').select('*').order('date', { ascending: false }),
            supabase.from('focus_sessions').select('*').eq('phase', 'flow'),
            supabase.from('debts').select('*').order('date', { ascending: false }),
            supabase.from('challenges').select('*').order('id', { ascending: true })
        ]);

        if (t.error || s.error || d.error || c.error) {
            console.error("Supabase Error:", t.error || s.error || d.error || c.error);
            return;
        }

        store.trades = t.data || [];
        store.sessions = s.data || [];
        store.debts = d.data || [];
        store.challenges = c.data || [];

        render();
        console.log("Sync Complete:", new Date().toLocaleTimeString());
    } catch (e) {
        console.error("Fetch Failure:", e);
    }
}

function render() {
    const resetCorrection = 2359.30;
    
    // 1. Trading
    const totalPnL = store.trades.reduce((sum, t) => sum + (parseFloat(t.pnl) || 0), 0) + resetCorrection;
    const pnlEl = document.getElementById('trading-total-pnl');
    if (pnlEl) {
        pnlEl.innerText = totalPnL.toFixed(2);
        const card = pnlEl.closest('.glass-card');
        if (card) card.style.borderColor = totalPnL >= 0 ? 'rgba(0, 255, 157, 0.3)' : 'rgba(255, 59, 48, 0.3)';
        pnlEl.parentElement.style.color = totalPnL >= 0 ? '#00ff9d' : '#ff3b30';
    }

    const wins = store.trades.filter(t => (parseFloat(t.pnl) || 0) > 0).length;
    const winrate = store.trades.length > 0 ? (wins / store.trades.length) * 100 : 0;
    updateText('trading-winrate', winrate.toFixed(1) + '%');
    updateText('trading-count', store.trades.length);
    const wrBar = document.getElementById('trading-winrate-bar');
    if (wrBar) {
        wrBar.style.width = winrate + '%';
        wrBar.style.backgroundColor = winrate >= 50 ? '#00ff9d' : '#ff3b30';
    }

    // 2. Deep Work
    const totalHours = (store.sessions.reduce((sum, x) => sum + (x.duration || 0), 0) / 60).toFixed(1);
    updateText('deepwork-weekly', totalHours);
    const dwBar = document.getElementById('deepwork-progress-bar');
    if (dwBar) dwBar.style.width = Math.min((parseFloat(totalHours)/300)*100, 100) + '%';
    
    // 3. Debt
    const totalPaid = store.debts.reduce((sum, d) => sum + (d.amount || 0), 0);
    updateText('debt-weekly', (totalPaid / 1000).toFixed(2));
    updateText('debt-q1-total', (totalPaid / 1000).toFixed(1));
    const debtBar = document.getElementById('debt-progress-bar');
    if (debtBar) debtBar.style.width = Math.min((totalPaid/300000)*100, 100) + '%';

    // 4. Challenges
    const challengesContainer = document.getElementById('challenges-container');
    if (challengesContainer) {
        challengesContainer.innerHTML = store.challenges.map(c => {
            const pnl = (c.balance || 0) - (c.amount || 50000);
            const color = pnl >= 0 ? '#00ff9d' : '#ff3b30';
            return `
                <div class="challenge-item" style="margin-bottom:12px; padding:12px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); border-radius:10px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-weight:700; color:#fff; font-size:0.9rem;">${c.name}</span>
                        <span style="font-size:0.65rem; padding:2px 6px; border-radius:4px; background:rgba(255,255,255,0.05); color:${color}; border: 1px solid ${color}44;">${c.status.toUpperCase()}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-top:8px; font-size:0.8rem;">
                        <span style="color:#666;">Equity: $${(c.equity || 0).toLocaleString()}</span>
                        <span style="font-weight:700; color:${color}">${pnl >= 0 ? '+' : ''}${pnl.toFixed(0)}$</span>
                    </div>
                </div>
            `;
        }).join('');
    }
}

function setupModals() {
    const modal = document.getElementById('stats-modal');
    if (!modal) return;
    
    document.querySelectorAll('.glass-card').forEach(card => {
        if (card.id && card.id.startsWith('card-')) {
            card.onclick = () => {
                modal.classList.add('active');
                const title = card.querySelector('.card-title')?.innerText || "Analytics";
                document.getElementById('modal-title').innerText = title;
                document.getElementById('modal-body').innerHTML = generateModalStats(card.id);
            };
        }
    });

    document.getElementById('modal-close-btn').onclick = () => modal.classList.remove('active');
    modal.onclick = (e) => { if (e.target === modal) modal.classList.remove('active'); };
}

function generateModalStats(id) {
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)));
    startOfWeek.setHours(0,0,0,0);

    if (id === 'card-trading') {
        const total = store.trades.reduce((s, t) => s + (parseFloat(t.pnl) || 0), 0) + 2359.30;
        const weekly = store.trades.filter(t => new Date(t.date) >= startOfWeek).reduce((s, t) => s + (parseFloat(t.pnl) || 0), 0);
        return `
            <div class="stat-row"><span>Global PnL:</span><b style="color:${total>=0?'#00ff9d':'#ff3b30'}">${total.toFixed(2)}$</b></div>
            <div class="stat-row"><span>Weekly PnL:</span><b style="color:${weekly>=0?'#00ff9d':'#ff3b30'}">${weekly.toFixed(2)}$</b></div>
            <div class="stat-row"><span>Total Trades:</span><b>${store.trades.length}</b></div>
        `;
    }
    if (id === 'card-deepwork') {
        const total = store.sessions.reduce((s, x) => s + (x.duration || 0), 0);
        const weekly = store.sessions.filter(s => new Date(s.start_time) >= startOfWeek).reduce((s, x) => s + (x.duration || 0), 0);
        return `
            <div class="stat-row"><span>Total Hours:</span><b>${(total/60).toFixed(1)}h</b></div>
            <div class="stat-row"><span>This Week:</span><b>${(weekly/60).toFixed(1)}h</b></div>
            <div class="stat-row"><span>Current Goal:</span><b>25h/week</b></div>
        `;
    }
    if (id === 'card-debt') {
        const total = store.debts.reduce((s, d) => s + (d.amount || 0), 0);
        const weekly = store.debts.filter(d => new Date(d.date) >= startOfWeek).reduce((s, d) => s + (d.amount || 0), 0);
        return `
            <div class="stat-row"><span>Q1 Total Paid:</span><b>${(total/1000).toFixed(2)}k</b></div>
            <div class="stat-row"><span>This Week:</span><b>${(weekly/1000).toFixed(2)}k</b></div>
            <div class="stat-row"><span>Q1 Goal:</span><b>300k</b></div>
        `;
    }
    return "<p>Additional metrics coming soon...</p>";
}

function updateClock() {
    const d = new Date();
    updateText('current-date', d.toLocaleDateString('ru-RU'));
    const start = new Date(d.getFullYear(), 0, 1);
    const dayNum = Math.floor((d - start) / 864e5) + 1;
    updateText('day-counter', dayNum + '/365');
}

function updateText(id, txt) {
    const el = document.getElementById(id);
    if (el) el.innerText = txt;
}
