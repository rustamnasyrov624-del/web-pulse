
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Configuration
const SUPABASE_URL = 'https://htskiitfjiaeupexvalo.supabase.co';
const SUPABASE_KEY = 'sb_publishable_95k9XN77rpfdoogJThv2eg_WpN29aCd'; // Using the existing publishable key
const DEBT_GOAL = 300000; // 300k Target

// Initialize Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// DOM Elements
const debtTotalEl = document.getElementById('total-debt');
const debtProgressEl = document.getElementById('debt-progress');
const pnlEl = document.getElementById('trading-pnl');
const winrateEl = document.getElementById('trading-winrate');
const winrateBarEl = document.getElementById('winrate-bar');
const totalTradesEl = document.getElementById('total-trades');

async function updateDebtStats() {
    try {
        // Fetch debts with date filter
        const { data, error } = await supabase
            .from('debts')
            .select('amount')
            .gte('date', '2026-01-01');

        if (error) {
            console.error('Supabase error fetching debts:', error);
            return;
        }

        // Calculate total amount
        const totalDebt = data.reduce((sum, record) => sum + (record.amount || 0), 0);
        
        // Update DOM
        if (debtTotalEl) {
            // Format: 28650 -> 28.7 (k)
            const displayValue = (totalDebt / 1000).toFixed(1).replace(/\.0$/, '');
            debtTotalEl.innerText = displayValue;
        }

        if (debtProgressEl) {
            const percentage = Math.min((totalDebt / DEBT_GOAL) * 100, 100);
            debtProgressEl.style.width = `${percentage}%`;
            
            // Add glow if progress > 0
            if (percentage > 0) {
                debtProgressEl.style.boxShadow = `0 0 ${percentage * 0.2}px #00ff9d`;
            } else {
                debtProgressEl.style.boxShadow = 'none';
            }
        }

    } catch (err) {
        console.error('Unexpected error updating debts:', err);
    }
}

async function updateTradingStats() {
    try {
        const { data, error } = await supabase
            .from('trades')
            .select('pnl');

        if (error) {
            console.error('Supabase error fetching trades:', error);
            return;
        }

        let totalPnL = 0;
        let wins = 0;
        const totalTrades = (data && data.length) ? data.length : 0;

        if (data) {
            data.forEach(trade => {
                const pnl = trade.pnl || 0;
                totalPnL += pnl;
                if (pnl > 0) wins++;
            });
        }

        const winrate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;

        // Update DOM
        if (pnlEl) {
            // Format PnL
            const sign = totalPnL >= 0 ? '+' : '';
            pnlEl.innerText = `${sign}${totalPnL.toFixed(2)}`;
            pnlEl.style.color = totalPnL >= 0 ? '#00ff9d' : '#ff3b30';
            pnlEl.style.textShadow = totalPnL >= 0 ? '0 0 10px rgba(0,255,157,0.3)' : '0 0 10px rgba(255,59,48,0.3)';
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

        if (totalTradesEl) {
            totalTradesEl.innerText = totalTrades;
        }

    } catch (err) {
        console.error('Unexpected error updating trades:', err);
    }
}

// Initial Load
document.addEventListener('DOMContentLoaded', () => {
    updateDebtStats();
    updateTradingStats();

    // Realtime subscription for updates
    supabase
        .channel('schema-db-changes')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'debts' },
            () => {
                console.log('Debts table updated, refreshing...');
                updateDebtStats();
            }
        )
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'trades' },
            () => {
                console.log('Trades table updated, refreshing...');
                updateTradingStats();
            }
        )
        .subscribe();
});
