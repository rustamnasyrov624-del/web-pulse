
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const supabaseUrl = 'https://htskiitfjiaeupexvalo.supabase.co'
const supabaseKey = 'sb_publishable_95k9XN77rpfdoogJThv2eg_WpN29aCd'
const supabase = createClient(supabaseUrl, supabaseKey)
const DEBT_GOAL = 300000;

document.addEventListener('DOMContentLoaded', async () => {

    // 1. DATE & DAY Logic
    const today = new Date();
    const startOfYear = new Date('2026-01-01');
    const dayOfYear = Math.floor((today - startOfYear) / (1000 * 60 * 60 * 24)) + 1;
    
    const dateEl = document.getElementById('current-date');
    if (dateEl) {
        dateEl.innerText = today.toLocaleDateString('ru-RU');
        // Update DAY element
        const stats = document.querySelectorAll('.hero-stats .stat-item .value');
        if (stats.length > 1) {
            stats[1].innerText = `${dayOfYear}/365`;
        }
    }

    // 2. STATIC UI UPDATES (Deep Work & Subs) - RUN FIRST
    // Ensures visual feedback immediately, independent of Supabase calls
    const deepWorkValEl = document.getElementById('deep-work-val');
    const deepWorkBarEl = document.getElementById('deep-work-bar');
    if (deepWorkValEl && deepWorkBarEl) {
        const val = parseFloat(deepWorkValEl.innerText) || 0;
        const goal = 25; // Hardcoded goal from HTML
        const progress = Math.min((val / goal) * 100, 100);
        
        deepWorkBarEl.style.width = `${progress}%`;
        if (progress >= 100) {
            deepWorkBarEl.style.backgroundColor = '#00ff9d';
            deepWorkBarEl.style.boxShadow = '0 0 10px #00ff9d';
        }
    }

    const subsValEl = document.getElementById('subs-val');
    const subsBarEl = document.getElementById('subs-bar');
    if (subsValEl && subsBarEl) {
        const val = parseInt(subsValEl.innerText) || 0;
        const goal = 200;
        const progress = Math.min((val / goal) * 100, 100);
        subsBarEl.style.width = `${progress}%`;
    }

    // 3. DEBT STATS (Q1 2026 ONLY)
    try {
        const { data: debts } = await supabase
            .from('debts')
            .select('amount, date')
            .gte('date', '2026-01-01');
            
        if (debts) {
            const now = new Date();
            const day = now.getDay();
            const diff = now.getDate() - day + (day === 0 ? -6 : 1);
            const startOfWeek = new Date(now.setDate(diff));
            startOfWeek.setHours(0,0,0,0);

            const weeklyRepaid = debts
                .filter(d => new Date(d.date) >= startOfWeek)
                .reduce((sum, row) => sum + row.amount, 0);
            
            const totalRepaid = debts.reduce((sum, row) => sum + row.amount, 0);
            const progress = Math.min((totalRepaid / DEBT_GOAL) * 100, 100);
            
            // Select Elements
            const debtValueEl = document.getElementById('total-debt');
            const debtBar = document.getElementById('debt-progress');
            const debtCard = debtValueEl.closest('.stat-card');
            const debtSubText = document.querySelector('.glass-card:nth-child(3) .sub-text span:last-child'); 
            
            if (debtValueEl) {
                 debtValueEl.innerText = (weeklyRepaid / 1000).toFixed(2);
            }
            
            if (debtBar) {
                debtBar.style.width = `${progress}%`;
                if (progress > 0) {
                    debtBar.style.boxShadow = `0 0 ${progress * 0.2}px #00ff9d`;
                }
            }

            if (debtSubText) {
                 debtSubText.innerText = `${progress.toFixed(1)}%`;
            }

            if (debtCard) {
                debtCard.style.cursor = 'pointer';
                debtCard.onclick = () => alert(`Статистика выплат\n\nЗа неделю: ${(weeklyRepaid/1000).toFixed(2)}k\nВсего за Q1: ${(totalRepaid/1000).toFixed(2)}k`);
            }
        }
    } catch (err) {
        console.error('Error updating debt:', err);
    }

    // 3. TRADING STATS
    try {
        const { data: trades } = await supabase.from('trades').select('pnl, date');
        
        if (trades) {
            const now = new Date();
            const day = now.getDay();
            const diff = now.getDate() - day + (day === 0 ? -6 : 1);
            const startOfWeek = new Date(now.setDate(diff));
            startOfWeek.setHours(0,0,0,0);

            let weeklyPnL = 0;
            let totalPnL = 0;
            let totalWins = 0;
            const totalTrades = trades.length;

            trades.forEach(t => {
                const pnl = parseFloat(t.pnl) || 0;
                totalPnL += pnl;
                if (pnl > 0) totalWins++;
                if (new Date(t.date) >= startOfWeek) {
                    weeklyPnL += pnl;
                }
            });

            const winrate = totalTrades > 0 ? (totalWins / totalTrades) * 100 : 0;

            const pnlEl = document.getElementById('trading-pnl');
            const winrateEl = document.getElementById('trading-winrate');
            const winrateBarEl = document.getElementById('winrate-bar');
            const totalTradesEl = document.getElementById('total-trades');
            const tradingCard = pnlEl.closest('.stat-card');

            if (pnlEl) {
                 const sign = weeklyPnL >= 0 ? '+' : '';
                 pnlEl.innerText = `${sign}${weeklyPnL.toFixed(2)}`;
                 pnlEl.style.color = weeklyPnL >= 0 ? '#00ff9d' : '#ff3b30';
                 pnlEl.style.textShadow = weeklyPnL >= 0 ? '0 0 10px rgba(0,255,157,0.3)' : '0 0 10px rgba(255,59,48,0.3)';
            }
            if (winrateEl) {
                winrateEl.innerText = `${winrate.toFixed(1)}%`;
                winrateEl.style.color = winrate >= 50 ? '#00ff9d' : '#ff3b30';
            }
            if (winrateBarEl) {
                winrateBarEl.style.width = `${winrate}%`;
                winrateBarEl.style.backgroundColor = winrate >= 50 ? '#00ff9d' : '#ff3b30';
                winrateBarEl.style.boxShadow = winrate >= 50 ? '0 0 8px #00ff9d' : '0 0 8px #ff3b30';
            }
            if (totalTradesEl) totalTradesEl.innerText = totalTrades;

            if (tradingCard) {
                tradingCard.style.cursor = 'pointer';
                tradingCard.onclick = () => alert(`Статистика Трейдинга\n\nPnL за неделю: ${weeklyPnL.toFixed(2)}$\nОбщий PnL (год): ${totalPnL.toFixed(2)}$\nWinrate: ${winrate.toFixed(1)}%`);
            }
        }
    } catch (err) {
        console.error('Error updating trading stats:', err);
    }

    // 5. DEEP WORK STATS
    try {
        const { data: sessions } = await supabase
            .from('focus_sessions')
            .select('duration, start_time')
            .eq('phase', 'flow');
            
        if (sessions) {
            // Filter for current week (starting Monday)
            const now = new Date();
            const day = now.getDay();
            const diff = now.getDate() - day + (day === 0 ? -6 : 1);
            const startOfWeek = new Date(now.setDate(diff));
            startOfWeek.setHours(0,0,0,0);

            const weeklyMinutes = sessions
                .filter(s => new Date(s.start_time) >= startOfWeek)
                .reduce((sum, s) => sum + (s.duration || 0), 0);
            
            const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
            
            const weeklyHours = (weeklyMinutes / 60).toFixed(1);
            const totalHours = (totalMinutes / 60).toFixed(1);
            
            const goal = 25; // Weekly goal
            const progress = Math.min((weeklyHours / goal) * 100, 100);

            const dwValEl = document.getElementById('deep-work-val');
            const dwBarEl = document.getElementById('deep-work-bar');
            const dwCard = dwValEl.closest('.stat-card');
            
            if (dwValEl) dwValEl.innerText = weeklyHours;
            if (dwBarEl) {
                dwBarEl.style.width = `${progress}%`;
                dwBarEl.style.boxShadow = `0 0 ${progress * 0.1}px #00ff9d`;
            }

            // Click for detail (yearly)
            if (dwCard) {
                dwCard.style.cursor = 'pointer';
                dwCard.title = `Итого за год: ${totalHours}ч`;
                dwCard.onclick = () => alert(`Статистика Глубокой Работы\n\nЗа неделю: ${weeklyHours}ч\nВсего за год: ${totalHours}ч`);
            }
        }
    } catch (err) {
        console.error('Error updating deep work:', err);
    }

    // 4. CHALLENGES
    const challengesContainer = document.getElementById('challenges-container');
    if (challengesContainer) {
        try {
            const { data: challenges, error } = await supabase
                .from('challenges')
                .select('*')
                .order('id', { ascending: true });
            
            if (error) throw error;
            
            challengesContainer.innerHTML = '';
            
            if (challenges && challenges.length > 0) {
                challenges.forEach(c => {
                    const isFailed = c.status === 'Failed';
                    const startBal = c.amount || 50000;
                    const current = c.balance !== null ? c.balance : startBal;
                    const pnl = current - startBal;
                    const pnlStr = pnl > 0 ? `+$${pnl.toFixed(0)}` : `$${pnl.toFixed(0)}`;
                    const color = pnl >= 0 ? '#00ff9d' : '#ff3b30';
                    const percent = ((pnl / startBal) * 100).toFixed(2);
                    
                    const statusClass = c.status === 'Active' ? 'active' : (isFailed ? 'failed' : '');
                    
                    const el = document.createElement('div');
                    el.className = 'challenge-item ' + statusClass;
                    // Styling directly here for simplicity
                    el.style.cssText = 'margin-bottom: 12px; padding: 10px; background: rgba(255,255,255,0.03); border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);';
                    
                    el.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                            <span style="font-weight: 600; font-size: 0.9rem; color: #fff;">${c.name}</span>
                            <span class="status-badge" style="font-size: 0.7rem; padding: 2px 8px; border-radius: 4px; background: ${c.status === 'Active' ? 'rgba(0,255,157,0.1)' : 'rgba(255,59,48,0.1)'}; color: ${c.status === 'Active' ? '#00ff9d' : '#ff3b30'};">${c.status}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--text-secondary);">
                             <span>${(startBal/1000)}k Account</span>
                             <span style="color: ${color}">${pnlStr} (${percent}%)</span>
                        </div>
                    `;
                    challengesContainer.appendChild(el);
                });
            } else {
                 challengesContainer.innerHTML = '<div style="color:#666; font-size:0.9rem;">No active challenges found.</div>';
            }
        } catch (err) {
            console.error('Error fetching challenges:', err);
            challengesContainer.innerHTML = `<div style="color:#ff3b30; font-size:0.8rem;">Error: ${err.message || err}</div>`;
        }
    }
});
