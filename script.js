document.addEventListener('DOMContentLoaded', () => {

    const DATA_URL = 'data.json';

    // Elements
    const dateEl = document.getElementById('current-date');
    const deepWorkVal = document.getElementById('deep-work-val');
    const deepWorkGoal = document.getElementById('deep-work-goal');
    const deepWorkBar = document.getElementById('deep-work-bar');
    
    const subsVal = document.getElementById('subs-val');
    const subsGoal = document.getElementById('subs-goal');
    const subsBar = document.getElementById('subs-bar');
    const subsChange = document.getElementById('subs-change');

    const challengesContainer = document.getElementById('challenges-container');

    // Fetch and Render
    fetch(DATA_URL)
        .then(response => response.json())
        .then(data => {
            renderDashboard(data);
        })
        .catch(err => console.error('Error loading data:', err));

    function renderDashboard(data) {
        // Date
        if(dateEl) dateEl.innerText = data.lastUpdate;

        // Deep Work
        if(deepWorkVal) {
            animateValue(deepWorkVal, 0, data.deepWork.hours, 1000);
            deepWorkGoal.innerText = data.deepWork.goal;
            const dwPct = (data.deepWork.hours / data.deepWork.goal) * 100;
            deepWorkBar.style.width = Math.min(dwPct, 100) + '%';
            
            if (dwPct >= 100) {
                deepWorkBar.style.boxShadow = '0 0 8px #00ff9d';
                deepWorkBar.style.background = '#00ff9d';
            }
        }

        // Blog
        if(subsVal) {
            animateValue(subsVal, 0, data.blog.subscribers, 1000);
            subsGoal.innerText = data.blog.goal;
            const subsPct = (data.blog.subscribers / data.blog.goal) * 100;
            subsBar.style.width = Math.min(subsPct, 100) + '%';
            subsChange.innerText = data.blog.change + ' за неделю';
            
            // Color delta
            if (data.blog.change.startsWith('+')) {
                subsChange.style.color = '#00ff9d';
            } else {
                subsChange.style.color = '#ff3b30';
            }
        }

        // Challenges
        renderChallenges(data.challenges);
    }

    function renderChallenges(challenges) {
        challengesContainer.innerHTML = ''; // Clear

        challenges.forEach(c => {
            const el = document.createElement('div');
            
            if (c.status === 'failed') {
                el.className = 'challenge-history';
                el.innerHTML = `
                    <div class="history-item failed" style="opacity: 0.5;">
                        <span class="h-name">#${c.id} (${c.name}):</span>
                        <span class="h-res">FAILED (${c.pnl})</span>
                    </div>
                `;
            } else {
                el.className = 'challenge-status active';
                el.style.marginBottom = '15px';
                
                // Color logic
                const isPositive = c.progress > 0;
                const color = isPositive ? '#00ff9d' : '#ff3b30';
                
                el.innerHTML = `
                    <div class="status-header">
                        <span class="phase">#${c.id} ${c.name}</span>
                        <span class="live-badge">ACTIVE</span>
                    </div>
                    <div class="progress-bar-container">
                        <div class="progress-bar" style="width: ${Math.abs(c.progress)}%; background: ${color};"></div>
                    </div>
                    <div class="metrics-row">
                        <div class="metric">
                            <span class="m-label">P&L</span>
                            <span class="m-value" style="color: ${color}">${c.pnl}</span>
                        </div>
                        <div class="metric">
                            <span class="m-label">Progress</span>
                            <span class="m-value">${c.progress}%</span>
                        </div>
                    </div>
                `;
            }
            challengesContainer.appendChild(el);
        });
    }

    function animateValue(obj, start, end, duration) {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            obj.innerHTML = Math.floor(progress * (end - start) + start);
            // Handle float for Deep Work
            if (end % 1 !== 0) {
                 obj.innerHTML = (progress * (end - start) + start).toFixed(1);
            }
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }

    // Scroll Animation
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.stat-card').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'all 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)';
        observer.observe(el);
    });

    const styleSheet = document.createElement("style");
    styleSheet.textContent = `
        .visible {
            opacity: 1 !important;
            transform: translateY(0) !important;
        }
    `;
    document.head.appendChild(styleSheet);
});
