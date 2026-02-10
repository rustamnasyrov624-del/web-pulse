
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const supabaseUrl = 'https://htskiitfjiaeupexvalo.supabase.co'
const supabaseKey = 'sb_publishable_95k9XN77rpfdoogJThv2eg_WpN29aCd'
const supabase = createClient(supabaseUrl, supabaseKey)
const DEBT_GOAL = 300000;

document.addEventListener('DOMContentLoaded', async () => {

    // Helper: Get start of current week (Monday)
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(now.setDate(diff));
    startOfWeek.setHours(0,0,0,0);

    // 1. DATE & DAY Logic
    const today = new Date();
    const startOfYear = new Date('2026-01-01');
    const dayOfYear = Math.floor((today - startOfYear) / (1000 * 60 * 60 * 24)) + 1;
    
    const dateEl = document.getElementById('current-date');
    if (dateEl) dateEl.innerText = today.toLocaleDateString('ru-RU');
    const dayValEl = document.querySelector('.hero-stats .stat-item:last-child .value');
    if (dayValEl) dayValEl.innerText = `${dayOfYear}/365`;

    // 2. DEBT STATS
    try {
        const { data: debts } = await supabase.from('debts').select('amount, date');
        if (debts) {
            const weeklyRepaid = debts
                .filter(d => new Date(d.date) >= startOfWeek)
                .reduce((sum, d) => sum + (d.amount || 0), 0);
            
            const totalRepaid = debts.reduce((sum, d) => sum + (d.amount || 0), 0);
            const progress = Math.min((totalRepaid / DEBT_GOAL) * 100, 100);
            
            const debtValEl = document.getElementById('total-debt');
            const debtBar = document.getElementById('debt-progress');
            const debtPct = document.querySelector('.sub-text span:last-child');
            
            if (debtValEl) debtValEl.innerText = (weeklyRepaid / 1000).toFixed(2);
            if (debtBar) {
                debtBar.style.width = `${progress}%`;
                debtBar.style.boxShadow = progress > 0 ? `0 0 ${progress * 0.2}px #00ff9d` : 'none';
            }
            if (debtPct) debtPct.innerText = `${progress.toFixed(1)}%`;

            const card = debtValEl?.closest('.stat-card');
            if (card) {
                card.style.cursor = 'pointer';
                card.onclick = () => alert(`Выплаты по долгам\n\nЗа неделю: ${(weeklyRepaid/1000).toFixed(2)}k\nВсего за Q1: ${(totalRepaid/1000).toFixed(2)}k`);
            }
        }
    } catch (err) { console.error('Debt error:', err); }

    // 3. TRADING STATS
    try {
        const { data: trades } = await supabase.from('trades').select('pnl, date');
        if (trades) {
            const weeklyPnL = trades
                .filter(t => new Date(t.date) >= startOfWeek)
                .reduce((sum, t) => sum + (parseFloat(t.pnl) || 0), 0);
            
            const totalPnL = trades.reduce((sum, t) => sum + (parseFloat(t.pnl) || 0), 0);
            const wins = trades.filter(t => (parseFloat(t.pnl) || 0) > 0).length;
            const winrate = trades.length > 0 ? (wins / trades.length) * 100 : 0;

            const pnlEl = document.getElementById('trading-pnl');
            const wrEl = document.getElementById('trading-winrate');
            const wrBar = document.getElementById('winrate-bar');
            const trCount = document.getElementById('total-trades');
            
            if (pnlEl) {
                pnlEl.innerText = (weeklyPnL >= 0 ? '+' : '') + weeklyPnL.toFixed(2);
                pnlEl.style.color = weeklyPnL >= 0 ? '#00ff9d' : '#ff3b30';
            }
            if (wrEl) wrEl.innerText = `${winrate.toFixed(1)}%`;
            if (wrBar) wrBar.style.width = `${winrate}%`;
            if (trCount) trCount.innerText = trades.length;

            const card = pnlEl?.closest('.stat-card');
            if (card) {
                card.style.cursor = 'pointer';
                card.onclick = () => alert(`Трейдинг\n\nPnL недели: ${weeklyPnL.toFixed(2)}$\nОбщий PnL: ${totalPnL.toFixed(2)}$\nWinrate: ${winrate.toFixed(1)}%`);
            }
        }
    } catch (err) { console.error('Trading error:', err); }

    // 4. DEEP WORK STATS
    try {
        const { data: sessions } = await supabase.from('focus_sessions').select('duration, start_time').eq('phase', 'flow');
        if (sessions) {
            const weeklyMin = sessions
                .filter(s => new Date(s.start_time) >= startOfWeek)
                .reduce((sum, s) => sum + (s.duration || 0), 0);
            
            const totalMin = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
            const weeklyHours = (weeklyMin / 60).toFixed(1);
            const totalHours = (totalMin / 60).toFixed(1);
            const goal = 25;
            const progress = Math.min((weeklyHours / goal) * 100, 100);

            const dwValEl = document.getElementById('deep-work-val');
            const dwBar = document.getElementById('deep-work-bar');
            
            if (dwValEl) dwValEl.innerText = weeklyHours;
            if (dwBar) {
                dwBar.style.width = `${progress}%`;
                dwBar.style.boxShadow = progress > 0 ? `0 0 ${progress * 0.1}px #00ff9d` : 'none';
            }

            const card = dwValEl?.closest('.stat-card');
            if (card) {
                card.style.cursor = 'pointer';
                card.onclick = () => alert(`Глубокая Работа\n\nНеделя: ${weeklyHours}ч\nВсего за год: ${totalHours}ч`);
            }
        }
    } catch (err) { console.error('DW error:', err); }

    // 5. CHALLENGES
    const challengesContainer = document.getElementById('challenges-container');
    if (challengesContainer) {
        try {
            const { data: challenges } = await supabase.from('challenges').select('*').order('id', { ascending: true });
            if (challenges) {
                challengesContainer.innerHTML = '';
                challenges.forEach(c => {
                    const startBal = c.amount || 50000;
                    const current = c.balance !== null ? c.balance : startBal;
                    const pnl = current - startBal;
                    const pnlStr = (pnl >= 0 ? '+$' : '$') + pnl.toFixed(0);
                    const color = pnl >= 0 ? '#00ff9d' : '#ff3b30';
                    const percent = ((pnl / startBal) * 100).toFixed(2);
                    
                    const el = document.createElement('div');
                    el.className = `challenge-item ${c.status.toLowerCase()}`;
                    el.style.cssText = 'margin-bottom: 12px; padding: 10px; background: rgba(255,255,255,0.03); border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);';
                    el.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                            <span style="font-weight: 600; font-size: 0.9rem; color: #fff;">${c.name}</span>
                            <span class="status-badge" style="font-size: 0.7rem; padding: 2px 8px; border-radius: 4px; background: rgba(255,255,255,0.05); color: ${color};">${c.status}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: #999;">
                             <span>${(startBal/1000)}k Account</span>
                             <span style="color: ${color}">${pnlStr} (${percent}%)</span>
                        </div>
                    `;
                    challengesContainer.appendChild(el);
                });
            }
        } catch (err) { console.error('Challenges error:', err); }
    }
});
