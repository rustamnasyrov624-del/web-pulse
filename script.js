
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

// --- CONFIG ---
const SUPABASE_URL = 'https://htskiitfjiaeupexvalo.supabase.co';
const SUPABASE_KEY = 'sb_publishable_95k9XN77rpfdoogJThv2eg_WpN29aCd';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const store = { 
    trades: [], 
    sessions: [], 
    debts: [], 
    challenges: [], 
    blog: { subscribers: 142, hits: 12 }, 
    freelance: { revenue: 5000, orders: 1 }, 
    activeTab: 'week', 
    currentCard: null 
};

// --- INIT ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log("GOLDHUB ARCHITECT v3.1 Booting...");
    updateClock();
    setInterval(updateClock, 1000);

    // Initial render with defaults/mock
    render();

    await forceReload();
    setInterval(forceReload, 60000); 

    setupModals();
});

async function forceReload() {\n    try {\n        console.log("Syncing with Supabase...");\n        \n        // Individual fetches to prevent one failure from blocking all\n        const fetchTrades = supabase.from('trades').select('*').order('date', { ascending: false });\n        const fetchSessions = supabase.from('focus_sessions').select('*').eq('phase', 'flow');\n        const fetchDebts = supabase.from('debts').select('*').order('date', { ascending: false });\n        const fetchChallenges = supabase.from('challenges').select('*').order('id', { ascending: true });\n\n        const [t, s, d, c] = await Promise.all([fetchTrades, fetchSessions, fetchDebts, fetchChallenges]);\n\n        if (!t.error) store.trades = t.data || [];\n        if (!s.error) store.sessions = s.data || [];\n        if (!d.error) store.debts = d.data || [];\n        if (!c.error) store.challenges = c.data || [];\n\n        render();\n        if (store.currentCard) updateModalBody();\n        console.log("Sync Complete:", new Date().toLocaleTimeString());\n    } catch (e) {\n        console.error("Fetch Failure:", e);\n    }\n}

function render() {
    const resetCorrection = 2359.30;
    
    // 1. Trading
    const totalPnL = store.trades.reduce((sum, t) => sum + (parseFloat(t.pnl) || 0), 0) + resetCorrection;
    updateText('trading-total-pnl', totalPnL.toFixed(2));
    const pnlEl = document.getElementById('trading-total-pnl');
    if (pnlEl) pnlEl.parentElement.style.color = totalPnL >= 0 ? 'var(--neon-green)' : 'var(--neon-red)';

    const wins = store.trades.filter(t => (parseFloat(t.pnl) || 0) > 0).length;\n    const winrate = store.trades.length > 0 ? (wins / store.trades.length) * 100 : 0;\n    updateText('trading-winrate', winrate.toFixed(1) + '%');\n    updateText('trading-count', store.trades.length);\n    const wrBar = document.getElementById('trading-winrate-bar');\n    if (wrBar) wrBar.style.width = winrate + '%';

    // 2. Deep Work
    const totalHours = (store.sessions.reduce((sum, x) => sum + (x.duration || 0), 0) / 60).toFixed(1);
    updateText('deepwork-weekly', totalHours);
    const dwBar = document.getElementById('deepwork-progress-bar');
    if (dwBar) dwBar.style.width = Math.min((parseFloat(totalHours)/300)*100, 100) + '%';
    
    // 3. Blog 1.618
    updateText('blog-subscribers', store.blog.subscribers);
    updateText('blog-hits', store.blog.hits);
    const blogBar = document.getElementById('blog-progress-bar');
    if (blogBar) blogBar.style.width = Math.min((store.blog.subscribers/1000)*100, 100) + '%';

    // 4. Debt
    const totalPaid = store.debts.reduce((sum, d) => sum + (d.amount || 0), 0);
    updateText('debt-weekly', (totalPaid / 1000).toFixed(2));
    updateText('debt-q1-total', (totalPaid / 1000).toFixed(2));
    const debtBar = document.getElementById('debt-progress-bar');
    if (debtBar) debtBar.style.width = Math.min((totalPaid/300000)*100, 100) + '%';

    // 5. AI Freelance
    updateText('freelance-revenue', (store.freelance.revenue / 1000).toFixed(1));
    updateText('freelance-count', store.freelance.orders);
    const flBar = document.getElementById('freelance-progress-bar');
    if (flBar) flBar.style.width = Math.min((store.freelance.revenue/20000)*100, 100) + '%';
}

function setupModals() {
    const modal = document.getElementById('stats-modal');
    if (!modal) return;
    
    document.querySelectorAll('.glass-card').forEach(card => {
        if (card.id && card.id.startsWith('card-')) {
            card.onclick = () => {
                store.currentCard = card.id;
                store.activeTab = 'week';
                modal.classList.add('active');
                updateModalTabs();
                updateModalBody();
            };
        }
    });

    const closeBtn = document.getElementById('modal-close-btn');
    if (closeBtn) closeBtn.onclick = () => {
        modal.classList.remove('active');
        store.currentCard = null;
    };

    ['week', 'month', 'year'].forEach(tab => {
        const btn = document.getElementById(`tab-${tab}`);
        if (btn) btn.onclick = (e) => {
            e.stopPropagation();
            store.activeTab = tab;
            updateModalTabs();
            updateModalBody();
        };
    });
}

function updateModalTabs() {
    ['week', 'month', 'year'].forEach(tab => {
        const btn = document.getElementById(`tab-${tab}`);
        if (!btn) return;
        if (tab === store.activeTab) btn.classList.add('active');
        else btn.classList.remove('active');
    });
}

function updateModalBody() {
    const body = document.getElementById('modal-body-content');
    const title = document.getElementById('modal-title');
    if (!body || !store.currentCard) return;

    const cardData = document.getElementById(store.currentCard);
    title.innerText = cardData.querySelector('.card-title')?.innerText || "Statistics";

    const filterDate = getPeriodStart(store.activeTab);
    let html = '';

    if (store.currentCard === 'card-trading') {
        const resetCorrection = 2359.30;
        const periodTrades = store.trades.filter(t => new Date(t.date) >= filterDate);
        const total = periodTrades.reduce((s, t) => s + (parseFloat(t.pnl) || 0), 0);
        const finalPnL = (store.activeTab === 'year' ? total + resetCorrection : total);
        html = `
            <div class="stat-row"><span>Net PnL (${store.activeTab}):</span><b style="color:${finalPnL>=0?'#00ff9d':'#ff3b30'}">${finalPnL.toFixed(2)}$</b></div>
            <div class="stat-row"><span>Trades:</span><b>${periodTrades.length}</b></div>
        `;
    } else if (store.currentCard === 'card-deepwork') {
        const totalMin = store.sessions.filter(s => new Date(s.start_time) >= filterDate).reduce((s, x) => s + (x.duration || 0), 0);
        html = `<div class="stat-row"><span>Hours (${store.activeTab}):</span><b style="color:#00ff9d">${(totalMin/60).toFixed(1)}h</b></div>`;
    } else if (store.currentCard === 'card-blog') {
        html = `<div class="stat-row"><span>Subscribers:</span><b>${store.blog.subscribers}</b></div>`;
    } else if (store.currentCard === 'card-debt') {
        const total = store.debts.filter(d => new Date(d.date) >= filterDate).reduce((s, x) => s + (x.amount || 0), 0);
        html = `<div class="stat-row"><span>Paid (${store.activeTab}):</span><b style="color:#00ff9d">${(total/1000).toFixed(2)}k</b></div>`;
    } else if (store.currentCard === 'card-freelance') {
        html = `<div class="stat-row"><span>Revenue:</span><b>${store.freelance.revenue}₽</b></div>`;
    }

    body.innerHTML = html;
}

function getPeriodStart(period) {\n    const now = new Date();\n    if (period === 'week') {\n        const day = now.getDay();\n        const diff = now.getDate() - day + (day === 0 ? -6 : 1);\n        return new Date(new Date(now.setDate(diff)).setHours(0,0,0,0));\n    }\n    if (period === 'month') return new Date(now.getFullYear(), now.getMonth(), 1);\n    if (period === 'year') return new Date(now.getFullYear(), 0, 1);\n    return new Date(0);\n}

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
