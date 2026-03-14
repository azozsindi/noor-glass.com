/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef } from 'react';

interface SignaturePadProps {
  onClear?: () => void;
}

export function SignaturePad({ onClear }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };

    resize();
    window.addEventListener('resize', resize);

    const startDraw = (e: MouseEvent | TouchEvent) => {
      drawingRef.current = true;
      ctx.beginPath();
      const pos = getPos(e);
      ctx.moveTo(pos.x, pos.y);
    };

    const endDraw = () => {
      drawingRef.current = false;
    };

    const draw = (e: MouseEvent | TouchEvent) => {
      if (!drawingRef.current) return;
      if (e instanceof TouchEvent) e.preventDefault();
      const pos = getPos(e);
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#000';
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    };

    const getPos = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      return {
        x: clientX - rect.left,
        y: clientY - rect.top
      };
    };

    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mouseup', endDraw);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('touchstart', startDraw);
    canvas.addEventListener('touchend', endDraw);
    canvas.addEventListener('touchmove', draw);

    return () => {
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousedown', startDraw);
      canvas.removeEventListener('mouseup', endDraw);
      canvas.removeEventListener('mousemove', draw);
      canvas.removeEventListener('touchstart', startDraw);
      canvas.removeEventListener('touchend', endDraw);
      canvas.removeEventListener('touchmove', draw);
    };
  }, []);

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
      onClear?.();
    }
  };

  return (
    <div className="bg-white border-2 border-dashed border-blue-800 rounded-xl p-2 mb-4">
      <canvas
        ref={canvasRef}
        className="w-full h-32 bg-white touch-none cursor-crosshair"
      />
      <div className="flex justify-between items-center mt-2">
        <button
          onClick={handleClear}
          className="px-4 py-1 bg-slate-200 text-slate-700 rounded-lg text-sm font-medium"
        >
          مسح
        </button>
        <span className="text-xs text-slate-500">وقع هنا</span>
      </div>
    </div>
  );
}
