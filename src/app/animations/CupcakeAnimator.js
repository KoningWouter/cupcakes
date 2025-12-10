export default class CupcakeAnimator {
    constructor() {
        this.cupcakes = [];
        this.mouseX = 0;
        this.mouseY = 0;
        this.animationFrameId = null;
    }

    start() {
        this.createDancingCupcakes();
        document.addEventListener('mousemove', (e) => {
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
        });
        window.addEventListener('resize', () => this.updateCupcakePositions());
    }

    destroy() {
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
        this.cupcakes = [];
    }

    createDancingCupcakes() {
        const background = document.getElementById('cupcakesBackground');
        if (!background) return;

        const cupcakeEmoji = '🧁';
        const animationTypes = ['dance1', 'dance2', 'dance3', 'float', 'bounce', 'spin'];
        const numCupcakes = 15;

        for (let i = 0; i < numCupcakes; i++) {
            const cupcake = document.createElement('div');
            cupcake.className = 'cupcake';
            cupcake.textContent = cupcakeEmoji;

            const animationType = animationTypes[Math.floor(Math.random() * animationTypes.length)];
            cupcake.classList.add(animationType);

            const left = Math.random() * 100;
            const top = Math.random() * 100;

            const cupcakeData = {
                element: cupcake,
                baseLeft: left,
                baseTop: top,
                currentLeft: left,
                currentTop: top,
                velocityX: 0,
                velocityY: 0,
                size: 2 + Math.random() * 2,
                mass: 0.5 + Math.random() * 0.5,
                repulsion: Math.random() > 0.5
            };

            cupcake.style.left = `${left}%`;
            cupcake.style.top = `${top}%`;
            cupcake.style.animationDelay = `${Math.random() * 2}s`;
            cupcake.style.fontSize = `${cupcakeData.size}rem`;
            cupcake.style.setProperty('--physics-x', '0px');
            cupcake.style.setProperty('--physics-y', '0px');

            this.cupcakes.push(cupcakeData);
            background.appendChild(cupcake);
        }

        this.startPhysicsLoop();
    }

    startPhysicsLoop() {
        const animate = () => {
            this.updateCupcakePhysics();
            this.animationFrameId = requestAnimationFrame(animate);
        };
        animate();
    }

    updateCupcakePhysics() {
        const forceRadius = 200;
        const maxForce = 0.8;
        const damping = 0.85;
        const springStrength = 0.05;

        this.cupcakes.forEach(cupcake => {
            const rect = cupcake.element.getBoundingClientRect();
            const cupcakeCenterX = rect.left + rect.width / 2;
            const cupcakeCenterY = rect.top + rect.height / 2;

            const dx = this.mouseX - cupcakeCenterX;
            const dy = this.mouseY - cupcakeCenterY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < forceRadius && distance > 0) {
                const forceStrength = (1 - distance / forceRadius) * maxForce;
                const angle = Math.atan2(dy, dx);
                const forceMultiplier = cupcake.repulsion ? -1 : 1;
                const forceX = Math.cos(angle) * forceStrength * forceMultiplier / cupcake.mass;
                const forceY = Math.sin(angle) * forceStrength * forceMultiplier / cupcake.mass;
                cupcake.velocityX += forceX;
                cupcake.velocityY += forceY;
            }

            const baseX = (cupcake.baseLeft / 100) * window.innerWidth;
            const baseY = (cupcake.baseTop / 100) * window.innerHeight;
            const springX = (baseX - cupcakeCenterX) * springStrength;
            const springY = (baseY - cupcakeCenterY) * springStrength;

            cupcake.velocityX += springX;
            cupcake.velocityY += springY;

            cupcake.velocityX *= damping;
            cupcake.velocityY *= damping;

            cupcake.currentLeft += cupcake.velocityX / window.innerWidth * 100;
            cupcake.currentTop += cupcake.velocityY / window.innerHeight * 100;
            cupcake.currentLeft = Math.max(-5, Math.min(105, cupcake.currentLeft));
            cupcake.currentTop = Math.max(-5, Math.min(105, cupcake.currentTop));

            const offsetX = (cupcake.currentLeft - cupcake.baseLeft) * window.innerWidth / 100;
            const offsetY = (cupcake.currentTop - cupcake.baseTop) * window.innerHeight / 100;
            cupcake.element.style.setProperty('--physics-x', `${offsetX}px`);
            cupcake.element.style.setProperty('--physics-y', `${offsetY}px`);
        });
    }

    updateCupcakePositions() {
        this.cupcakes.forEach(cupcake => {
            cupcake.currentLeft = cupcake.baseLeft;
            cupcake.currentTop = cupcake.baseTop;
            cupcake.velocityX = 0;
            cupcake.velocityY = 0;
        });
    }
}

