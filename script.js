
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const SUPABASE_URL = 'https://htskiitfjiaeupexvalo.supabase.co';
const SUPABASE_KEY = 'sb_publishable_95k9XN77rpfdoogJThv2eg_WpN29aCd';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const store = { 
    trades: [], 
    sessions: [], 
    debts: [], 
    challenges: [],
    blog: [],
    freelance: []
};

document.addEventListener('DOMContentLoaded', async () => {
    updateClock();
    setInterval(updateClock, 1000);
    await forceReload();
    setInterval(forceReload, 30000); 
    setupModals();
});

async function forceReload() {
    try {
        const [t, s, d, c, b, f] = await Promise.all([
            supabase.from('trades').select('*').order('date', { ascending: false }),
            supabase.from('focus_sessions').select('*').eq('phase', 'flow'),
            supabase.from('debts').select('*').order('date', { ascending: false }),
            supabase.from('challenges').select('*').order('id', { ascending: true }),
            supabase.from('blog_posts').select('*').order('created_at', { ascending: false }),
            supabase.from('freelance_projects').select('*').order('created_at', { ascending: false })
        ]);
        store.trades = t.data || [];
        store.sessions = s.data || [];
        store.debts = d.data || [];
        store.challenges = c.data || [];
        store.blog = b.data || [];
        store.freelance = f.data || [];
        render();
    } catch (e) { console.error(e); }
}

function render() {
    // 1. Trading (GLOBAL TOTAL)
    const totalPnL = store.trades.reduce((sum, t) => sum + (parseFloat(t.pnl) || 0), 0);
    const pnlEl = document.getElementById('trading-total-pnl');
    if (pnlEl) {
        pnlEl.innerText = totalPnL.toFixed(2);
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

    // 2. Deep Work (TOTAL HOURS)
    const totalHours = (store.sessions.reduce((sum, x) => sum + (x.duration || 0), 0) / 60).toFixed(1);
    updateText('deepwork-weekly', totalHours);
    const dwBar = document.getElementById('deepwork-progress-bar');
    if (dwBar) dwBar.style.width = Math.min((parseFloat(totalHours)/300)*100, 100) + '%';
    
    // 3. Debt (Q1 TOTAL PAID)
    const totalPaid = store.debts.reduce((sum, d) => sum + (d.amount || 0), 0);
    updateText('debt-weekly', (totalPaid / 1000).toFixed(2));
    updateText('debt-q1-total', (totalPaid / 1000).toFixed(1));
    const debtBar = document.getElementById('debt-progress-bar');
    if (debtBar) debtBar.style.width = Math.min((totalPaid/300000)*100, 100) + '%';

    // 4. Blog (New Logic)
    updateText('blog-hits', store.blog.length);
    const blogBar = document.getElementById('blog-progress-bar');
    // Предположим, что 1000 — это цель подписчиков, а прогресс берем оттуда (пока 0)
    if (blogBar) blogBar.style.width = '0%'; 

    // 5. Freelance (New Logic)
    const totalRevenue = store.freelance.filter(p => p.status === 'done').reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    updateText('freelance-revenue', (totalRevenue / 1000).toFixed(1));
    updateText('freelance-count', store.freelance.length);
    const frBar = document.getElementById('freelance-progress-bar');
    if (frBar) frBar.style.width = Math.min((totalRevenue/20000)*100, 100) + '%';

    // 6. Challenges
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
                document.getElementById('modal-body-content').innerHTML = generateModalStats(card.id);
            };
        }
    });
    document.getElementById('modal-close-btn').onclick = () => modal.classList.remove('active');
}

function generateModalStats(id) {
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)));
    startOfWeek.setHours(0,0,0,0);

    if (id === 'card-trading') {
        const total = store.trades.reduce((s, t) => s + (parseFloat(t.pnl) || 0), 0);
        const weekly = store.trades.filter(t => new Date(t.date) >= startOfWeek).reduce((s, t) => s + (parseFloat(t.pnl) || 0), 0);
        return `<div class="stat-row"><span>Global PnL:</span><b style="color:${total>=0?'#00ff9d':'#ff3b30'}">${total.toFixed(2)}$</b></div>
                <div class="stat-row"><span>Weekly PnL:</span><b style="color:${weekly>=0?'#00ff9d':'#ff3b30'}">${weekly.toFixed(2)}$</b></div>`;
    }
    if (id === 'card-deepwork') {
        const total = store.sessions.reduce((s, x) => s + (x.duration || 0), 0);
        const weekly = store.sessions.filter(s => new Date(s.start_time) >= startOfWeek).reduce((s, x) => s + (x.duration || 0), 0);
        return `<div class="stat-row"><span>Total Hours:</span><b>${(total/60).toFixed(1)}h</b></div>
                <div class="stat-row"><span>This Week:</span><b>${(weekly/60).toFixed(1)}h</b></div>`;
    }
    if (id === 'card-debt') {
        const total = store.debts.reduce((s, d) => s + (d.amount || 0), 0);
        const weekly = store.debts.filter(d => new Date(d.date) >= startOfWeek).reduce((s, d) => s + (d.amount || 0), 0);
        return `<div class="stat-row"><span>Total Paid:</span><b>${(total/1000).toFixed(2)}k</b></div>
                <div class="stat-row"><span>This Week:</span><b>${(weekly/1000).toFixed(2)}k</b></div>`;
    }
    if (id === 'card-blog') {
        return `<div class="stat-row"><span>Total Posts:</span><b>${store.blog.length}</b></div>
                <div class="stat-row"><span>Last Post:</span><b>${store.blog[0]?.title || 'None'}</b></div>`;
    }
    if (id === 'card-freelance') {
        const total = store.freelance.filter(p => p.status === 'done').reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
        return `<div class="stat-row"><span>Total Revenue:</span><b>${total.toLocaleString()} ₽</b></div>
                <div class="stat-row"><span>Active Projects:</span><b>${store.freelance.filter(p => p.status === 'wip').length}</b></div>`;
    }
    return "<p>More metrics inside!</p>";
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
