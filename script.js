
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const SUPABASE_URL = 'https://htskiitfjiaeupexvalo.supabase.co';
const SUPABASE_KEY = 'sb_publishable_95k9XN77rpfdoogJThv2eg_WpN29aCd';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const store = { trades: [], sessions: [], debts: [], challenges: [], status: 'init' };

document.addEventListener('DOMContentLoaded', async () => {
    updateDate();
    console.log("Dashboard Starting...");
    try {
        await reloadData();
        setupModals();
        store.status = 'ready';
    } catch (err) {
        console.error("Dashboard Init Error:", err);
        store.status = 'error';
    }
    
    setInterval(reloadData, 60000);
});

async function reloadData() {
    console.log("Syncing with Supabase...");
    try {
        const [t, s, d, c] = await Promise.all([
            supabase.from('trades').select('*'),
            supabase.from('focus_sessions').select('*').eq('phase', 'flow'),
            supabase.from('debts').select('*'),
            supabase.from('challenges').select('*').order('id', { ascending: true })
        ]);

        if (t.error) throw t.error;
        
        store.trades = t.data || [];
        store.sessions = s.data || [];
        store.debts = d.data || [];
        store.challenges = c.data || [];
        
        console.log(`Data loaded: ${store.trades.length} trades, ${store.sessions.length} sessions`);
        render();
    } catch (e) { 
        console.error('Supabase Sync Error:', e);
        store.status = 'sync_error';
    }
}

function render() {
    // 1. Trading -> GLOBAL TOTAL
    const resetCorrection = 2359.30;
    const totalPnL = store.trades.reduce((s, t) => s + (parseFloat(t.pnl) || 0), 0) + resetCorrection;
    updateText('trading-total-pnl', totalPnL.toFixed(2));
    
    const pnlWrapper = document.getElementById('trading-total-pnl')?.parentElement;
    if (pnlWrapper) {
        pnlWrapper.style.color = totalPnL >= 0 ? '#00ff9d' : '#ff3b30';
    }
    
    const wins = store.trades.filter(t => (parseFloat(t.pnl) || 0) > 0).length;
    const winrate = store.trades.length > 0 ? (wins / store.trades.length) * 100 : 0;
    updateText('trading-winrate', winrate.toFixed(1) + '%');
    updateText('trading-count', store.trades.length);
    const wrBar = document.getElementById('trading-winrate-bar');
    if (wrBar) wrBar.style.width = winrate + '%';

    // 2. Deep Work -> TOTAL
    const totalMin = store.sessions.reduce((s, x) => s + (x.duration || 0), 0);
    const totalHours = (totalMin / 60).toFixed(1);
    updateText('deepwork-weekly', totalHours);
    const dwLabel = document.querySelector('#card-deepwork .label');
    if (dwLabel) dwLabel.innerText = 'TOTAL FOCUS TIME';
    const dwBar = document.getElementById('deepwork-progress-bar');
    if (dwBar) dwBar.style.width = Math.min((parseFloat(totalHours)/300)*100, 100) + '%';

    // 3. Debt -> TOTAL (Q1)
    const q1TotalPaid = store.debts.reduce((s, d) => s + (d.amount || 0), 0);
    updateText('debt-weekly', (q1TotalPaid / 1000).toFixed(2));
    updateText('debt-q1-total', (q1TotalPaid / 1000).toFixed(2));
    const debtLabel = document.querySelector('#card-debt .label');
    if (debtLabel) debtLabel.innerText = 'TOTAL PAID / 300k GOAL';
    const debtBar = document.getElementById('debt-progress-bar');
    if (debtBar) debtBar.style.width = Math.min((q1TotalPaid/300000)*100, 100) + '%';

    // 4. Challenges
    const cont = document.getElementById('challenges-container');
    if (cont) {
        cont.innerHTML = store.challenges.map(c => {
            const pnl = (c.balance || 0) - (c.amount || 50000);
            return `
                <div class="challenge-item" style="margin-bottom:12px; padding:12px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); border-radius:10px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-weight:700; color:#fff;">${c.name}</span>
                        <span style="font-size:0.7rem; padding:2px 8px; border-radius:4px; background:rgba(255,255,255,0.05); color:${c.status==='Active'?'#00ff9d':'#ff3b30'}">${c.status.toUpperCase()}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-top:8px; font-size:0.85rem;">
                        <span style="color:#888;">Equity: $${(c.equity || 0).toLocaleString()}</span>
                        <span style="font-weight:700; color:${pnl>=0?'#00ff9d':'#ff3b30'}">${pnl>=0?'+':''}${pnl.toFixed(0)}$</span>
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
                const title = card.querySelector('.card-title')?.innerText || "Statistics";
                modal.classList.add('active');
                document.getElementById('modal-title').innerText = title;
                document.getElementById('modal-body').innerHTML = getModalContent(card.id);
            };
        }
    });
    document.getElementById('modal-close-btn').onclick = () => modal.classList.remove('active');
}

function getModalContent(id) {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    monday.setHours(0,0,0,0);

    if (id === 'card-trading') {
        const total = store.trades.reduce((s, t) => s + (parseFloat(t.pnl) || 0), 0) + 2359.30;
        const weekly = store.trades.filter(t => new Date(t.date) >= monday).reduce((s, t) => s + (parseFloat(t.pnl) || 0), 0);
        return `
            <div class="stat-row"><span>Total PnL:</span><b style="color:${total>=0?'#00ff9d':'#ff3b30'}">${total.toFixed(2)}$</b></div>
            <div class="stat-row"><span>Weekly PnL:</span><b style="color:${weekly>=0?'#00ff9d':'#ff3b30'}">${weekly.toFixed(2)}$</b></div>
            <div class="stat-row"><span>Total Trades:</span><b>${store.trades.length}</b></div>
        `;
    }
    if (id === 'card-deepwork') {
        const totalMin = store.sessions.reduce((s, x) => s + (x.duration || 0), 0);
        const weeklyMin = store.sessions.filter(s => new Date(s.start_time) >= monday).reduce((s, x) => s + (x.duration || 0), 0);
        return `
            <div class="stat-row"><span>Total Hours:</span><b>${(totalMin/60).toFixed(1)}h</b></div>
            <div class="stat-row"><span>This Week:</span><b>${(weeklyMin/60).toFixed(1)}h</b></div>
        `;
    }
    if (id === 'card-debt') {
        const total = store.debts.reduce((s, d) => s + (d.amount || 0), 0);
        const weekly = store.debts.filter(d => new Date(d.date) >= monday).reduce((s, d) => s + (d.amount || 0), 0);
        return `
            <div class="stat-row"><span>Total Repaid:</span><b>${(total/1000).toFixed(2)}k</b></div>
            <div class="stat-row"><span>Weekly:</span><b>${(weekly/1000).toFixed(2)}k</b></div>
        `;
    }
    return "<p>More stats coming soon...</p>";
}

function updateDate() {
    const d = new Date();
    updateText('current-date', d.toLocaleDateString('ru-RU'));
    const start = new Date(d.getFullYear(), 0, 1);
    const day = Math.floor((d - start) / 864e5) + 1;
    updateText('day-counter', day + '/365');
}

function updateText(id, txt) {
    const el = document.getElementById(id);
    if (el) el.innerText = txt;
}
