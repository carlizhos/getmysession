import React from 'react';
import { motion } from 'framer-motion';

const AnimatedBackground = () => {
    return (
        <div className="absolute inset-0 overflow-hidden bg-slate-900 z-0">
            {/* Base gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/80 to-slate-900 opacity-90" />

            {/* Glowing Orbs */}
            <motion.div
                animate={{
                    x: [0, 100, 0, -50, 0],
                    y: [0, -100, 50, 100, 0],
                    scale: [1, 1.2, 0.9, 1.1, 1],
                }}
                transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "linear"
                }}
                className="absolute top-1/4 left-1/4 w-[40vw] h-[40vw] rounded-full bg-emerald-500/20 blur-[120px] mix-blend-screen"
            />
            
            <motion.div
                animate={{
                    x: [0, -150, 50, 100, 0],
                    y: [0, 100, -50, -100, 0],
                    scale: [1, 1.3, 0.8, 1.2, 1],
                }}
                transition={{
                    duration: 25,
                    repeat: Infinity,
                    ease: "linear"
                }}
                className="absolute top-1/2 right-1/4 w-[35vw] h-[35vw] rounded-full bg-cyan-500/20 blur-[100px] mix-blend-screen"
            />

            <motion.div
                animate={{
                    x: [0, 50, -100, 150, 0],
                    y: [0, 150, 100, -50, 0],
                    scale: [1, 1.1, 1.4, 0.9, 1],
                }}
                transition={{
                    duration: 22,
                    repeat: Infinity,
                    ease: "linear"
                }}
                className="absolute bottom-1/4 left-1/3 w-[30vw] h-[30vw] rounded-full bg-teal-400/20 blur-[90px] mix-blend-screen"
            />

            {/* Subtle grid pattern overlay */}
            <div 
                className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                }}
            />
            
            {/* Optional elegant noise overlay */}
            <div className="absolute inset-0 opacity-[0.015] mix-blend-overlay pointer-events-none" style={{ backgroundImage: 'url("https://grainy-gradients.vercel.app/noise.svg")' }} />
        </div>
    );
};

export default AnimatedBackground;
