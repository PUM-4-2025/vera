import React, { useRef, useEffect } from 'react';

interface TimeWaveControlsProps {
  currentTime: number;
  videoDuration: number;
  zoomLevel: number;
  onTimeChange: (time: number) => void;
  onZoomChange: (delta: number) => void;
}

export const TimeWaveControls: React.FC<TimeWaveControlsProps> = ({
  currentTime,
  videoDuration,
  zoomLevel,
  onTimeChange,
  onZoomChange,
}) => {
  const timeSliderRef = useRef<HTMLInputElement>(null);
  const zoomIndicatorRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const waveformContainerRef = useRef<HTMLDivElement>(null);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    onTimeChange(time);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    onZoomChange(delta);
  };

  const handleWaveformClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (zoomLevel !== 1) return;

    const canvas = canvasRef.current;
    const container = waveformContainerRef.current;
    if (!canvas || !container || !videoDuration) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = container.clientWidth;

    const timePerPixel = videoDuration / width;
    const clickedTime = clickX * timePerPixel;
    const newTime = Math.max(0, Math.min(clickedTime, videoDuration));

    onTimeChange(newTime);
  };

  useEffect(() => {
    const zoomIndicator = zoomIndicatorRef.current;
    const slider = timeSliderRef.current;
    const canvas = canvasRef.current;
    const container = waveformContainerRef.current;
    if (!zoomIndicator || !slider || !canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = container.clientWidth;
    const height = canvas.height;
    const numBars = 100;
    const totalWaveformWidth = width * zoomLevel;

    // Update zoom indicator
    const timePerPixel = videoDuration / totalWaveformWidth;
    const currentPixel = currentTime / timePerPixel;
    let scrollOffset = 0;
    if (totalWaveformWidth > width) {
      scrollOffset = currentPixel - width / 2;
      scrollOffset = Math.max(0, Math.min(scrollOffset, totalWaveformWidth - width));
    }

    const visibleWidth = width / zoomLevel;
    const leftEdge = (scrollOffset / totalWaveformWidth) * 100;
    const visibleWidthPercent = (visibleWidth / width) * 100;

    zoomIndicator.style.left = `${leftEdge}%`;
    zoomIndicator.style.width = `${visibleWidthPercent}%`;

    // Draw waveform
    canvas.width = width;
    ctx.clearRect(0, 0, width, height);

    const barWidth = totalWaveformWidth / numBars;
    const startBar = Math.floor(scrollOffset / barWidth);
    const visibleBars = Math.ceil(width / barWidth);

    for (let i = startBar; i < startBar + visibleBars && i < numBars; i++) {
      const barHeight = Math.sin(i / numBars * Math.PI * 2) * height * 0.5 + height * 0.5;
      const x = i * barWidth - scrollOffset;
      ctx.fillStyle = 'blue';
      ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight);
    }

    const lineX = currentPixel - scrollOffset;
    if (lineX >= 0 && lineX <= width) {
      ctx.strokeStyle = 'red';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(lineX, 0);
      ctx.lineTo(lineX, height);
      ctx.stroke();
    }

    container.scrollLeft = scrollOffset;
  }, [zoomLevel, currentTime, videoDuration]);

  return (
    <div style={{ width: '100%' }}>
      <div style={{ position: 'relative' }}>
        <input
          type="range"
          ref={timeSliderRef}
          min={0}
          max={videoDuration || 0}
          value={currentTime}
          onChange={handleSliderChange}
          onWheel={handleWheel}
          style={{
            width: '100%',
            height: '8px',
            background: '#ccc',
            outline: 'none',
            cursor: 'pointer',
            position: 'relative',
            zIndex: 1,
          }}
        />
        <div
          ref={zoomIndicatorRef}
          style={{
            position: 'absolute',
            top: 0,
            height: '8px',
            background: 'rgba(0, 128, 255, 0.3)',
            borderLeft: '1px solid blue',
            borderRight: '1px solid blue',
            transition: 'all 0.1s ease',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
      </div>
      <div
        ref={waveformContainerRef}
        style={{
          width: '100%',
          overflowX: 'auto',
        }}
      >
        <canvas
          ref={canvasRef}
          height={50}
          onWheel={handleWheel}
          onClick={handleWaveformClick}
          style={{ width: '100%', display: 'block' }}
        />
      </div>
    </div>
  );
};