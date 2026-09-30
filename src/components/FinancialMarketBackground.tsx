import React, { useEffect, useRef } from 'react';

export const FinancialMarketBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    const onResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };
    window.addEventListener('resize', onResize);

    // Mouse parallax offset
    let mouseX = 0;
    let mouseY = 0;
    let targetMouseX = 0;
    let targetMouseY = 0;

    const onMouseMove = (e: MouseEvent) => {
      targetMouseX = (e.clientX / window.innerWidth - 0.5) * 40;
      targetMouseY = (e.clientY / window.innerHeight - 0.5) * 40;
    };
    window.addEventListener('mousemove', onMouseMove);

    // Financial data state matching the video
    // 1. Live ticker table numbers
    interface TickerCol {
      x: number;
      speed: number;
      numbers: { val: string; high: boolean }[];
    }

    const columns: TickerCol[] = [];
    const colCount = Math.floor(width / 95);
    for (let i = 0; i < colCount; i++) {
      const numbers = [];
      for (let j = 0; j < 25; j++) {
        const val =
          Math.random() > 0.4
            ? (Math.random() * 25 + 5).toFixed(2)
            : Math.floor(Math.random() * 85000 + 10000).toString();
        numbers.push({ val, high: Math.random() > 0.7 });
      }
      columns.push({
        x: width * 0.35 + (i * (width * 0.65)) / colCount,
        speed: 0.3 + Math.random() * 0.5,
        numbers,
      });
    }

    // 2. Continuous fluctuating financial chart line
    const pointCount = 35;
    const chartPoints: { y: number; targetY: number; speed: number }[] = [];
    for (let i = 0; i < pointCount; i++) {
      const base = height * 0.55 + Math.sin(i * 0.3) * 80;
      chartPoints.push({
        y: base,
        targetY: base,
        speed: 0.03 + Math.random() * 0.04,
      });
    }

    // 3. Floating percentage badges from the video (+0.48%, +0.52%, +0.65%, etc.)
    interface Badge {
      x: number;
      y: number;
      text: string;
      isPositive: boolean;
      speedY: number;
      speedX: number;
      size: number;
      opacity: number;
    }

    const badges: Badge[] = [
      { x: width * 0.45, y: height * 0.28, text: '+0.48%', isPositive: true, speedY: -0.2, speedX: 0.1, size: 26, opacity: 0.9 },
      { x: width * 0.68, y: height * 0.18, text: '+0.52%', isPositive: true, speedY: -0.15, speedX: -0.1, size: 28, opacity: 0.95 },
      { x: width * 0.82, y: height * 0.38, text: '+0.65%', isPositive: true, speedY: -0.18, speedX: 0.05, size: 24, opacity: 0.75 },
      { x: width * 0.52, y: height * 0.65, text: '+0.47%', isPositive: true, speedY: -0.25, speedX: 0.1, size: 22, opacity: 0.85 },
      { x: width * 0.76, y: height * 0.78, text: '-0.94%', isPositive: false, speedY: -0.1, speedX: -0.05, size: 26, opacity: 0.8 },
      { x: width * 0.90, y: height * 0.22, text: '+0.21%', isPositive: true, speedY: -0.12, speedX: 0.08, size: 20, opacity: 0.7 },
      { x: width * 0.62, y: height * 0.48, text: '-0.18%', isPositive: false, speedY: -0.14, speedX: -0.1, size: 22, opacity: 0.7 },
    ];

    // 4. Candlesticks
    interface Candlestick {
      x: number;
      open: number;
      close: number;
      high: number;
      low: number;
      isUp: boolean;
    }

    const candlesticks: Candlestick[] = [];
    for (let i = 0; i < 28; i++) {
      const open = height * 0.45 + Math.random() * 120;
      const diff = (Math.random() - 0.48) * 45;
      const close = open + diff;
      const high = Math.min(open, close) - Math.random() * 25;
      const low = Math.max(open, close) + Math.random() * 25;
      candlesticks.push({
        x: width * 0.3 + (i * (width * 0.68)) / 28,
        open,
        close,
        high,
        low,
        isUp: close < open,
      });
    }

    let frame = 0;

    const render = () => {
      frame++;
      // Smooth mouse parallax
      mouseX += (targetMouseX - mouseX) * 0.05;
      mouseY += (targetMouseY - mouseY) * 0.05;

      // Light paper base canvas background (#F7F4EC)
      ctx.fillStyle = '#F7F4EC';
      ctx.fillRect(0, 0, width, height);

      // Radial subtle warm paper wash
      const radialGlow = ctx.createRadialGradient(
        width * 0.75 + mouseX,
        height * 0.4 + mouseY,
        20,
        width * 0.75 + mouseX,
        height * 0.4 + mouseY,
        width * 0.65
      );
      radialGlow.addColorStop(0, 'rgba(235, 228, 214, 0.6)');
      radialGlow.addColorStop(0.5, 'rgba(240, 235, 224, 0.3)');
      radialGlow.addColorStop(1, 'rgba(247, 244, 236, 0)');
      ctx.fillStyle = radialGlow;
      ctx.fillRect(0, 0, width, height);

      // Draw Perspective Grid Matrix (Stock Data Board in subtle ink)
      ctx.save();
      ctx.font = '11px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';

      columns.forEach((col) => {
        const drawX = col.x + mouseX * 0.6;
        col.numbers.forEach((item, numIdx) => {
          const rawY = numIdx * 28 + (frame * col.speed) % 700;
          const drawY = (rawY % height) + mouseY * 0.4;

          // Gradient fading on edges
          const alphaDist = Math.sin((drawY / height) * Math.PI);
          const alpha = Math.max(0.04, alphaDist * 0.22);

          if (item.high) {
            ctx.fillStyle = `rgba(27, 36, 48, ${alpha * 1.4})`;
            ctx.shadowBlur = 0;
          } else {
            ctx.fillStyle = `rgba(92, 100, 112, ${alpha * 0.9})`;
            ctx.shadowBlur = 0;
          }

          ctx.fillText(item.val, drawX, drawY);
        });
      });
      ctx.restore();

      // Draw Candlesticks in subtle ledger ink
      ctx.save();
      candlesticks.forEach((cs) => {
        const x = cs.x + mouseX * 0.8;
        const color = cs.isUp ? '#1E3A8A' : '#991B1B';
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 1.0;

        // Wick
        ctx.beginPath();
        ctx.moveTo(x, cs.high + mouseY * 0.6);
        ctx.lineTo(x, cs.low + mouseY * 0.6);
        ctx.stroke();

        // Candle Body
        const top = Math.min(cs.open, cs.close) + mouseY * 0.6;
        const bodyHeight = Math.max(4, Math.abs(cs.open - cs.close));
        ctx.shadowBlur = 0;
        ctx.fillRect(x - 3, top, 6, bodyHeight);
      });
      ctx.restore();

      // Draw Jagged Line Chart with paper fill
      ctx.save();
      if (frame % 20 === 0) {
        chartPoints.forEach((p) => {
          p.targetY = height * 0.55 + Math.sin(frame * 0.02 + p.y) * 90 + (Math.random() - 0.5) * 35;
        });
      }

      chartPoints.forEach((p) => {
        p.y += (p.targetY - p.y) * p.speed;
      });

      const step = (width * 0.85) / (pointCount - 1);
      const startX = width * 0.15 + mouseX;

      // Area gradient
      const areaGrad = ctx.createLinearGradient(0, height * 0.3, 0, height);
      areaGrad.addColorStop(0, 'rgba(30, 58, 138, 0.08)');
      areaGrad.addColorStop(0.7, 'rgba(30, 58, 138, 0.02)');
      areaGrad.addColorStop(1, 'rgba(247, 244, 236, 0)');

      ctx.beginPath();
      ctx.moveTo(startX, height);
      for (let i = 0; i < pointCount; i++) {
        const px = startX + i * step;
        const py = chartPoints[i].y + mouseY;
        if (i === 0) ctx.lineTo(px, py);
        else {
          const prevX = startX + (i - 1) * step;
          const prevY = chartPoints[i - 1].y + mouseY;
          const cx = (prevX + px) / 2;
          ctx.bezierCurveTo(cx, prevY, cx, py, px, py);
        }
      }
      ctx.lineTo(startX + (pointCount - 1) * step, height);
      ctx.closePath();
      ctx.fillStyle = areaGrad;
      ctx.fill();

      // Stroke Line in Ink Navy
      ctx.beginPath();
      for (let i = 0; i < pointCount; i++) {
        const px = startX + i * step;
        const py = chartPoints[i].y + mouseY;
        if (i === 0) ctx.moveTo(px, py);
        else {
          const prevX = startX + (i - 1) * step;
          const prevY = chartPoints[i - 1].y + mouseY;
          const cx = (prevX + px) / 2;
          ctx.bezierCurveTo(cx, prevY, cx, py, px, py);
        }
      }
      ctx.strokeStyle = '#1E3A8A';
      ctx.lineWidth = 1.8;
      ctx.shadowBlur = 0;
      ctx.stroke();

      // Clean nodes on the chart
      for (let i = 3; i < pointCount; i += 6) {
        const px = startX + i * step;
        const py = chartPoints[i].y + mouseY;
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#1E3A8A';
        ctx.shadowBlur = 0;
        ctx.fill();
      }
      ctx.restore();

      // Draw Floating Percentage Badges in quiet ink
      ctx.save();
      badges.forEach((b) => {
        b.y += b.speedY;
        b.x += b.speedX;
        if (b.y < -30) b.y = height + 20;

        const bx = b.x + mouseX * 1.2;
        const by = b.y + mouseY * 1.2;

        ctx.font = `bold ${b.size}px "JetBrains Mono", monospace`;
        ctx.fillStyle = b.isPositive
          ? `rgba(21, 128, 61, ${b.opacity * 0.7})`
          : `rgba(185, 28, 28, ${b.opacity * 0.7})`;
        ctx.shadowBlur = 0;
        ctx.fillText(b.text, bx, by);
      });
      ctx.restore();

      // Scrim on Left Side to guarantee ink text legibility on light paper
      const leftScrim = ctx.createLinearGradient(0, 0, width, 0);
      leftScrim.addColorStop(0, 'rgba(247, 244, 236, 0.92)');
      leftScrim.addColorStop(0.45, 'rgba(247, 244, 236, 0.82)');
      leftScrim.addColorStop(0.75, 'rgba(247, 244, 236, 0.45)');
      leftScrim.addColorStop(1, 'rgba(247, 244, 236, 0.1)');
      ctx.fillStyle = leftScrim;
      ctx.fillRect(0, 0, width, height);

      // Top & Bottom subtle paper vignettes
      const vGrad = ctx.createLinearGradient(0, 0, 0, height);
      vGrad.addColorStop(0, 'rgba(247, 244, 236, 0.5)');
      vGrad.addColorStop(0.12, 'rgba(247, 244, 236, 0)');
      vGrad.addColorStop(0.88, 'rgba(247, 244, 236, 0)');
      vGrad.addColorStop(1, 'rgba(247, 244, 236, 0.6)');
      ctx.fillStyle = vGrad;
      ctx.fillRect(0, 0, width, height);

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
      aria-hidden="true"
    />
  );
};
