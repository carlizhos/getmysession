import React, { useEffect, useRef } from 'react';

const AnimatedBackground = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let particles: Particle[] = [];
        
        // Colors for the particles and lines (teal / emerald vibes)
        const PARTICLE_COLOR = 'rgba(20, 184, 166, 0.6)'; // Tailwind Teal-500 with opacity
        const LINE_COLOR = 'rgba(20, 184, 166, 0.15)'; 
        
        // Adjust these to change the density and feel of the network
        const PARTICLE_COUNT = 80;
        const CONNECTION_DISTANCE = 160;
        const BASE_SPEED = 0.4;

        class Particle {
            x: number;
            y: number;
            vx: number;
            vy: number;
            radius: number;

            constructor(width: number, height: number) {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.vx = (Math.random() - 0.5) * BASE_SPEED;
                this.vy = (Math.random() - 0.5) * BASE_SPEED;
                // Random size between 1 and 3
                this.radius = Math.random() * 2 + 1;
            }

            update(width: number, height: number) {
                this.x += this.vx;
                this.y += this.vy;

                // Bounce off edges smoothly
                if (this.x < 0 || this.x > width) this.vx = -this.vx;
                if (this.y < 0 || this.y > height) this.vy = -this.vy;
            }

            draw(ctx: CanvasRenderingContext2D) {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fillStyle = PARTICLE_COLOR;
                ctx.fill();
            }
        }

        const init = () => {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
            particles = [];
            
            // Adjust particle count based on screen size so it's not too crowded
            const area = canvas.width * canvas.height;
            const responsiveCount = Math.min(PARTICLE_COUNT, Math.floor(area / 15000));

            for (let i = 0; i < responsiveCount; i++) {
                particles.push(new Particle(canvas.width, canvas.height));
            }
        };

        const animate = () => {
            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Update and draw particles
            particles.forEach((particle) => {
                particle.update(canvas.width, canvas.height);
                particle.draw(ctx);
            });

            // Draw connections (Synapses)
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < CONNECTION_DISTANCE) {
                        // Opacity fades as they get further apart
                        const opacity = 1 - (distance / CONNECTION_DISTANCE);
                        ctx.beginPath();
                        ctx.strokeStyle = `rgba(20, 184, 166, ${opacity * 0.5})`; // Max opacity 0.5 for lines
                        ctx.lineWidth = 1;
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                    }
                }
            }

            animationFrameId = requestAnimationFrame(animate);
        };

        init();
        animate();

        // Handle Resize
        const handleResize = () => {
            init();
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <div className="absolute inset-0 overflow-hidden bg-slate-900 z-0">
            {/* Deep rich background gradient matching the theme */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-primary/20 to-slate-900 opacity-90" />
            
            {/* The Neural Network Canvas */}
            <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full block mix-blend-screen opacity-80"
            />
            
            {/* Elegant noise overlay for texture */}
            <div className="absolute inset-0 opacity-[0.015] mix-blend-overlay pointer-events-none" style={{ backgroundImage: 'url("https://grainy-gradients.vercel.app/noise.svg")' }} />
        </div>
    );
};

export default AnimatedBackground;
