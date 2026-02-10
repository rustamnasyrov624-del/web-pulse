
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

const RESET_CORRECTION = 0; 

// --- STATE ---
const store = {
    trades: [],
    sessions: [],
    debts: [],
    challenges: []
};

// --- INIT ---
document.addEventListener('DOMContentLoaded', async () => {
    updateDate();
    await fetchAll();
    renderAll();
    
    // Listen for clicks
    document.querySelectorAll('.stat-card').forEach(card => {
        card.onclick = () => {
            const title = card.querySelector('h3, .article-title')?.innerText || "Stats";
            alert(`${title}\n\nData is live from Supabase.\nDetailed modals coming soon.`);
        };
    });
});

async function fetchAll() {
    try {
        const [trades, sessions, debts, challenges] = await Promise.all([
            supabase.from('trades').select('*'),
            supabase.from('focus_sessions').select('*').eq('phase', 'flow'),
            supabase.from('debts').select('*'),
            supabase.from('challenges').select('*')
        ]);
        store.trades = trades.data || [];
        store.sessions = sessions.data || [];
        store.debts = debts.data || [];
        store.challenges = challenges.data || [];
    } catch (e) { console.error(e); }
}

function renderAll() {
    // 1. Trading
    const totalPnL = store.trades.reduce((s, t) => s + (parseFloat(t.pnl) || 0), 0) + RESET_CORRECTION;
    const pnlEl = document.getElementById('trading-total-pnl');
    if (pnlEl) {
        pnlEl.innerText = (totalPnL >= 0 ? '+' : '') + totalPnL.toFixed(2) + '$';
        pnlEl.style.color = totalPnL >= 0 ? '#00ff9d' : '#ff3b30';
    }

    // 2. Deep Work
    const totalMin = store.sessions.reduce((s, x) => s + (x.duration || 0), 0);
    const hours = (totalMin / 60).toFixed(1);
    const dwEl = document.getElementById('deepwork-weekly');
    if (dwEl) dwEl.innerText = hours + 'h';

    // 3. Debt
    const totalPaid = store.debts.reduce((s, d) => s + (d.amount || 0), 0);
    const debtEl = document.getElementById('debt-weekly');
    if (debtEl) debtEl.innerText = (totalPaid / 1000).toFixed(2) + 'k';
    
    const q1El = document.getElementById('debt-q1-total');
    if (q1El) q1El.innerText = (totalPaid / 1000).toFixed(2) + 'k';

    // 4. Challenges
    const cont = document.getElementById('challenges-container');
    if (cont) {
        cont.innerHTML = store.challenges.map(c => `
            <div style="margin-bottom:10px; padding:10px; background:rgba(255,255,255,0.05); border-radius:8px;">
                <div style="display:flex; justify-content:space-between;">
                    <b>${c.name}</b>
                    <span style="color:${c.status === 'Active' ? '#00ff9d' : '#ff3b30'}">${c.status}</span>
                </div>
                <div style="font-size:0.8rem; color:#999;">Balance: $${c.balance || 0}</div>
            </div>
        `).join('');
    }
}

function updateDate() {
    const d = new Date();
    const dateEl = document.getElementById('current-date');
    if (dateEl) dateEl.innerText = d.toLocaleDateString('ru-RU');
}
