
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

// Initial Load
document.addEventListener('DOMContentLoaded', () => {
    updateDebtStats();

    // Optional: Realtime subscription for updates
    supabase
        .channel('debts-updates')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'debts' },
            () => {
                console.log('Debts table updated, refreshing...');
                updateDebtStats();
            }
        )
        .subscribe();
});
