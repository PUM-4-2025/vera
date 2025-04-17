import React, { useRef, useEffect } from 'react';

interface SoundWaveformProps {
  currentTime: number;
  videoDuration: number;
  zoomLevel: number; // Zoom level for the waveform (1 = normal, >1 = zoomed in)
  onTimeChange: (time: number) => void; // Callback to update video time when clicking waveform
  onZoomChange: (delta: number) => void; // Callback to adjust zoom level
}

export const SoundWaveform: React.FC<SoundWaveformProps> = ({
  currentTime,
  videoDuration,
  zoomLevel,
  onTimeChange,
  onZoomChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null); // Reference to the waveform canvas
  const waveformContainerRef = useRef<HTMLDivElement>(null); // Reference to the scrollable container

  // Handle mouse wheel to zoom in/out of the waveform
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    onZoomChange(delta);
  };

  // Handle clicking the waveform to jump to a specific time (only at zoom level 1)
  const handleWaveformClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (zoomLevel !== 1) return;

    const canvas = canvasRef.current;
    const container = waveformContainerRef.current;
    if (!canvas || !container || !videoDuration) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const timePerPixel = videoDuration / width;
    const clickedTime = clickX * timePerPixel; // Time corresponding to click position
    const newTime = Math.max(0, Math.min(clickedTime, videoDuration));
    
    onTimeChange(newTime); // Update video time
  };

  // Draw the waveform and red line
  const drawWaveform = () => {
    const canvas = canvasRef.current;
    const container = waveformContainerRef.current;
    if (!canvas || !container || !videoDuration) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calculate effective width to match slider’s clickable range
    const containerWidth = container.clientWidth;
    const thumbWidthEstimate = 12; // Match VideoTimeSlider thumb size
    const effectiveWidth = containerWidth - thumbWidthEstimate;

    // Set canvas size
    canvas.style.width = `${effectiveWidth}px`;
    canvas.width = effectiveWidth;

    const height = canvas.height || 50;
    canvas.height = height;

    // Clear the canvas
    ctx.clearRect(0, 0, effectiveWidth, height);

    // Draw waveform bars
    const numBars = 100; // Number of bars = number of samples
    const totalWaveformWidth = effectiveWidth * zoomLevel;
    const timePerPixel = videoDuration / totalWaveformWidth;
    const currentPixel = currentTime / timePerPixel;
    let scrollOffset = 0;

    // Calculate scroll offset to center the current time when zoomed in
    if (totalWaveformWidth > effectiveWidth) {
      scrollOffset = currentPixel - effectiveWidth / 2;
      scrollOffset = Math.max(0, Math.min(scrollOffset, totalWaveformWidth - effectiveWidth));
    }

    const barWidth = totalWaveformWidth / numBars;
    const startBar = Math.floor(scrollOffset / barWidth);
    const visibleBars = Math.ceil(effectiveWidth / barWidth);
    
    // Draw waveform data using samples
    for (let i = startBar; i < startBar + visibleBars && i < numBars; i++) {
      const barHeight = 
      Math.sin((i / numBars) * Math.PI * 2) * height * 0.5 + height * 0.5;
      const x = i * barWidth - scrollOffset;
      ctx.fillStyle = 'yellow';
      ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight);
    }

    // Draw red line indicating current video time
    const redLineX = currentPixel - scrollOffset;
    if (redLineX >= 0 && redLineX <= effectiveWidth) {
      ctx.strokeStyle = 'red';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(redLineX, 0);
      ctx.lineTo(redLineX, height);
      ctx.stroke();
    }

    // Update container scroll position
    container.scrollLeft = scrollOffset;
  };

  // Redraw when props change
  useEffect(() => {
    drawWaveform();
  }, [currentTime, videoDuration, zoomLevel]);

  // Redraw when window resizes
  useEffect(() => {
    const handleResize = () => {
      drawWaveform();
    };

    window.addEventListener('resize', handleResize);
    drawWaveform(); // Initial draw on mount
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []); // Empty dependency array: runs once on mount

  return (
    <div
      ref={waveformContainerRef}
      style={{
        width: '100%',
        overflowX: 'auto',
      }}
    >
      {/* Canvas displaying the waveform */}
      <canvas
        ref={canvasRef}
        height={50} // Fixed height for the waveform
        onWheel={handleWheel}
        onClick={handleWaveformClick}
        style={{
          display: 'block',
          margin: '0 auto',
        }}
      />
    </div>
  );
};