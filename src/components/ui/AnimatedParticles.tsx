import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  shape: 'circle' | 'square' | 'triangle' | 'hexagon';
  color: string;
}

export const AnimatedParticles: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Particle colors using HSL design tokens
    const colors = [
      'hsl(215, 25%, 45%)',      // primary
      'hsl(200, 95%, 35%)',      // bgc-blue
      'hsl(215, 20%, 50%)',      // accent
      'hsl(215, 30%, 55%)',      // primary-hover
    ];

    // Initialize particles
    const createParticle = (): Particle => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 40 + 20,
      speedX: (Math.random() - 0.5) * 0.5,
      speedY: (Math.random() - 0.5) * 0.5,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.02,
      opacity: Math.random() * 0.15 + 0.05,
      shape: ['circle', 'square', 'triangle', 'hexagon'][Math.floor(Math.random() * 4)] as Particle['shape'],
      color: colors[Math.floor(Math.random() * colors.length)]
    });

    // Create initial particles
    particlesRef.current = Array.from({ length: 25 }, createParticle);

    // Draw shape functions
    const drawCircle = (ctx: CanvasRenderingContext2D, particle: Particle) => {
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size / 2, 0, Math.PI * 2);
      ctx.fill();
    };

    const drawSquare = (ctx: CanvasRenderingContext2D, particle: Particle) => {
      ctx.save();
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.rotation);
      ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);
      ctx.restore();
    };

    const drawTriangle = (ctx: CanvasRenderingContext2D, particle: Particle) => {
      ctx.save();
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.rotation);
      ctx.beginPath();
      ctx.moveTo(0, -particle.size / 2);
      ctx.lineTo(particle.size / 2, particle.size / 2);
      ctx.lineTo(-particle.size / 2, particle.size / 2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    const drawHexagon = (ctx: CanvasRenderingContext2D, particle: Particle) => {
      ctx.save();
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.rotation);
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        const x = (particle.size / 2) * Math.cos(angle);
        const y = (particle.size / 2) * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current.forEach(particle => {
        // Update position
        particle.x += particle.speedX;
        particle.y += particle.speedY;
        particle.rotation += particle.rotationSpeed;

        // Wrap around screen
        if (particle.x > canvas.width + particle.size) particle.x = -particle.size;
        if (particle.x < -particle.size) particle.x = canvas.width + particle.size;
        if (particle.y > canvas.height + particle.size) particle.y = -particle.size;
        if (particle.y < -particle.size) particle.y = canvas.height + particle.size;

        // Draw particle
        ctx.fillStyle = particle.color.replace(')', `, ${particle.opacity})`).replace('hsl', 'hsla');
        
        switch (particle.shape) {
          case 'circle':
            drawCircle(ctx, particle);
            break;
          case 'square':
            drawSquare(ctx, particle);
            break;
          case 'triangle':
            drawTriangle(ctx, particle);
            break;
          case 'hexagon':
            drawHexagon(ctx, particle);
            break;
        }
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ mixBlendMode: 'normal' }}
    />
  );
};
