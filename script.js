
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

// --- CONFIG ---
const SUPABASE_URL = 'https://htskiitfjiaeupexvalo.supabase.co';
const SUPABASE_KEY = 'sb_publishable_95k9XN77rpfdoogJThv2eg_WpN29aCd';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const store = { trades: [], sessions: [], debts: [], challenges: [] };

// --- INIT ---
document.addEventListener('DOMContentLoaded', async () => {
    updateDate();
    try {
        const [t, s, d, c] = await Promise.all([
            supabase.from('trades').select('*'),
            supabase.from('focus_sessions').select('*').eq('phase', 'flow'),
            supabase.from('debts').select('*'),
            supabase.from('challenges').select('*').order('id', { ascending: true })
        ]);
        store.trades = t.data || [];
        store.sessions = s.data || [];
        store.debts = d.data || [];
        store.challenges = c.data || [];
        render();
    } catch (e) { console.error('Sync Error:', e); }
    setupModals();
});

function getStartOfWeek() {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    monday.setHours(0,0,0,0);
    return monday;
}

function render() {
    const startOfWeek = getStartOfWeek();

    // 1. Trading (User wants Total PnL on card as per last request)
    // Wait, let's check: "результат не за неделю в трейдинге, а в целом общий результат"
    const resetCorrection = 2359.30; 
    const totalPnL = store.trades.reduce((s, t) => s + (parseFloat(t.pnl) || 0), 0) + resetCorrection;
    updateText('trading-total-pnl', totalPnL.toFixed(2)); // No $ here, HTML has it
    document.getElementById('trading-total-pnl').parentElement.style.color = totalPnL >= 0 ? '#00ff9d' : '#ff3b30';

    // 2. Deep Work (Weekly primary)
    const weeklyMin = store.sessions
        .filter(s => new Date(s.start_time) >= startOfWeek)
        .reduce((s, x) => s + (x.duration || 0), 0);
    const weeklyHours = (weeklyMin / 60).toFixed(1);
    updateText('deepwork-weekly', weeklyHours);

    // 3. Debt (Weekly primary)
    const weeklyDebt = store.debts
        .filter(d => new Date(d.date) >= startOfWeek)
        .reduce((s, x) => s + (x.amount || 0), 0);
    updateText('debt-weekly', (weeklyDebt / 1000).toFixed(2));
    
    const q1Total = store.debts.reduce((s, d) => s + (d.amount || 0), 0);
    updateText('debt-q1-total', (q1Total / 1000).toFixed(2));

    // 4. Challenges
    const cont = document.getElementById('challenges-container');
    if (cont) {
        cont.innerHTML = store.challenges.map(c => {
            const startBal = c.amount || 50000;
            const current = c.balance !== null ? c.balance : startBal;
            const pnl = current - startBal;
            return `
                <div style="margin-bottom:10px; padding:10px; background:rgba(255,255,255,0.03); border-radius:8px; border:1px solid rgba(255,255,255,0.05);">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <b style="color:#fff;">${c.name}</b>
                        <span style="font-size:0.7rem; color:${c.status === 'Active' ? '#00ff9d' : '#ff3b30'}">${c.status.toUpperCase()}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; font-size:0.8rem; color:#888; margin-top:4px;">
                        <span>Balance: $${current.toLocaleString()}</span>
                        <span style="color:${pnl >= 0 ? '#00ff9d' : '#ff3b30'}">${pnl >= 0 ? '+' : ''}${pnl.toFixed(0)}$</span>
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
        card.onclick = () => {
            const type = card.id;
            const title = card.querySelector('.card-title')?.innerText || "Statistics";
            openModal(type, title);
        };
    });

    document.getElementById('modal-close-btn').onclick = () => modal.classList.remove('active');
}

function openModal(id, title) {
    const modal = document.getElementById('stats-modal');
    modal.classList.add('active');
    document.getElementById('modal-title').innerText = title;
    
    let html = '';
    const resetCorrection = 2359.30;
    
    if (id === 'card-trading') {
        const totalPnL = store.trades.reduce((s, t) => s + (parseFloat(t.pnl) || 0), 0) + resetCorrection;
        html = `<div class="stat-row"><span>Total PnL:</span><b style="color:#00ff9d">${totalPnL.toFixed(2)}$</b></div>`;
    } else if (id === 'card-deepwork') {
        const totalMin = store.sessions.reduce((s, x) => s + (x.duration || 0), 0);
        html = `<div class="stat-row"><span>Year Total:</span><b style="color:#00ff9d">${(totalMin/60).toFixed(1)}h</b></div>`;
    } else if (id === 'card-debt') {
        const total = store.debts.reduce((s, d) => s + (d.amount || 0), 0);
        html = `<div class="stat-row"><span>Q1 Total:</span><b style="color:#00ff9d">${(total/1000).toFixed(2)}k</b></div>`;
    }
    
    document.getElementById('modal-body').innerHTML = html || '<p>Detailed stats coming soon...</p>';
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
