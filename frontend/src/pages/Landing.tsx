import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useSpring, useMotionValue, useInView, AnimatePresence } from 'framer-motion';
import { ReactLenis } from 'lenis/react';

/* ═══════════════════════════════════════════════════════
   ANIMATION CONSTANTS & HELPERS
   ═══════════════════════════════════════════════════════ */

const prefersReducedMotion = typeof window !== 'undefined'
  ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
  : false;

const SPRING = prefersReducedMotion ? { duration: 0.01 } : { type: 'spring' as const, stiffness: 100, damping: 20, mass: 0.8 };
const SPRING_SNAPPY = prefersReducedMotion ? { duration: 0.01 } : { type: 'spring' as const, stiffness: 300, damping: 30 };

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: SPRING,
  },
};

/* ─── Lenis-compatible scroll-based InView hook ─── */
function useInViewScroll(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (prefersReducedMotion) { setInView(true); return; }
    const el = ref.current;
    if (!el) return;
    const check = () => {
      const rect = el.getBoundingClientRect();
      const inViewport = rect.top < window.innerHeight * (1 - threshold) && rect.bottom > 0;
      if (inViewport) { setInView(true); } // once true, stays true
    };
    // Check on scroll (Lenis fires native scroll events)
    window.addEventListener('scroll', check, { passive: true });
    // Also check immediately
    check();
    return () => window.removeEventListener('scroll', check);
  }, [threshold]);
  return { ref, inView };
}

/* ═══════════════════════════════════════════════════════
   MAGNETIC BUTTON
   ═══════════════════════════════════════════════════════ */

function MagneticButton({ children, className = '', href, onClick }: {
  children: React.ReactNode;
  className?: string;
  href?: string;
  onClick?: () => void;
}) {
  const ref = useRef<HTMLAnchorElement | HTMLButtonElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 150, damping: 15, mass: 0.1 });
  const springY = useSpring(y, { stiffness: 150, damping: 15, mass: 0.1 });

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (prefersReducedMotion || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set((e.clientX - centerX) * 0.3);
    y.set((e.clientY - centerY) * 0.3);
  }, [x, y]);

  const handleMouseLeave = useCallback(() => {
    x.set(0);
    y.set(0);
  }, [x, y]);

  const style = { x: springX, y: springY };

  if (href) {
    return (
      <motion.a
        ref={ref as React.Ref<HTMLAnchorElement>}
        href={href}
        className={className}
        style={style}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        whileHover={{ scale: 1.03 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        {children}
      </motion.a>
    );
  }

  return (
    <motion.button
      ref={ref as React.Ref<HTMLButtonElement>}
      className={className}
      style={style}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileHover={{ scale: 1.03 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      onClick={onClick}
    >
      {children}
    </motion.button>
  );
}

/* ═══════════════════════════════════════════════════════
   TILT CARD (with glare overlay)
   ═══════════════════════════════════════════════════════ */

function TiltCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [6, -6]), { stiffness: 200, damping: 20 });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-6, 6]), { stiffness: 200, damping: 20 });
  const glareX = useSpring(useTransform(mouseX, [-0.5, 0.5], [0, 100]), { stiffness: 200, damping: 20 });
  const glareY = useSpring(useTransform(mouseY, [-0.5, 0.5], [0, 100]), { stiffness: 200, damping: 20 });
  // Must be at top level — not inside conditional render
  const glareBackground = useTransform(
    [glareX, glareY],
    ([gx, gy]) => `radial-gradient(circle at ${gx}% ${gy}%, rgba(94, 234, 212, 0.08) 0%, transparent 60%)`
  );

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (prefersReducedMotion || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x);
    mouseY.set(y);
  }, [mouseX, mouseY]);

  const handleMouseLeave = useCallback(() => {
    mouseX.set(0);
    mouseY.set(0);
    setIsHovered(false);
  }, [mouseX, mouseY]);

  return (
    <motion.div
      ref={ref}
      className={`relative ${className}`}
      style={{
        perspective: 800,
        transformStyle: 'preserve-3d',
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div
        style={{
          rotateX: prefersReducedMotion ? 0 : rotateX,
          rotateY: prefersReducedMotion ? 0 : rotateY,
          transformStyle: 'preserve-3d',
        }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      >
        {children}
      </motion.div>
      {/* Glare overlay */}
      <AnimatePresence>
        {isHovered && !prefersReducedMotion && (
          <motion.div
            className="absolute inset-0 rounded-3xl pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ background: glareBackground }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════
   ANIMATED COUNTER
   ═══════════════════════════════════════════════════════ */

function AnimatedCounter({ end, suffix = '', duration = 2 }: { end: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!isInView || hasAnimated.current) return;
    hasAnimated.current = true;

    if (prefersReducedMotion) {
      setCount(end);
      return;
    }

    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = (now - startTime) / 1000;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setCount(Math.floor(eased * end));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [isInView, end, duration]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

/* ═══════════════════════════════════════════════════════
   SCROLL REVEAL WRAPPER
   ═══════════════════════════════════════════════════════ */

function Reveal({ children, className = '', delay = 0 }: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, inView } = useInViewScroll(0.05);

  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={{
        hidden: { opacity: 0, y: 28 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { ...SPRING, delay },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════
   NE INDIA SVG MAP (hero visual)
   ═══════════════════════════════════════════════════════ */

const RISK_ZONES = [
  { x: 180, y: 120, r: 6, delay: 0, label: 'Assam' },
  { x: 220, y: 80, r: 5, delay: 0.3, label: 'Arunachal' },
  { x: 140, y: 160, r: 5.5, delay: 0.6, label: 'Meghalaya' },
  { x: 100, y: 200, r: 4.5, delay: 0.9, label: 'Mizoram' },
  { x: 80, y: 140, r: 5, delay: 1.2, label: 'Manipur' },
  { x: 60, y: 100, r: 4, delay: 1.5, label: 'Nagaland' },
  { x: 40, y: 170, r: 4.5, delay: 1.8, label: 'Tripura' },
  { x: 130, y: 100, r: 4, delay: 0.4, label: 'Mizoram' },
];

function NEIndiaMap() {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <svg viewBox="0 0 300 300" className="w-full h-full max-w-[420px] max-h-[420px]">
        {/* Map outline — simplified NE India shape */}
        <motion.path
          d="M50,80 L90,50 L140,40 L190,30 L240,50 L260,80 L280,100 L270,130 L280,160 L270,190 L240,210 L200,230 L160,240 L120,250 L80,240 L50,210 L30,180 L20,150 L30,120 Z"
          fill="none"
          stroke="rgba(94, 234, 212, 0.15)"
          strokeWidth="1.5"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2.5, ease: 'easeInOut', delay: 0.5 }}
        />
        <motion.path
          d="M50,80 L90,50 L140,40 L190,30 L240,50 L260,80 L280,100 L270,130 L280,160 L270,190 L240,210 L200,230 L160,240 L120,250 L80,240 L50,210 L30,180 L20,150 L30,120 Z"
          fill="url(#mapGradient)"
          opacity="0.08"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.08 }}
          transition={{ duration: 1.5, delay: 2 }}
        />
        {/* Gradient def */}
        <defs>
          <radialGradient id="mapGradient" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#14b8a6" />
            <stop offset="100%" stopColor="#0d9488" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Risk zone dots with pulse */}
        {RISK_ZONES.map((zone, i) => (
          <g key={i}>
            <motion.circle
              cx={zone.x}
              cy={zone.y}
              r={zone.r + 8}
              fill="none"
              stroke="#14b8a6"
              strokeWidth="1"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{
                opacity: [0, 0.4, 0],
                scale: [0.8, 1.8, 2.2],
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                delay: zone.delay + 1,
                ease: 'easeOut',
              }}
            />
            <motion.circle
              cx={zone.x}
              cy={zone.y}
              r={zone.r}
              fill="#14b8a6"
              filter="url(#glow)"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                type: 'spring',
                stiffness: 200,
                damping: 15,
                delay: zone.delay + 0.8,
              }}
            />
            <motion.text
              x={zone.x}
              y={zone.y - 14}
              textAnchor="middle"
              fill="rgba(20, 184, 166, 0.7)"
              fontSize="8"
              fontFamily="Sora, sans-serif"
              fontWeight="600"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: zone.delay + 1.5 }}
            >
              {zone.label}
            </motion.text>
          </g>
        ))}
        {/* Connection lines between dots */}
        <motion.line
          x1={RISK_ZONES[0].x} y1={RISK_ZONES[0].y}
          x2={RISK_ZONES[1].x} y2={RISK_ZONES[1].y}
          stroke="rgba(94, 234, 212, 0.1)"
          strokeWidth="1"
          strokeDasharray="4 4"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.5, delay: 2.5 }}
        />
        <motion.line
          x1={RISK_ZONES[0].x} y1={RISK_ZONES[0].y}
          x2={RISK_ZONES[2].x} y2={RISK_ZONES[2].y}
          stroke="rgba(94, 234, 212, 0.1)"
          strokeWidth="1"
          strokeDasharray="4 4"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.5, delay: 2.7 }}
        />
        <motion.line
          x1={RISK_ZONES[2].x} y1={RISK_ZONES[2].y}
          x2={RISK_ZONES[3].x} y2={RISK_ZONES[3].y}
          stroke="rgba(94, 234, 212, 0.1)"
          strokeWidth="1"
          strokeDasharray="4 4"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.5, delay: 2.9 }}
        />
        <motion.line
          x1={RISK_ZONES[4].x} y1={RISK_ZONES[4].y}
          x2={RISK_ZONES[5].x} y2={RISK_ZONES[5].y}
          stroke="rgba(94, 234, 212, 0.1)"
          strokeWidth="1"
          strokeDasharray="4 4"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.5, delay: 3.1 }}
        />
      </svg>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   SECTION 1: NAVBAR
   ═══════════════════════════════════════════════════════ */

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();
  const bgOpacity = useTransform(scrollY, [0, 80], [0, 0.95]);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <motion.nav
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 120, damping: 20, delay: 0.2 }}
    >
      <motion.div
        className="absolute inset-0 backdrop-blur-xl border-b border-white/5"
        style={{ opacity: bgOpacity }}
      />
      <div className="relative max-w-7xl mx-auto px-6 lg:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-accent-500/20 border border-accent-500/30 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
            </svg>
          </div>
          <span className="text-lg font-bold text-white tracking-tight">Jal Suraksha</span>
        </div>
        <div className="hidden md:flex items-center gap-8">
          {['Features', 'How It Works', 'Architecture'].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase().replace(/ /g, '-')}`}
              className="nav-link relative text-sm font-medium text-white/50 hover:text-white transition-colors duration-300"
            >
              {item}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="px-4 py-2 text-sm font-medium text-white/60 hover:text-white transition-colors"
          >
            Sign In
          </Link>
          <MagneticButton
            href="/register"
            className="px-5 py-2.5 rounded-xl bg-accent-500 text-dark-950 text-sm font-bold hover:bg-accent-400 transition-colors duration-200"
          >
            Get Started
          </MagneticButton>
        </div>
      </div>
    </motion.nav>
  );
}

/* ═══════════════════════════════════════════════════════
   SECTION 2: HERO
   ═══════════════════════════════════════════════════════ */

function Hero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  });
  const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
  const y = useTransform(scrollYProgress, [0, 0.6], [0, -60]);
  const scale = useTransform(scrollYProgress, [0, 0.6], [1, 0.95]);

  return (
    <section ref={containerRef} className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-dark-950" />
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(20,184,166,0.06) 0%, transparent 60%)',
      }} />
      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />

      <motion.div
        className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 py-32 w-full"
        style={{ opacity, y, scale }}
      >
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          {/* Left: Content */}
          <div className="lg:col-span-6 xl:col-span-5">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
            >
              {/* Badge */}
              <motion.div variants={staggerItem} className="mb-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent-500/10 border border-accent-500/20">
                  <span className="w-2 h-2 bg-accent-400 rounded-full animate-pulse-slow" />
                  <span className="text-accent-400 text-xs font-semibold tracking-wider uppercase">SIH 25001 — Smart India Hackathon</span>
                </div>
              </motion.div>

              {/* Headline */}
              <motion.h1
                variants={staggerItem}
                className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold leading-[1.05] tracking-tight text-white mb-6"
              >
                Early Warning
                <br />
                <span className="text-gradient">For Water-Borne</span>
                <br />
                Disease Outbreaks
              </motion.h1>

              {/* Subhead */}
              <motion.p
                variants={staggerItem}
                className="text-base lg:text-lg text-white/40 max-w-lg leading-relaxed mb-10"
              >
                AI-powered surveillance system that predicts and prevents water-borne
                disease outbreaks across rural Northeast India — before they become epidemics.
              </motion.p>

              {/* CTA */}
              <motion.div variants={staggerItem} className="flex flex-wrap gap-4">
                <MagneticButton
                  href="/register"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-accent-500 text-dark-950 text-base font-bold shadow-2xl shadow-accent-500/20"
                >
                  Start Protecting Your Community
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </MagneticButton>
                <MagneticButton
                  href="/login"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl border border-white/10 text-white/60 text-base font-semibold hover:border-white/20 hover:text-white/80 transition-all duration-200"
                >
                  View Demo
                </MagneticButton>
              </motion.div>

              {/* Trust badges */}
              <motion.div variants={staggerItem} className="mt-16 flex items-center gap-6 text-white/25 text-xs font-medium">
                <span className="flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  NHM Integrated
                </span>
                <span className="w-px h-4 bg-white/10" />
                <span className="flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
                  Jal Jeevan Mission
                </span>
                <span className="w-px h-4 bg-white/10" />
                <span className="flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                  IDSP Compatible
                </span>
              </motion.div>
            </motion.div>
          </div>

          {/* Right: Map visualization */}
          <motion.div
            className="lg:col-span-6 xl:col-span-7"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <NEIndiaMap />
          </motion.div>
        </div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 text-white/20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 3 }}
      >
        <span className="text-[10px] font-semibold tracking-[0.2em] uppercase">Scroll</span>
        <motion.div
          className="w-5 h-8 rounded-full border border-white/20 flex justify-center pt-1.5"
          animate={prefersReducedMotion ? {} : { opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <motion.div
            className="w-1 h-2 bg-white/60 rounded-full"
            animate={prefersReducedMotion ? {} : { y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        </motion.div>
      </motion.div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════
   SECTION 3: PROBLEM / STATS
   ═══════════════════════════════════════════════════════ */

const STATS = [
  { value: 3, suffix: '–7 days', label: 'Average delay in outbreak detection', icon: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>
  )},
  { value: 120, suffix: '+', label: 'Million people in NE India at risk', icon: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
  )},
  { value: 85, suffix: '%', label: 'Of villages lack real-time water monitoring', icon: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
  )},
  { value: 40, suffix: '%', label: 'Higher mortality in rural vs urban outbreaks', icon: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
  )},
];

function ProblemSection() {
  const { ref: gridRef, inView: gridInView } = useInViewScroll(0.05);
  return (
    <section className="relative py-32 overflow-hidden">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse 60% 40% at 50% 50%, rgba(20,184,166,0.03) 0%, transparent 60%)',
      }} />

      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
        <Reveal className="mb-20">
          <div className="max-w-2xl">
            <span className="text-accent-400 text-xs font-bold tracking-[0.2em] uppercase block mb-4">The Problem</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight mb-6">
              Water-borne diseases kill{' '}
              <span className="text-gradient">thousands</span> every year — but they're{' '}
              <span className="text-gradient">preventable</span>
            </h2>
            <p className="text-white/35 text-base leading-relaxed">
              In rural Northeast India, delayed detection, poor surveillance, and
              fragmented data mean outbreaks escalate before anyone responds. The
              current system simply isn't fast enough.
            </p>
          </div>
        </Reveal>

        <motion.div
          ref={gridRef}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6"
          initial="hidden"
          animate={gridInView ? 'visible' : 'hidden'}
          variants={staggerContainer}
        >
          {STATS.map((stat, i) => (
            <motion.div
              key={i}
              variants={staggerItem}
              className="group relative p-8 rounded-3xl glass-card hover:bg-white/[0.05] transition-colors duration-300"
            >
              <div className="text-accent-500/50 mb-5 group-hover:text-accent-400 transition-colors duration-300">
                {stat.icon}
              </div>
              <div className="text-3xl lg:text-4xl font-extrabold text-white mb-2 tracking-tight">
                <AnimatedCounter end={stat.value} suffix={stat.suffix} duration={2} />
              </div>
              <div className="text-white/30 text-sm leading-relaxed">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════
   SECTION 4: HOW IT WORKS (horizontal scroll)
   ═══════════════════════════════════════════════════════ */

const STEPS = [
  {
    num: '01',
    title: 'Data Collection',
    desc: 'ASHA workers, PHC staff, and citizens log water quality tests, symptoms, and community reports via mobile app, web, or SMS.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10,9 9,9 8,9"/>
      </svg>
    ),
    details: ['Manual water quality entry', 'Symptom self-reporting', 'Crowdsourced reports', 'IDSP/JJM data pull', 'IMD weather integration'],
  },
  {
    num: '02',
    title: 'AI Analysis',
    desc: 'Our ML engine analyzes patterns, correlates with weather data, and scores risk per village and water source in real-time.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a4 4 0 0 1 4 4c0 1.95-1.4 3.57-3.25 3.92L12 22"/><path d="M12 2a4 4 0 0 0-4 4c0 1.95 1.4 3.57 3.25 3.92"/><path d="M9.25 9.92L12 2"/><circle cx="12" cy="6" r="2"/>
      </svg>
    ),
    details: ['ML outbreak prediction', 'Threshold-based alerts', 'Anomaly detection', 'Dynamic risk scoring', 'Automated dispatch'],
  },
  {
    num: '03',
    title: 'Smart Alerts',
    desc: 'When thresholds are crossed, automated alerts reach health officials within seconds via SMS, app notifications, and email.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
    ),
    details: ['SMS via MSG91/Twilio', 'Push notifications', 'Email alerts', 'Role-based routing', 'Multi-language support'],
  },
  {
    num: '04',
    title: 'Rapid Response',
    desc: 'Field verification tasks auto-assign to nearest ASHA workers. Cases track from report → verification → resolution with timestamps.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/>
      </svg>
    ),
    details: ['Auto task assignment', 'Case verification flow', 'Status tracking', 'Report generation', 'Closure notifications'],
  },
  {
    num: '05',
    title: 'Dashboard & GIS',
    desc: 'Interactive hotspot maps, trend analytics, and district-level dashboards give officials a complete operational picture.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>
    ),
    details: ['Leaflet/Mapbox maps', 'Trend charts', 'Admin dashboard', 'ASHA worker view', 'PDF/Excel exports'],
  },
];

function HowItWorks() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleScroll = () => {
      const scrollLeft = el.scrollLeft;
      const width = el.clientWidth;
      const step = Math.round(scrollLeft / (width * 0.7));
      setActiveStep(Math.min(step, STEPS.length - 1));
    };
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <section id="how-it-works" className="relative py-32 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 mb-16">
        <Reveal>
          <div className="max-w-2xl">
            <span className="text-accent-400 text-xs font-bold tracking-[0.2em] uppercase block mb-4">How It Works</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight mb-6">
              From Detection to <span className="text-gradient">Prevention</span>
            </h2>
            <p className="text-white/35 text-base leading-relaxed">
              A seamless five-step process that turns raw data into life-saving action.
            </p>
          </div>
        </Reveal>

        {/* Progress indicator */}
        <Reveal delay={0.2} className="mt-10 flex items-center gap-3">
          {STEPS.map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <motion.div
                className={`h-1 rounded-full transition-all duration-500 ${
                  i <= activeStep ? 'bg-accent-500' : 'bg-white/10'
                }`}
                animate={{ width: i === activeStep ? 48 : 20 }}
                transition={{ duration: 0.3 }}
              />
            </div>
          ))}
          <span className="text-white/30 text-xs font-mono ml-2">
            {String(activeStep + 1).padStart(2, '0')} / {String(STEPS.length).padStart(2, '0')}
          </span>
        </Reveal>
      </div>

      {/* Horizontal scroll container */}
      <div
        ref={scrollRef}
        className="flex gap-6 overflow-x-auto snap-x snap-mandatory px-6 lg:px-8 pb-4 scrollbar-hide"
        style={{
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
          msOverflowStyle: 'none',
          scrollbarWidth: 'none',
        }}
      >
        {STEPS.map((step, i) => (
          <Reveal key={i} delay={i * 0.08}>
            <div
              className="snap-center flex-shrink-0 w-[85vw] sm:w-[60vw] md:w-[420px] lg:w-[380px] group"
            >
              <div className="relative h-full p-8 rounded-3xl glass-card hover:bg-white/[0.05] transition-all duration-300">
                {/* Step number */}
                <div className="text-6xl font-extrabold text-white/[0.04] group-hover:text-white/[0.08] transition-colors duration-500 absolute top-6 right-6 font-mono">
                  {step.num}
                </div>
                {/* Icon */}
                <div className="w-14 h-14 rounded-2xl bg-accent-500/10 border border-accent-500/20 flex items-center justify-center text-accent-400 mb-6 group-hover:bg-accent-500/20 transition-colors duration-300">
                  {step.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                <p className="text-white/35 text-sm leading-relaxed mb-6">{step.desc}</p>
                {/* Detail chips */}
                <div className="flex flex-wrap gap-2">
                  {step.details.map((d, j) => (
                    <span key={j} className="px-3 py-1 text-[11px] font-medium text-white/25 bg-white/[0.03] rounded-full border border-white/5">
                      {d}
                    </span>
                  ))}
                </div>
                {/* Connector */}
                {i < STEPS.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-3 w-6 h-px bg-white/10" />
                )}
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════
   SECTION 5: FEATURE GRID (tilt cards)
   ═══════════════════════════════════════════════════════ */

const FEATURES = [
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/>
      </svg>
    ),
    title: 'Data Input Modules',
    desc: 'Manual water quality entry, symptom self-reporting, crowdsourced reports, government API integration, and historical data import.',
    tags: ['ASHA Workers', 'Mobile + Web + SMS', 'IDSP/JJM APIs'],
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a4 4 0 0 1 4 4c0 1.95-1.4 3.57-3.25 3.92L12 22"/><path d="M12 2a4 4 0 0 0-4 4c0 1.95 1.4 3.57 3.25 3.92"/>
      </svg>
    ),
    title: 'Prediction Engine',
    desc: 'ML-based outbreak forecasting trained on historical symptoms, water quality trends, and weather patterns. Rule-based threshold alerts and anomaly detection.',
    tags: ['scikit-learn / TensorFlow', 'Real-time Scoring', 'Automated Alerts'],
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/>
      </svg>
    ),
    title: 'Visualization & Dashboard',
    desc: 'GIS hotspot mapping with Leaflet/Mapbox, trend analytics, district-level admin dashboards, and simplified ASHA worker task views.',
    tags: ['Leaflet / Mapbox', 'Charts & Trends', 'Multi-role Views'],
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/>
      </svg>
    ),
    title: 'Verification & Workflow',
    desc: 'PHC doctor case verification, auto-assigned field tasks to nearest ASHA workers, and full status tracking from report to resolution.',
    tags: ['Case Verification', 'Task Assignment', 'Status Tracking'],
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
    title: 'Community Engagement',
    desc: 'Multilingual interface (8 languages), low-literacy voice/icon navigation, offline-first PWA, health advisories, and feedback notifications.',
    tags: ['8 Languages', 'Offline PWA', 'Voice Navigation'],
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
    ),
    title: 'Backend & Security',
    desc: 'Role-based access, SMS/push/email notification engine, RESTful APIs, data encryption, audit logs, and automated compliance reports.',
    tags: ['RBAC', 'Encryption', 'REST APIs'],
  },
];

function FeatureGrid() {
  const { ref: gridRef, inView: gridInView } = useInViewScroll(0.05);
  return (
    <section id="features" className="relative py-32 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <Reveal className="mb-20">
          <div className="max-w-2xl">
            <span className="text-accent-400 text-xs font-bold tracking-[0.2em] uppercase block mb-4">Platform Capabilities</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight mb-6">
              Built for the <span className="text-gradient">Unique Challenges</span> of Northeast India
            </h2>
            <p className="text-white/35 text-base leading-relaxed">
              Every feature is designed for low-connectivity, multilingual, multi-stakeholder
              environments — from village-level reporting to state-level dashboards.
            </p>
          </div>
        </Reveal>

        <motion.div
          ref={gridRef}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-5"
          initial="hidden"
          animate={gridInView ? 'visible' : 'hidden'}
          variants={staggerContainer}
        >
          {FEATURES.map((feat, i) => (
            <motion.div key={i} variants={staggerItem}>
              <TiltCard className="h-full">
                <div className="relative h-full p-7 rounded-3xl glass-card hover:bg-white/[0.05] transition-colors duration-300 group cursor-default">
                  <div className="w-12 h-12 rounded-xl bg-accent-500/10 border border-accent-500/20 flex items-center justify-center text-accent-400 mb-5 group-hover:bg-accent-500/20 transition-colors duration-300">
                    {feat.icon}
                  </div>
                  <h3 className="text-lg font-bold text-white mb-3">{feat.title}</h3>
                  <p className="text-white/35 text-sm leading-relaxed mb-5">{feat.desc}</p>
                  <div className="flex flex-wrap gap-2 mt-auto">
                    {feat.tags.map((tag, j) => (
                      <span key={j} className="px-3 py-1 text-[11px] font-medium text-accent-400/60 bg-accent-500/5 rounded-full border border-accent-500/10">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </TiltCard>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════
   SECTION 6: ARCHITECTURE / TECH (interactive diagram)
   ═══════════════════════════════════════════════════════ */

const TECH_NODES = [
  { id: 'react', label: 'React / Flutter', x: 15, y: 30, group: 'frontend', icon: '📱' },
  { id: 'api', label: 'REST APIs', x: 35, y: 15, group: 'backend', icon: '🔗' },
  { id: 'node', label: 'Node.js / Django', x: 50, y: 35, group: 'backend', icon: '⚙️' },
  { id: 'ml', label: 'ML Engine', x: 70, y: 15, group: 'ml', icon: '🧠' },
  { id: 'db', label: 'PostgreSQL + PostGIS', x: 50, y: 65, group: 'data', icon: '🗄️' },
  { id: 'maps', label: 'Leaflet / Mapbox', x: 15, y: 65, group: 'frontend', icon: '🗺️' },
  { id: 'sms', label: 'SMS Gateway', x: 85, y: 35, group: 'external', icon: '📲' },
  { id: 'weather', label: 'IMD Weather API', x: 85, y: 65, group: 'external', icon: '🌧️' },
  { id: 'govt', label: 'IDSP / NHM / JJM', x: 35, y: 80, group: 'external', icon: '🏛️' },
  { id: 'cloud', label: 'AWS / NIC Cloud', x: 70, y: 80, group: 'infra', icon: '☁️' },
];

const CONNECTIONS: [string, string][] = [
  ['react', 'api'],
  ['maps', 'api'],
  ['api', 'node'],
  ['node', 'ml'],
  ['node', 'db'],
  ['ml', 'db'],
  ['ml', 'weather'],
  ['sms', 'node'],
  ['govt', 'api'],
  ['db', 'cloud'],
  ['weather', 'ml'],
  ['govt', 'db'],
];

const GROUP_COLORS: Record<string, string> = {
  frontend: '#2dd4bf',
  backend: '#3b82f6',
  ml: '#8b5cf6',
  data: '#f59e0b',
  external: '#ef4444',
  infra: '#6b7280',
};

function Architecture() {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const connectedNodes = useMemo(() => {
    if (!hoveredNode) return new Set<string>();
    const connected = new Set<string>([hoveredNode]);
    CONNECTIONS.forEach(([a, b]) => {
      if (a === hoveredNode) connected.add(b);
      if (b === hoveredNode) connected.add(a);
    });
    return connected;
  }, [hoveredNode]);

  const connectedEdges = useMemo(() => {
    if (!hoveredNode) return new Set<string>();
    const edges = new Set<string>();
    CONNECTIONS.forEach(([a, b], i) => {
      if (a === hoveredNode || b === hoveredNode) edges.add(String(i));
    });
    return edges;
  }, [hoveredNode]);

  return (
    <section id="architecture" className="relative py-32 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <Reveal className="mb-16">
          <div className="max-w-2xl">
            <span className="text-accent-400 text-xs font-bold tracking-[0.2em] uppercase block mb-4">Tech Stack</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight mb-6">
              Architecture Overview
            </h2>
            <p className="text-white/35 text-base leading-relaxed">
              Hover any node to see its connections. Built on proven open-source
              technologies for reliability and cost-effectiveness.
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.15}>
          <div className="relative rounded-3xl glass-card p-6 sm:p-10 overflow-hidden">
            {/* Legend */}
            <div className="flex flex-wrap gap-4 mb-8">
              {Object.entries(GROUP_COLORS).map(([group, color]) => (
                <div key={group} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                  <span className="text-xs text-white/40 capitalize">{group}</span>
                </div>
              ))}
            </div>

            {/* Diagram */}
            <div className="relative w-full" style={{ paddingBottom: '55%', minHeight: 300 }}>
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
                {/* Connections */}
                {CONNECTIONS.map(([a, b], i) => {
                  const nodeA = TECH_NODES.find(n => n.id === a)!;
                  const nodeB = TECH_NODES.find(n => n.id === b)!;
                  const isHighlighted = connectedEdges.has(String(i));
                  return (
                    <line
                      key={i}
                      x1={nodeA.x}
                      y1={nodeA.y}
                      x2={nodeB.x}
                      y2={nodeB.y}
                      stroke={isHighlighted ? '#14b8a6' : 'rgba(255,255,255,0.06)'}
                      strokeWidth={isHighlighted ? 0.3 : 0.15}
                      style={{
                        transition: 'all 0.3s ease',
                      }}
                    />
                  );
                })}
              </svg>

              {/* Nodes */}
              {TECH_NODES.map((node) => {
                const isHovered = hoveredNode === node.id;
                const isConnected = connectedNodes.has(node.id);
                const isDimmed = hoveredNode && !isConnected;
                const color = GROUP_COLORS[node.group];

                return (
                  <motion.div
                    key={node.id}
                    className="absolute flex flex-col items-center gap-1.5 cursor-pointer"
                    style={{
                      left: `${node.x}%`,
                      top: `${node.y}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                    onMouseEnter={() => setHoveredNode(node.id)}
                    onMouseLeave={() => setHoveredNode(null)}
                    animate={{
                      opacity: isDimmed ? 0.3 : 1,
                      scale: isHovered ? 1.15 : isConnected ? 1.05 : 1,
                    }}
                    transition={{ duration: 0.2 }}
                  >
                    <div
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-lg sm:text-xl"
                      style={{
                        background: `${color}15`,
                        border: `1px solid ${color}30`,
                        boxShadow: isHovered ? `0 0 20px ${color}40` : 'none',
                        transition: 'box-shadow 0.3s ease',
                      }}
                    >
                      {node.icon}
                    </div>
                    <span className="text-[10px] sm:text-xs font-medium text-white/50 text-center whitespace-nowrap leading-tight">
                      {node.label}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </Reveal>

        {/* Tech stack list */}
        <Reveal delay={0.25} className="mt-12">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { category: 'Frontend', items: 'React · Flutter · Tailwind', color: '#2dd4bf' },
              { category: 'Backend', items: 'Node.js · Django · Express', color: '#3b82f6' },
              { category: 'Data & ML', items: 'PostgreSQL · PostGIS · scikit-learn · TensorFlow', color: '#8b5cf6' },
              { category: 'Infrastructure', items: 'AWS / NIC Cloud · Twilio · MSG91', color: '#f59e0b' },
            ].map((stack, i) => (
              <div key={i} className="p-5 rounded-2xl glass-card">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: stack.color }} />
                  <span className="text-xs font-bold text-white/60 uppercase tracking-wider">{stack.category}</span>
                </div>
                <p className="text-sm text-white/30 leading-relaxed">{stack.items}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════
   SECTION 7: CTA + FOOTER
   ═══════════════════════════════════════════════════════ */

function CTAFooter() {
  return (
    <>
      {/* CTA */}
      <section className="relative py-32 overflow-hidden">
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse 80% 50% at 50% 50%, rgba(20,184,166,0.08) 0%, transparent 60%)',
        }} />
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center relative z-10">
          <Reveal>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent-500/10 border border-accent-500/20 mb-8">
              <span className="w-2 h-2 bg-accent-400 rounded-full" />
              <span className="text-accent-400 text-xs font-semibold tracking-wider uppercase">Open Source · SIH 25001</span>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="text-3xl sm:text-4xl lg:text-6xl font-extrabold text-white leading-tight mb-6">
              Every Drop of Clean Water
              <br />
              <span className="text-gradient">Saves a Life</span>
            </h2>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="text-lg text-white/35 max-w-xl mx-auto mb-12 leading-relaxed">
              Deploy Jal Suraksha in your district. Protect your community.
              Prevent the next outbreak — before it starts.
            </p>
          </Reveal>
          <Reveal delay={0.3}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <MagneticButton
                href="/register"
                className="inline-flex items-center gap-3 px-10 py-5 rounded-2xl bg-accent-500 text-dark-950 text-lg font-bold shadow-2xl shadow-accent-500/20"
              >
                Get Started Free
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </MagneticButton>
              <MagneticButton
                href="/login"
                className="inline-flex items-center gap-2 px-10 py-5 rounded-2xl border border-white/10 text-white/60 text-lg font-semibold hover:border-white/20 hover:text-white/80 transition-colors duration-200"
              >
                View Dashboard Demo
              </MagneticButton>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
          <div className="grid md:grid-cols-4 gap-12 mb-16">
            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-accent-500/20 border border-accent-500/30 flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
                  </svg>
                </div>
                <span className="text-sm font-bold text-white">Jal Suraksha</span>
              </div>
              <p className="text-xs text-white/25 leading-relaxed">
                AI-powered water-borne disease early warning system for rural Northeast India.
              </p>
            </div>

            {/* Links */}
            {[
              { title: 'Platform', links: ['Dashboard', 'GIS Map', 'Reports', 'Alerts'] },
              { title: 'Resources', links: ['Documentation', 'API Reference', 'Community', 'Blog'] },
              { title: 'Connect', links: ['GitHub', 'Twitter', 'Contact', 'Support'] },
            ].map((col, i) => (
              <div key={i}>
                <h4 className="text-xs font-bold text-white/50 uppercase tracking-wider mb-4">{col.title}</h4>
                <ul className="space-y-2.5">
                  {col.links.map((link, j) => (
                    <li key={j}>
                      <a href="#" className="text-sm text-white/25 hover:text-white/60 transition-colors duration-200">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Bottom */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-white/5">
            <p className="text-xs text-white/20">
              © 2024 Jal Suraksha. Built for Smart India Hackathon.
            </p>
            <div className="flex items-center gap-6">
              <span className="flex items-center gap-2 text-xs text-white/20">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                All systems operational
              </span>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN LANDING PAGE
   ═══════════════════════════════════════════════════════ */

export default function Landing() {
  return (
    <ReactLenis root options={{ lerp: 0.08, duration: 1.2, smoothWheel: true }}>
      <div className="min-h-screen bg-dark-950 text-white overflow-x-hidden">
        <Navbar />
        <Hero />
        <ProblemSection />
        <HowItWorks />
        <FeatureGrid />
        <Architecture />
        <CTAFooter />
      </div>
    </ReactLenis>
  );
}
