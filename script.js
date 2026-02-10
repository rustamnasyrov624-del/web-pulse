
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

// --- CONFIG ---
const SUPABASE_URL = 'https://htskiitfjiaeupexvalo.supabase.co';
const SUPABASE_KEY = 'sb_publishable_95k9XN77rpfdoogJThv2eg_WpN29aCd';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const store = { trades: [], sessions: [], debts: [], challenges: [], activeTab: 'week', currentCard: null };

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
    
    // 3. Debt
    const totalPaid = store.debts.reduce((sum, d) => sum + (d.amount || 0), 0);
    updateText('debt-weekly', (totalPaid / 1000).toFixed(2));
    updateText('debt-q1-total', (totalPaid / 1000).toFixed(2));
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
            card.style.cursor = 'pointer';
            card.onclick = () => {
                store.currentCard = card.id;
                store.activeTab = 'week';
                modal.classList.add('active');
                updateModalTabs();
                updateModalBody();
            };
        }
    });

    document.getElementById('modal-close-btn').onclick = () => {
        modal.classList.remove('active');
        store.currentCard = null;
    };

    // Tab clicks
    ['week', 'month', 'year'].forEach(tab => {
        document.getElementById(`tab-${tab}`).onclick = (e) => {
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
        const total = store.trades.filter(t => new Date(t.date) >= filterDate).reduce((s, t) => s + (parseFloat(t.pnl) || 0), 0);
        // Only apply reset correction if year/all is selected or if reset happened within period
        const finalPnL = (store.activeTab === 'year' ? total + resetCorrection : total);
        
        html = `
            <div class="stat-row"><span>Net PnL (${store.activeTab}):</span><b style="color:${finalPnL>=0?'#00ff9d':'#ff3b30'}">${finalPnL.toFixed(2)}$</b></div>
            <div class="stat-row"><span>Trades:</span><b>${store.trades.filter(t => new Date(t.date) >= filterDate).length}</b></div>
        `;
    } else if (store.currentCard === 'card-deepwork') {
        const totalMin = store.sessions.filter(s => new Date(s.start_time) >= filterDate).reduce((s, x) => s + (x.duration || 0), 0);
        html = `<div class="stat-row"><span>Hours (${store.activeTab}):</span><b style="color:#00ff9d">${(totalMin/60).toFixed(1)}h</b></div>`;
    } else if (store.currentCard === 'card-debt') {
        const total = store.debts.filter(d => new Date(d.date) >= filterDate).reduce((s, x) => s + (x.amount || 0), 0);
        html = `<div class="stat-row"><span>Paid (${store.activeTab}):</span><b style="color:#00ff9d">${(total/1000).toFixed(2)}k</b></div>`;
    }

    body.innerHTML = html;
}

function getPeriodStart(period) {
    const now = new Date();
    if (period === 'week') {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(new Date(now.setDate(diff)).setHours(0,0,0,0));
    }
    if (period === 'month') return new Date(now.getFullYear(), now.getMonth(), 1);
    if (period === 'year') return new Date(now.getFullYear(), 0, 1);
    return new Date(0);
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
