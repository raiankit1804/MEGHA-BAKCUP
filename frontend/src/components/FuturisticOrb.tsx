'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';

interface FuturisticOrbProps {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  isTyping?: boolean;
  isListening?: boolean;
  onClick?: () => void;
  height?: number | string;
  showGrid?: boolean;
}

export default function FuturisticOrb({
  primaryColor = '#10b981',     // Vibrant emerald green
  secondaryColor = '#06b6d4',   // Ethereal cyan / teal
  accentColor = '#34d399',      // Bright mint highlight
  isTyping = false,
  isListening = false,
  onClick,
  height = 260,
  showGrid = true,
}: FuturisticOrbProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Mouse & physics tracking
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0, isOver: false });
  const [isHovered, setIsHovered] = useState(false);
  const shockwavesRef = useRef<{ radius: number; maxRadius: number; opacity: number; speed: number }[]>([]);
  const particlesRef = useRef<{ x: number; y: number; vx: number; vy: number; size: number; alpha: number; life: number }[]>([]);

  // Shockwave on click
  const triggerPulse = useCallback(() => {
    const canvas = canvasRef.current;
    const maxR = canvas ? Math.min(canvas.clientWidth, canvas.clientHeight) * 0.44 : 85;
    shockwavesRef.current.push({
      radius: 18,
      maxRadius: maxR,
      opacity: 0.85,
      speed: 3.6,
    });
    // Add burst particles
    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20 + (Math.random() - 0.5) * 0.4;
      const speed = 1.6 + Math.random() * 2.8;
      particlesRef.current.push({
        x: 0,
        y: 0,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 1.5 + Math.random() * 2,
        alpha: 0.9,
        life: 1,
      });
    }
  }, []);

  const handleClick = () => {
    triggerPulse();
    onClick?.();
  };

  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = (e.clientX - centerX) / (window.innerWidth / 2);
      const dy = (e.clientY - centerY) / (window.innerHeight / 2);
      mouseRef.current.targetX = Math.max(-1, Math.min(1, dx));
      mouseRef.current.targetY = Math.max(-1, Math.min(1, dy));
    };

    window.addEventListener('mousemove', handleWindowMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleWindowMouseMove);
  }, []);

  // Main animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = canvas.clientWidth || 480;
      const height = canvas.clientHeight || 320;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener('resize', resize);

    // Initial ambient particles
    for (let i = 0; i < 18; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 70 + Math.random() * 90;
      particlesRef.current.push({
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        size: 1 + Math.random() * 2,
        alpha: 0.2 + Math.random() * 0.6,
        life: 0.5 + Math.random() * 0.5,
      });
    }

    const render = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const cx = width / 2;
      const cy = height / 2;

      // Smooth mouse interpolation
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.06;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.06;

      ctx.clearRect(0, 0, width, height);

      // ─── 1. Background Cyber Matrix Grid ───────────────────────────────
      if (showGrid) {
        const gridSize = 24;
        const gridCols = Math.ceil(width / gridSize);
        const gridRows = Math.ceil(height / gridSize);

        ctx.save();
        ctx.lineWidth = 0.65;

        // Vertical grid lines with edge gradient fade
        for (let x = 0; x <= gridCols; x++) {
          const posX = x * gridSize;
          const distFromCenter = Math.abs(posX - cx) / (width / 2);
          const alpha = Math.max(0, 0.08 * (1 - distFromCenter * 0.9));

          const vGrad = ctx.createLinearGradient(0, 0, 0, height);
          vGrad.addColorStop(0, 'rgba(38, 222, 175, 0)');
          vGrad.addColorStop(0.2, `rgba(38, 222, 175, ${alpha})`);
          vGrad.addColorStop(0.8, `rgba(38, 222, 175, ${alpha})`);
          vGrad.addColorStop(1, 'rgba(38, 222, 175, 0)');

          ctx.strokeStyle = vGrad;
          ctx.beginPath();
          ctx.moveTo(posX, 0);
          ctx.lineTo(posX, height);
          ctx.stroke();
        }

        // Horizontal grid lines with edge gradient fade
        for (let y = 0; y <= gridRows; y++) {
          const posY = y * gridSize;
          const distFromCenter = Math.abs(posY - cy) / (height / 2);
          const alpha = Math.max(0, 0.08 * (1 - distFromCenter * 0.9));

          const hGrad = ctx.createLinearGradient(0, 0, width, 0);
          hGrad.addColorStop(0, 'rgba(38, 222, 175, 0)');
          hGrad.addColorStop(0.2, `rgba(38, 222, 175, ${alpha})`);
          hGrad.addColorStop(0.8, `rgba(38, 222, 175, ${alpha})`);
          hGrad.addColorStop(1, 'rgba(38, 222, 175, 0)');

          ctx.strokeStyle = hGrad;
          ctx.beginPath();
          ctx.moveTo(0, posY);
          ctx.lineTo(width, posY);
          ctx.stroke();
        }
        ctx.restore();
      }

      // ─── 2. Atmospheric Radial Ambient Glow ─────────────────────────────
      const ambientScale = isListening ? 1 + Math.sin(time * 5) * 0.15 : 1;
      const glowGrad = ctx.createRadialGradient(
        cx + mouseRef.current.x * 25,
        cy + mouseRef.current.y * 20,
        15,
        cx,
        cy,
        Math.min(width, height) * (isListening ? 0.8 : 0.65) * ambientScale
      );
      glowGrad.addColorStop(0, isListening ? 'rgba(52, 211, 153, 0.52)' : 'rgba(16, 185, 129, 0.28)');
      glowGrad.addColorStop(0.35, isListening ? 'rgba(6, 182, 212, 0.32)' : 'rgba(6, 182, 212, 0.16)');
      glowGrad.addColorStop(0.7, 'rgba(16, 185, 129, 0.04)');
      glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, width, height);

      // Speed multipliers based on interaction
      const hoverSpeed = mouseRef.current.isOver ? 2.0 : 1.0;
      const typingSpeed = isTyping ? 1.8 : 1.0;
      const listeningSpeed = isListening ? 2.6 : 1.0;
      time += 0.022 * hoverSpeed * typingSpeed * listeningSpeed;

      // When listening: dynamically emit acoustic energy wave rings
      if (isListening && Math.floor(time * 50) % 22 === 0) {
        shockwavesRef.current.push({
          radius: Math.min(width, height) * 0.24,
          maxRadius: Math.min(width, height) * 0.44,
          opacity: 0.82,
          speed: 3.2,
        });
      }

      // ─── 3. Shockwave Rings ─────────────────────────────────────────────
      for (let i = shockwavesRef.current.length - 1; i >= 0; i--) {
        const sw = shockwavesRef.current[i];
        sw.radius += sw.speed;
        sw.opacity *= 0.93;

        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, sw.radius, 0, Math.PI * 2);
        ctx.strokeStyle = isListening ? `rgba(110, 231, 183, ${sw.opacity})` : `rgba(52, 211, 153, ${sw.opacity})`;
        ctx.lineWidth = isListening ? 2.5 : 2.0;
        ctx.shadowColor = '#34d399';
        ctx.shadowBlur = isListening ? 18 : 12;
        ctx.stroke();
        ctx.restore();

        if (sw.radius >= sw.maxRadius || sw.opacity < 0.02) {
          shockwavesRef.current.splice(i, 1);
        }
      }

      // ─── 4. 3D Fluid Organic Orb Rendering ──────────────────────────────
      // Orb center offset by gentle mouse tilt (strictly bounded to prevent edge clipping)
      const orbX = cx + mouseRef.current.x * 12;
      const orbY = cy + mouseRef.current.y * 10;
      const maxDimension = Math.min(width, height);
      const baseRadius = maxDimension * 0.22 * (mouseRef.current.isOver ? 1.05 : 1.0) * (isListening ? (1 + Math.sin(time * 6) * 0.05) : 1.0);

      // Render layered harmonic fluid wave shells (back to front)
      const numLayers = 4;
      for (let l = 0; l < numLayers; l++) {
        ctx.save();

        const layerProgress = l / numLayers;
        const layerRadius = baseRadius * (0.85 + layerProgress * 0.18);
        const points = 48;

        ctx.beginPath();
        for (let i = 0; i <= points; i++) {
          const angle = (i / points) * Math.PI * 2;

          // Multi-harmonic organic fluid deformation - safely proportional to baseRadius
          const wave1 = Math.sin(angle * 3 + time * 1.2 + l * 0.8) * (baseRadius * 0.12);
          const wave2 = Math.cos(angle * 5 - time * 1.5 + l * 1.2) * (baseRadius * 0.08);
          const wave3 = Math.sin(angle * 2 + time * 0.7) * (isTyping ? baseRadius * 0.12 : baseRadius * 0.06);
          const voiceDeform = isListening
            ? (Math.sin(angle * 7 + time * 4.2) * 0.12 + Math.cos(angle * 4 - time * 3.5) * 0.08) * baseRadius
            : 0;
          const mouseDeform =
            Math.sin(angle - Math.atan2(mouseRef.current.y, mouseRef.current.x)) *
            (mouseRef.current.isOver ? baseRadius * 0.12 : baseRadius * 0.05);

          const r = layerRadius + wave1 + wave2 + wave3 + voiceDeform + mouseDeform;
          const px = orbX + Math.cos(angle) * r;
          const py = orbY + Math.sin(angle) * r;

          if (i === 0) {
            ctx.moveTo(px, py);
          } else {
            ctx.lineTo(px, py);
          }
        }
        ctx.closePath();

        // Layer color styling: deep emerald core to luminous translucent cyan mantle
        if (l === 0) {
          // Deep core
          const coreGrad = ctx.createRadialGradient(
            orbX - 25,
            orbY - 30,
            10,
            orbX,
            orbY,
            layerRadius
          );
          coreGrad.addColorStop(0, 'rgba(5, 46, 38, 0.95)');
          coreGrad.addColorStop(0.5, 'rgba(6, 78, 59, 0.85)');
          coreGrad.addColorStop(0.85, 'rgba(16, 185, 129, 0.55)');
          coreGrad.addColorStop(1, 'rgba(52, 211, 153, 0.2)');
          ctx.fillStyle = coreGrad;
          ctx.fill();
        } else if (l === 1) {
          // Internal smoky translucent veil
          const veilGrad = ctx.createLinearGradient(
            orbX - layerRadius,
            orbY - layerRadius,
            orbX + layerRadius,
            orbY + layerRadius
          );
          veilGrad.addColorStop(0, 'rgba(6, 182, 212, 0.25)');
          veilGrad.addColorStop(0.4, 'rgba(16, 185, 129, 0.35)');
          veilGrad.addColorStop(0.8, 'rgba(20, 184, 166, 0.15)');
          veilGrad.addColorStop(1, 'rgba(4, 120, 87, 0.35)');
          ctx.fillStyle = veilGrad;
          ctx.fill();
        } else if (l === 2) {
          // Iridescent edge glow & caustic highlight
          ctx.strokeStyle = 'rgba(52, 211, 153, 0.55)';
          ctx.lineWidth = 1.8;
          ctx.shadowColor = '#10b981';
          ctx.shadowBlur = mouseRef.current.isOver ? 24 : 14;
          ctx.stroke();
        } else {
          // Outer ethereal rim
          const rimGrad = ctx.createLinearGradient(
            orbX - layerRadius * 0.8,
            orbY - layerRadius,
            orbX + layerRadius,
            orbY + layerRadius
          );
          rimGrad.addColorStop(0, 'rgba(167, 243, 208, 0.7)');
          rimGrad.addColorStop(0.4, 'rgba(6, 182, 212, 0.4)');
          rimGrad.addColorStop(0.8, 'rgba(16, 185, 129, 0.15)');
          rimGrad.addColorStop(1, 'rgba(52, 211, 153, 0.6)');

          ctx.strokeStyle = rimGrad;
          ctx.lineWidth = 2.2;
          ctx.shadowColor = '#06b6d4';
          ctx.shadowBlur = mouseRef.current.isOver ? 30 : 18;
          ctx.stroke();
        }

        ctx.restore();
      }

      // ─── 5. Specular Sheen & Glass Reflection Highlight ────────────────
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(
        orbX - baseRadius * 0.32,
        orbY - baseRadius * 0.36,
        baseRadius * 0.42,
        baseRadius * 0.22,
        -Math.PI / 5,
        0,
        Math.PI * 2
      );
      const sheenGrad = ctx.createLinearGradient(
        orbX - baseRadius * 0.6,
        orbY - baseRadius * 0.5,
        orbX,
        orbY
      );
      sheenGrad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
      sheenGrad.addColorStop(0.5, 'rgba(167, 243, 208, 0.18)');
      sheenGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = sheenGrad;
      ctx.filter = 'blur(6px)';
      ctx.fill();
      ctx.restore();

      // ─── 6. Luminous Floating Particles / Embers ────────────────────────
      ctx.save();
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;

        // Gentle orbital pull towards the orb
        const dist = Math.hypot(p.x, p.y);
        const maxOrbDist = maxDimension * 0.42;
        if (dist > maxOrbDist) {
          p.vx -= (p.x / dist) * 0.14;
          p.vy -= (p.y / dist) * 0.14;
        }

        ctx.beginPath();
        ctx.arc(cx + p.x, cy + p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(52, 211, 153, ${p.alpha})`;
        ctx.shadowColor = '#34d399';
        ctx.shadowBlur = 8;
        ctx.fill();

        // Slow fade
        p.alpha -= 0.003;
        if (p.alpha <= 0.05) {
          // Respawn in vicinity
          const angle = Math.random() * Math.PI * 2;
          const spawnDist = baseRadius * (0.8 + Math.random() * 0.4);
          p.x = Math.cos(angle) * spawnDist;
          p.y = Math.sin(angle) * spawnDist;
          p.vx = (Math.random() - 0.5) * 0.8;
          p.vy = (Math.random() - 0.5) * 0.8;
          p.alpha = 0.3 + Math.random() * 0.5;
        }
      }
      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [isTyping, isListening]);

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      onMouseEnter={() => {
        mouseRef.current.isOver = true;
        setIsHovered(true);
      }}
      onMouseLeave={() => {
        mouseRef.current.isOver = false;
        setIsHovered(false);
      }}
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: 540,
        height: typeof height === 'number' ? `${height}px` : height,
        margin: '0 auto 0.4rem auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        userSelect: 'none',
        transform: isHovered ? 'scale(1.02)' : 'scale(1)',
        transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        overflow: 'visible',
      }}
      title="Interactive AI Core — Click to pulse energy"
      aria-label="Interactive AI Fluid Core"
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      />

      {/* Dynamic Listening Indicator when Mic is active */}
      {isListening && (
        <div
          style={{
            position: 'absolute',
            bottom: '12px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.65rem',
            padding: '0.45rem 1.15rem',
            borderRadius: '9999px',
            background: 'rgba(5, 46, 38, 0.94)',
            border: '1.5px solid #34d399',
            boxShadow: '0 0 25px rgba(52, 211, 153, 0.6), 0 4px 16px rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(12px)',
            color: '#ecfdf5',
            fontSize: '0.86rem',
            fontWeight: 600,
            letterSpacing: '0.02em',
            zIndex: 15,
            pointerEvents: 'none',
            animation: 'fadeIn 0.25s ease-out',
          }}
        >
          <span style={{ fontSize: '1.05rem', filter: 'drop-shadow(0 0 6px #34d399)' }}>🎙️</span>
          <span>Listening... Speak now</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px', height: '14px', marginLeft: '0.25rem' }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <span
                key={i}
                style={{
                  width: '3px',
                  height: '100%',
                  background: 'linear-gradient(to top, #10b981, #34d399)',
                  borderRadius: '3px',
                  boxShadow: '0 0 6px #34d399',
                  animation: `equalizerBounce 0.6s ease-in-out infinite alternate ${i * 0.12}s`,
                }}
              />
            ))}
          </div>
          <style>{`
            @keyframes equalizerBounce {
              0% { transform: scaleY(0.2); }
              100% { transform: scaleY(1.35); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
