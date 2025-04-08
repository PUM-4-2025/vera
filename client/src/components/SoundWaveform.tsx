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
    const width = container.clientWidth;

    const timePerPixel = videoDuration / width;
    const clickedTime = clickX * timePerPixel; // Time corresponding to click position
    const newTime = Math.max(0, Math.min(clickedTime, videoDuration));

    onTimeChange(newTime); // Update video time
  };

  // Draw waveform and update scroll position (like autoscroll)
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = waveformContainerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = container.clientWidth; // Visible width of the container
    const height = canvas.height; // Fixed height of the waveform
    const numBars = 100; // Number of bars = number of samples
    const totalWaveformWidth = width * zoomLevel; // Total width when zoomed

    const timePerPixel = videoDuration / totalWaveformWidth;
    const currentPixel = currentTime / timePerPixel; // Current time in pixel units
    let scrollOffset = 0;

    // Auto-scroll to keep current time centered when zoomed in
    if (totalWaveformWidth > width) {
      scrollOffset = currentPixel - width / 2;
      scrollOffset = Math.max(
        0,
        Math.min(scrollOffset, totalWaveformWidth - width)
      );
    }

    canvas.width = width;
    ctx.clearRect(0, 0, width, height); // Clear grapth

    const barWidth = totalWaveformWidth / numBars;
    const startBar = Math.floor(scrollOffset / barWidth);
    const visibleBars = Math.ceil(width / barWidth); // Number of visible bars (zoomed)

    // Draw waveform data using samples
    for (let i = startBar; i < startBar + visibleBars && i < numBars; i++) {
      const barHeight =
        Math.sin((i / numBars) * Math.PI * 2) * height * 0.5 + height * 0.5;
      const x = i * barWidth - scrollOffset;
      ctx.fillStyle = 'yellow';
      ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight);
    }

    // Draw red line indicating current video time
    const lineX = currentPixel - scrollOffset;
    if (lineX >= 0 && lineX <= width) {
      ctx.strokeStyle = 'red';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(lineX, 0);
      ctx.lineTo(lineX, height);
      ctx.stroke();
    }

    // Apply scroll offset to the container for auto-scrolling
    container.scrollLeft = scrollOffset;
  }, [zoomLevel, currentTime, videoDuration]);

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
        style={{ width: '100%', display: 'block' }}
      />
    </div>
  );
};
