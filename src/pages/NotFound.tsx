import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Home, ArrowLeft, Compass } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
    // Trigger mount animations
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{
        background: `
          radial-gradient(ellipse at 20% 50%, hsl(180 16% 57% / 0.08) 0%, transparent 50%),
          radial-gradient(ellipse at 80% 20%, hsl(269 16% 57% / 0.08) 0%, transparent 50%),
          radial-gradient(ellipse at 50% 80%, hsl(0 17% 57% / 0.06) 0%, transparent 50%),
          hsl(0 10% 95%)
        `
      }}
    >
      {/* Animated floating orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute w-[500px] h-[500px] rounded-full opacity-[0.04]"
          style={{
            background: 'radial-gradient(circle, hsl(180 16% 57%) 0%, transparent 70%)',
            top: '-10%',
            right: '-5%',
            animation: 'float-slow 20s ease-in-out infinite',
          }}
        />
        <div
          className="absolute w-[400px] h-[400px] rounded-full opacity-[0.04]"
          style={{
            background: 'radial-gradient(circle, hsl(269 16% 57%) 0%, transparent 70%)',
            bottom: '-5%',
            left: '-5%',
            animation: 'float-slow 25s ease-in-out infinite reverse',
          }}
        />
        <div
          className="absolute w-[300px] h-[300px] rounded-full opacity-[0.03]"
          style={{
            background: 'radial-gradient(circle, hsl(88 16% 57%) 0%, transparent 70%)',
            top: '40%',
            left: '30%',
            animation: 'float-slow 18s ease-in-out infinite 5s',
          }}
        />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center px-6 max-w-2xl mx-auto text-center">

        {/* Illustration */}
        <div
          className={`mb-8 transition-all duration-1000 ease-out ${
            mounted ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'
          }`}
        >
          <div className="relative group">
            {/* Glow behind image */}
            <div
              className="absolute inset-0 rounded-3xl blur-3xl opacity-20 transition-opacity duration-500 group-hover:opacity-30"
              style={{
                background: 'linear-gradient(135deg, hsl(180 16% 57%) 0%, hsl(269 16% 57%) 100%)',
              }}
            />
            <img
              src="/404_illustration.png"
              alt="Página no encontrada"
              className="relative w-72 h-72 md:w-80 md:h-80 object-contain drop-shadow-2xl rounded-3xl"
            />
          </div>
        </div>

        {/* 404 number with gradient */}
        <div
          className={`transition-all duration-700 delay-200 ease-out ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          <h1
            className="text-8xl md:text-9xl font-bold tracking-tighter leading-none"
            style={{
              background: 'linear-gradient(135deg, hsl(180 16% 57%) 0%, hsl(269 16% 57%) 50%, hsl(0 17% 57%) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            404
          </h1>
        </div>

        {/* Text content */}
        <div
          className={`mt-4 mb-2 transition-all duration-700 delay-300 ease-out ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          <h2 className="text-2xl md:text-3xl font-semibold text-foreground tracking-tight">
            Esta página se ha perdido
          </h2>
        </div>

        <div
          className={`transition-all duration-700 delay-400 ease-out ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          <p className="text-muted-foreground text-base md:text-lg max-w-md leading-relaxed">
            La ruta <span className="font-mono text-sm bg-muted/60 px-2 py-0.5 rounded-md border border-border/50">{location.pathname}</span> no existe.
            Pero no te preocupes, siempre puedes volver al inicio.
          </p>
        </div>

        {/* Action buttons */}
        <div
          className={`flex flex-col sm:flex-row gap-3 mt-10 transition-all duration-700 delay-500 ease-out ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          {/* Primary button */}
          <button
            onClick={() => navigate('/')}
            className="group relative inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl font-medium text-white overflow-hidden transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] hover:shadow-zen"
            style={{
              background: 'linear-gradient(135deg, hsl(180 16% 50%) 0%, hsl(180 16% 42%) 100%)',
            }}
          >
            {/* Shine effect on hover */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{
                background: 'linear-gradient(105deg, transparent 40%, hsl(0 0% 100% / 0.12) 45%, hsl(0 0% 100% / 0.12) 55%, transparent 60%)',
              }}
            />
            <Home className="w-4.5 h-4.5 relative z-10 transition-transform duration-300 group-hover:-translate-y-0.5" />
            <span className="relative z-10">Ir al inicio</span>
          </button>

          {/* Secondary button */}
          <button
            onClick={() => navigate(-1)}
            className="group inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl font-medium border border-border/60 bg-card/80 backdrop-blur-sm text-foreground hover:bg-card hover:border-border transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] hover:shadow-soft"
          >
            <ArrowLeft className="w-4.5 h-4.5 transition-transform duration-300 group-hover:-translate-x-1" />
            <span>Volver atrás</span>
          </button>
        </div>

        {/* Brand footer */}
        <div
          className={`mt-16 flex items-center gap-2 transition-all duration-700 delay-[600ms] ease-out ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <Compass className="w-4 h-4 text-muted-foreground/50" />
          <span className="text-sm text-muted-foreground/50 tracking-wide font-medium">
            saudade
          </span>
        </div>
      </div>

      {/* Inline keyframes for floating animation */}
      <style>{`
        @keyframes float-slow {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(20px, -30px) rotate(2deg); }
          50% { transform: translate(-10px, 20px) rotate(-1deg); }
          75% { transform: translate(15px, 10px) rotate(1.5deg); }
        }
      `}</style>
    </div>
  );
};

export default NotFound;
