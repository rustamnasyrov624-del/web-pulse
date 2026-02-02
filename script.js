document.addEventListener('DOMContentLoaded', () => {

    // Simulate BTC Price Volatility
    const priceElement = document.getElementById('btc-price');
    let currentPrice = 98420;

    function updatePrice() {
        const volatility = (Math.random() - 0.5) * 50; // Random fluctuation
        currentPrice += volatility;

        // Format as Currency
        priceElement.innerText = '$' + Math.floor(currentPrice).toLocaleString();

        // Color flash based on direction
        if (volatility > 0) {
            priceElement.style.color = '#00ff9d';
        } else {
            priceElement.style.color = '#ff4d4d';
        }

        // Reset color after a brief moment
        setTimeout(() => {
            priceElement.style.color = '#fff';
        }, 300);
    }

    // Update price every 2 seconds
    setInterval(updatePrice, 2000);


    // Simulate CPU/Reasoning Load
    const cpuElement = document.getElementById('cpu-load');

    function updateLoad() {
        const load = Math.floor(Math.random() * 30) + 10; // Random between 10-40%
        cpuElement.innerText = load + '%';
    }

    setInterval(updateLoad, 1500);

    // Fade-in-up Animation on Scroll
    const observerOptions = {
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    // Target elements to animate
    document.querySelectorAll('.stat-card, .feature-item').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'all 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)';
        observer.observe(el);
    });

    // Add visible class styles dynamically via JS (or could be in CSS)
    const styleSheet = document.createElement("style");
    styleSheet.textContent = `
        .visible {
            opacity: 1 !important;
            transform: translateY(0) !important;
        }
    `;
    document.head.appendChild(styleSheet);
});
