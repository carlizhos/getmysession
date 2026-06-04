import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  Sparkles,
  ArrowRight,
  Shield,
  Brain,
  Video,
  FileText,
  CalendarCheck,
  Users,
  Mic,
  Crown,
} from 'lucide-react';

/* ─────────── confetti particle ─────────── */
interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  velocityX: number;
  velocityY: number;
  gravity: number;
  opacity: number;
  shape: 'circle' | 'square' | 'strip';
}

const CONFETTI_COLORS = [
  '#819f9d', '#6b8a88', '#a3bfbd', // sage/teal
  '#f59e0b', '#fbbf24', '#fcd34d', // gold
  '#818cf8', '#a78bfa', '#c4b5fd', // violet
  '#34d399', '#6ee7b7', '#a7f3d0', // emerald
  '#f472b6', '#f9a8d4', '#fbcfe8', // pink
  '#ffffff',                        // white
];

const FEATURE_LIST = [
  { icon: Users, label: 'Pacientes ilimitados', delay: 0 },
  { icon: Brain, label: 'IA para notas clínicas', delay: 80 },
  { icon: Video, label: 'Consultorio virtual', delay: 160 },
  { icon: Mic, label: 'Escriba ambiental de IA', delay: 240 },
  { icon: FileText, label: 'Notas SOAP estructuradas', delay: 320 },
  { icon: CalendarCheck, label: 'Agenda inteligente', delay: 400 },
  { icon: Shield, label: 'Exportación a PDF', delay: 480 },
];

const SubscriptionSuccess = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);
  const [showCTA, setShowCTA] = useState(false);
  const [countdown, setCountdown] = useState(15);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);

  /* ─── confetti canvas animation ─── */
  const createParticle = useCallback((x: number, y: number): Particle => {
    const shapes: Array<'circle' | 'square' | 'strip'> = ['circle', 'square', 'strip'];
    return {
      id: Math.random(),
      x,
      y,
      size: Math.random() * 8 + 3,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10,
      velocityX: (Math.random() - 0.5) * 12,
      velocityY: Math.random() * -14 - 4,
      gravity: 0.15,
      opacity: 1,
      shape: shapes[Math.floor(Math.random() * shapes.length)],
    };
  }, []);

  const burstConfetti = useCallback((count: number = 120) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const centerX = canvas.width / 2;
    const topY = canvas.height * 0.3;
    for (let i = 0; i < count; i++) {
      const x = centerX + (Math.random() - 0.5) * 300;
      const y = topY + (Math.random() - 0.5) * 100;
      particlesRef.current.push(createParticle(x, y));
    }
  }, [createParticle]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current = particlesRef.current.filter(p => p.opacity > 0.01);

      for (const p of particlesRef.current) {
        p.x += p.velocityX;
        p.y += p.velocityY;
        p.velocityY += p.gravity;
        p.velocityX *= 0.99;
        p.rotation += p.rotationSpeed;
        p.opacity -= 0.004;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.fillStyle = p.color;

        if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.shape === 'square') {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        } else {
          ctx.fillRect(-p.size / 2, -p.size * 1.5, p.size, p.size * 3);
        }
        ctx.restore();
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  /* ─── mount orchestration ─── */
  useEffect(() => {
    // Stagger reveals
    const t0 = setTimeout(() => setMounted(true), 100);
    const t1 = setTimeout(() => burstConfetti(150), 400);
    const t2 = setTimeout(() => setShowFeatures(true), 1200);
    const t3 = setTimeout(() => burstConfetti(60), 1600);
    const t4 = setTimeout(() => setShowCTA(true), 2000);

    return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [burstConfetti]);

  /* ─── auto-redirect countdown ─── */
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          navigate('/dashboard');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [navigate]);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-[#f0f7f6] via-[#e8f4f2] to-[#f5f0ff] dark:from-[#0a1a18] dark:via-[#0f1f1d] dark:to-[#1a1030]">
      {/* ── Confetti Canvas ── */}
      <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-50" />

      {/* ── Floating ambient orbs ── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -left-20 h-[500px] w-[500px] rounded-full bg-primary/10 blur-[120px] animate-pulse" />
        <div className="absolute top-1/3 -right-32 h-[400px] w-[400px] rounded-full bg-purple-400/10 blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute -bottom-20 left-1/3 h-[350px] w-[350px] rounded-full bg-amber-300/10 blur-[100px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* ── Grid pattern overlay ── */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: '40px 40px',
        }}
      />

      {/* ── Main content ── */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-12">

        {/* ── Animated checkmark ring ── */}
        <div
          className={cn(
            'relative mb-8 transition-all duration-1000 ease-out',
            mounted ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
          )}
        >
          {/* Outer glow ring */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/30 to-emerald-400/30 blur-xl animate-pulse" />

          {/* Spinning gradient border */}
          <div className="relative h-28 w-28 sm:h-32 sm:w-32">
            <svg className="absolute inset-0 h-full w-full animate-[spin_8s_linear_infinite]" viewBox="0 0 128 128">
              <defs>
                <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="hsl(178, 15%, 56%)" />
                  <stop offset="33%" stopColor="hsl(142, 71%, 45%)" />
                  <stop offset="66%" stopColor="hsl(262, 83%, 58%)" />
                  <stop offset="100%" stopColor="hsl(38, 92%, 50%)" />
                </linearGradient>
              </defs>
              <circle cx="64" cy="64" r="58" fill="none" stroke="url(#ring-gradient)" strokeWidth="3" strokeDasharray="8 6" opacity="0.5" />
            </svg>

            {/* Inner circle with icon */}
            <div className="absolute inset-3 flex items-center justify-center rounded-full bg-gradient-to-br from-primary to-emerald-500 shadow-2xl shadow-primary/40">
              <Crown className="h-12 w-12 sm:h-14 sm:w-14 text-white drop-shadow-lg" strokeWidth={1.5} />
            </div>
          </div>
        </div>

        {/* ── Title block ── */}
        <div
          className={cn(
            'text-center space-y-4 max-w-xl transition-all duration-1000 ease-out delay-300',
            mounted ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          )}
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary border border-primary/20">
            <Sparkles className="h-3.5 w-3.5" />
            Suscripción Activada
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-foreground">
            ¡Bienvenido a{' '}
            <span className="relative">
              <span className="bg-gradient-to-r from-primary via-emerald-500 to-primary bg-clip-text text-transparent">
                Saudade Pro
              </span>
              <span className="absolute -bottom-1 left-0 right-0 h-1 rounded-full bg-gradient-to-r from-primary/40 via-emerald-500/40 to-transparent" />
            </span>
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-md mx-auto">
            Tu prueba gratuita de <strong className="text-foreground">30 días</strong> ha comenzado.
            Disfruta de todas las herramientas para transformar tu práctica clínica.
          </p>
        </div>

        {/* ── Feature grid ── */}
        <div
          className={cn(
            'mt-10 w-full max-w-2xl transition-all duration-1000 ease-out',
            showFeatures ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'
          )}
        >
          <div className="rounded-2xl border border-border/60 bg-card/70 backdrop-blur-xl p-6 sm:p-8 shadow-xl shadow-primary/5">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-5 text-center">
              Todo lo que incluye tu plan
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {FEATURE_LIST.map((feat, i) => (
                <div
                  key={feat.label}
                  className={cn(
                    'group flex items-center gap-3 rounded-xl p-3 transition-all duration-500',
                    'hover:bg-primary/5',
                    showFeatures ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0'
                  )}
                  style={{ transitionDelay: `${feat.delay + 200}ms` }}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 text-primary transition-transform group-hover:scale-110">
                    <feat.icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
                  </div>
                  <span className="text-sm font-medium text-foreground">{feat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── CTA buttons ── */}
        <div
          className={cn(
            'mt-8 flex flex-col sm:flex-row items-center gap-3 transition-all duration-700 ease-out',
            showCTA ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          )}
        >
          <Button
            size="lg"
            variant="zen"
            className="gap-2 px-8 text-base shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all"
            onClick={() => navigate('/dashboard')}
          >
            Ir al Dashboard
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="gap-2 px-6"
            onClick={() => navigate('/settings?tab=suscripcion')}
          >
            Ver mi suscripción
          </Button>
        </div>

        {/* ── Auto-redirect ── */}
        <p
          className={cn(
            'mt-6 text-xs text-muted-foreground/60 transition-all duration-700',
            showCTA ? 'opacity-100' : 'opacity-0'
          )}
        >
          Serás redirigido al dashboard en {countdown}s
        </p>

        {/* ── Footer security note ── */}
        <div
          className={cn(
            'mt-10 flex items-center gap-2 text-[11px] text-muted-foreground/50 transition-all duration-700 delay-500',
            showCTA ? 'opacity-100' : 'opacity-0'
          )}
        >
          <Shield className="h-3.5 w-3.5" />
          <span>Pagos procesados de forma segura por Stripe · Cifrado de extremo a extremo</span>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionSuccess;
