
/**
 * BACKGROUND DOT GRID EFFECT
 * Inspired by MarketHunt / Cyberpunk aesthetic
 * 
 * Logic:
 * 1. Create a grid of points
 * 2. On mousemove, calculate distance to each point
 * 3. Draw dots with opacity based on proximity to mouse
 */

const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');

let width, height;
let dots = [];
const spacing = 40; // Space between dots
const radius = 180; // Hover glow radius
const baseOpacity = 0.05;
const activeColor = '#00ff9d'; // Neon green from CSS

const mouse = {
    x: -1000,
    y: -1000
};

function init() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    dots = [];
    for (let x = spacing / 2; x < width; x += spacing) {
        for (let y = spacing / 2; y < height; y += spacing) {
            dots.push({ x, y });
        }
    }
}

function draw() {
    ctx.clearRect(0, 0, width, height);
    
    dots.forEach(dot => {
        const dx = mouse.x - dot.x;
        const dy = mouse.y - dot.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        let opacity = baseOpacity;
        
        if (distance < radius) {
            // Smoothly increase opacity as mouse gets closer
            const factor = 1 - (distance / radius);
            opacity = baseOpacity + (0.8 * factor);
            
            // Subtle glow around the dot
            if (factor > 0.5) {
                ctx.shadowBlur = 10 * factor;
                ctx.shadowColor = activeColor;
            } else {
                ctx.shadowBlur = 0;
            }
        } else {
            ctx.shadowBlur = 0;
        }

        ctx.fillStyle = activeColor;
        ctx.globalAlpha = opacity;
        
        ctx.beginPath();
        // Drawing tiny squares or circles for the grid
        ctx.arc(dot.x, dot.y, 1, 0, Math.PI * 2);
        ctx.fill();
    });

    requestAnimationFrame(draw);
}

window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});

window.addEventListener('resize', init);

// Start
init();
draw();
