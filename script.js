
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
    blog: { subscribers: 142, hits: 12 }, // Mock data for now
    freelance: { revenue: 0, orders: 0 }, // Mock data
    activeTab: 'week', 
    currentCard: null 
};

// --- INIT ---
document.addEventListener('DOMContentLoaded', async () => {
    updateClock();
    setInterval(updateClock, 1000);

    await forceReload();
    setInterval(forceReload, 30000); 

    setupModals();
});

async function forceReload() {
    try {
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

        // Try to fetch blog and freelance if tables exist (future proof)
        // For now using mock/calculated from USER.md logic

        render();
        if (store.currentCard) updateModalBody(); // Update open modal if exists
    } catch (e) {
        console.error("Fetch Failure:", e);
    }
}

function render() {
    const resetCorrection = 2359.30;
    
    // 1. Trading
    const totalPnL = store.trades.reduce((sum, t) => sum + (parseFloat(t.pnl) || 0), 0) + resetCorrection;
    updateText('trading-total-pnl', totalPnL.toFixed(2));
    const pnlEl = document.getElementById('trading-total-pnl');
    if (pnlEl) pnlEl.parentElement.style.color = totalPnL >= 0 ? '#00ff9d' : '#ff3b30';

    const wins = store.trades.filter(t => (parseFloat(t.pnl) || 0) > 0).length;
    const winrate = store.trades.length > 0 ? (wins / store.trades.length) * 100 : 0;
    updateText('trading-winrate', winrate.toFixed(1) + '%');
    updateText('trading-count', store.trades.length);
    const wrBar = document.getElementById('trading-winrate-bar');
    if (wrBar) wrBar.style.width = winrate + '%';

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

    // 6. Challenges (Inline Container)
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
                </div>\n            `;
        }).join('');
    }
}

function setupModals() {
    const modal = document.getElementById('stats-modal');
    if (!modal) return;
    
    document.querySelectorAll('.glass-card').forEach(card => {
        if (card.id && card.id.startsWith('card-')) {
            card.style.cursor = 'pointer';
            card.onclick = () => {
                store.currentCard = card.id;
                store.activeTab = 'week';
                modal.classList.add('active');
                updateModalTabs();
                updateModalBody();
            };\n        }\n    });

    document.getElementById('modal-close-btn').onclick = () => {
        modal.classList.remove('active');
        store.currentCard = null;
    };

    // Tab clicks
    ['week', 'month', 'year'].forEach(tab => {
        const btn = document.getElementById(`tab-${tab}`);
        if (btn) btn.onclick = (e) => {
            e.stopPropagation();
            store.activeTab = tab;
            updateModalTabs();
            updateModalBody();
        };\n    });
}

function updateModalTabs() {
    ['week', 'month', 'year'].forEach(tab => {
        const btn = document.getElementById(`tab-${tab}`);
        if (!btn) return;
        if (tab === store.activeTab) btn.classList.add('active');
        else btn.classList.remove('active');
    });
}

function updateModalBody() {\n    const body = document.getElementById('modal-body-content');\n    const title = document.getElementById('modal-title');\n    if (!body || !store.currentCard) return;\n\n    const cardData = document.getElementById(store.currentCard);\n    title.innerText = cardData.querySelector('.card-title')?.innerText || \"Statistics\";\n\n    const filterDate = getPeriodStart(store.activeTab);\n    let html = '';\n\n    if (store.currentCard === 'card-trading') {\n        const resetCorrection = 2359.30;\n        const total = store.trades.filter(t => new Date(t.date) >= filterDate).reduce((s, t) => s + (parseFloat(t.pnl) || 0), 0);\n        const finalPnL = (store.activeTab === 'year' ? total + resetCorrection : total);\n        \n        html = `\n            <div class=\"stat-row\"><span>Net PnL (${store.activeTab}):</span><b style=\"color:${finalPnL>=0?'#00ff9d':'#ff3b30'}\">${finalPnL.toFixed(2)}$</b></div>\n            <div class=\"stat-row\"><span>Trades:</span><b>${store.trades.filter(t => new Date(t.date) >= filterDate).length}</b></div>\n        `;\n    } else if (store.currentCard === 'card-deepwork') {\n        const totalMin = store.sessions.filter(s => new Date(s.start_time) >= filterDate).reduce((s, x) => s + (x.duration || 0), 0);\n        html = `<div class=\"stat-row\"><span>Hours (${store.activeTab}):</span><b style=\"color:#00ff9d\">${(totalMin/60).toFixed(1)}h</b></div>`;\n    } else if (store.currentCard === 'card-blog') {\n        html = `\n            <div class=\"stat-row\"><span>Subscribers:</span><b>${store.blog.subscribers}</b></div>\n            <div class=\"stat-row\"><span>Target:</span><b>1000</b></div>\n        `;\n    } else if (store.currentCard === 'card-debt') {\n        const total = store.debts.filter(d => new Date(d.date) >= filterDate).reduce((s, x) => s + (x.amount || 0), 0);\n        html = `<div class=\"stat-row\"><span>Paid (${store.activeTab}):</span><b style=\"color:#00ff9d\">${(total/1000).toFixed(2)}k</b></div>`;\n    } else if (store.currentCard === 'card-freelance') {\n        html = `\n            <div class=\"stat-row\"><span>Revenue:</span><b>${store.freelance.revenue}₽</b></div>\n            <div class=\"stat-row\"><span>Goal:</span><b>20,000₽/mo</b></div>\n        `;\n    }\n\n    body.innerHTML = html;\n}

function getPeriodStart(period) {\n    const now = new Date();\n    if (period === 'week') {\n        const day = now.getDay();\n        const diff = now.getDate() - day + (day === 0 ? -6 : 1);\n        return new Date(new Date(now.setDate(diff)).setHours(0,0,0,0));\n    }\n    if (period === 'month') return new Date(now.getFullYear(), now.getMonth(), 1);\n    if (period === 'year') return new Date(now.getFullYear(), 0, 1);\n    return new Date(0);\n}

function updateClock() {\n    const d = new Date();\n    updateText('current-date', d.toLocaleDateString('ru-RU'));\n    const start = new Date(d.getFullYear(), 0, 1);\n    const dayNum = Math.floor((d - start) / 864e5) + 1;\n    updateText('day-counter', dayNum + '/365');\n}

function updateText(id, txt) {\n    const el = document.getElementById(id);\n    if (el) el.innerText = txt;\n}
