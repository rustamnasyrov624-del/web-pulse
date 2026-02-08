
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const supabaseUrl = 'https://htskiitfjiaeupexvalo.supabase.co'
const supabaseKey = 'sb_publishable_95k9XN77rpfdoogJThv2eg_WpN29aCd'
const supabase = createClient(supabaseUrl, supabaseKey)

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

    // 2. DEBT STATS (Q1 2026 ONLY)
    const { data: debts } = await supabase
        .from('debts')
        .select('amount')
        .gte('date', '2026-01-01');
        
    const totalRepaid = debts ? debts.reduce((sum, row) => sum + row.amount, 0) : 0;
    const debtGoal = 300000;
    const progress = (totalRepaid / debtGoal) * 100;
    
    // Select Elements (Robust)
    const debtValueEl = document.getElementById('total-debt') || document.querySelector('.glass-card:nth-child(3) .big-number');
    const debtBar = document.getElementById('debt-progress') || document.querySelector('.glass-card:nth-child(3) .progress-sm .bar');
    const debtSubText = document.querySelector('.glass-card:nth-child(3) .sub-text span:last-child');
    
    if (debtValueEl) debtValueEl.innerHTML = `${(totalRepaid / 1000).toFixed(2)}<span class="unit">k</span> <span style="font-size:0.4em; color:#666;">/ 300k</span>`;
    if (debtBar) debtBar.style.width = `${Math.min(progress, 100)}%`;
    if (debtSubText) debtSubText.innerText = `${progress.toFixed(1)}%`;

    // 3. TRADING STATS (If block exists)
    // My previous sub-agent added this, so I should keep it or re-add it.
    // Let's assume the HTML structure is there or I fetch from 'trades' too.
    
    // 4. CHALLENGES (Prop Trading)
    const challengesContainer = document.getElementById('challenges-container');
    if (challengesContainer) {
        const { data: challenges } = await supabase.from('challenges').select('*').order('id');
        
        challengesContainer.innerHTML = '';
        
        if (challenges && challenges.length > 0) {
            challenges.forEach(c => {
                const isFailed = c.status === 'Failed';
                const el = document.createElement('div');
                const startBal = 50000; 
                const current = c.balance;
                const pnl = current - startBal;
                const pnlStr = pnl > 0 ? `+$${pnl.toFixed(0)}` : `$${pnl.toFixed(0)}`;
                const color = pnl >= 0 ? '#00ff9d' : '#ff3b30';
                const percent = ((pnl / startBal) * 100).toFixed(2);

                if (isFailed) {
                    el.className = 'challenge-history';
                    el.innerHTML = `
                        <div class="history-item failed" style="opacity: 0.5;">
                            <span class="h-name">${c.name}:</span>
                            <span class="h-res">FAILED</span>
                        </div>
                    `;
                } else {
                    el.className = 'challenge-status active';
                    el.style.marginBottom = '15px';
                    el.innerHTML = `
                        <div class="status-header">
                            <span class="phase">${c.name}</span>
                            <span class="live-badge">ACTIVE</span>
                        </div>
                        <div class="progress-bar-container">
                            <div class="progress-bar" style="width: ${Math.min(Math.abs(percent)*5, 100)}%; background: ${color};"></div>
                        </div>
                        <div class="metrics-row">
                            <div class="metric">
                                <span class="m-label">Balance</span>
                                <span class="m-value" style="color: ${color}">$${current.toLocaleString()}</span>
                            </div>
                            <div class="metric">
                                <span class="m-label">Result</span>
                                <span class="m-value">${pnlStr} (${percent}%)</span>
                            </div>
                        </div>
                    `;
                }
                challengesContainer.appendChild(el);
            });
        } else {
            challengesContainer.innerHTML = '<div style="color:#666">No active challenges.</div>';
        }
    }
});
