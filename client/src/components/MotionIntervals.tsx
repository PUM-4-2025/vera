import React, { useRef, useEffect } from 'react';

const samples = [1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1]; //insert samples here

interface MotionIntervalsProps {
  filename: string;
  currentTime: number;
  videoDuration: number;
  zoomLevel: number; // Zoom level for the intervals (1 = normal, >1 = zoomed in)
  onTimeChange: (time: number) => void; // Callback to update video time when clicking intervals
  onZoomChange: (delta: number) => void; // Callback to adjust zoom level
}

export const MotionIntervals: React.FC<MotionIntervalsProps> = ({
  filename, // Input for backend analysis
  currentTime,
  videoDuration,
  zoomLevel,
  onTimeChange,
  onZoomChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null); // Reference to the intervals canvas
  const intervalsContainerRef = useRef<HTMLDivElement>(null); // Reference to the scrollable container
  const scrollOffsetRef = useRef<number>(0); // Scroll offset for click handler

  // Handle mouse wheel to zoom in/out of the intervals
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    onZoomChange(delta);
  };

  // Handle clicking the intervals to jump to a specific time (at any zoom level)
  const handleIntervalsClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const container = intervalsContainerRef.current;
    if (!canvas || !container || !videoDuration) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    // Time jumping when zoomed in
    const totalIntervalsWidth = width * zoomLevel;
    const scrollOffset = scrollOffsetRef.current;
    const intervalsPosition = scrollOffset + clickX;
    const fraction = intervalsPosition / totalIntervalsWidth;
    const clickedTime = fraction * videoDuration;
    const newTime = Math.max(0, Math.min(clickedTime, videoDuration));

    onTimeChange(newTime); // Update video time
  };

  // Draw the intervals and line
  const drawIntervals = () => {
    const canvas = canvasRef.current;
    const container = intervalsContainerRef.current;
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

    // Intervals parameters
    const numBars = samples.length; // number of samples
    const totalIntervalsWidth = effectiveWidth * zoomLevel;
    const timePerPixel = videoDuration / totalIntervalsWidth;
    const currentPixel = currentTime / timePerPixel;
    let scrollOffset = 0;

    // Calculate scroll offset to center the current time when zoomed in
    if (totalIntervalsWidth > effectiveWidth) {
      scrollOffset = currentPixel - effectiveWidth / 2;
      scrollOffset = Math.max(
        0,
        Math.min(scrollOffset, totalIntervalsWidth - effectiveWidth)
      );
    }
    scrollOffsetRef.current = scrollOffset; // Store scroll offset

    const barWidth = totalIntervalsWidth / numBars;
    const startBar = Math.floor(scrollOffset / barWidth);
    const visibleBars = Math.ceil(effectiveWidth / barWidth);

    // Draw intervals bars
    for (let i = startBar; i < startBar + visibleBars && i < numBars; i++) {
      let data = samples[i]; // Read the sample
      if (data == undefined || data == null) {
        data = 0;
      }

      let barHeight = 0;
      if (data > 0) {
        barHeight = height;
      }

      //Draw the bar
      const x = i * barWidth - scrollOffset;
      ctx.fillStyle = 'red';
      ctx.fillRect(x, height - barHeight, Math.max(1, barWidth), barHeight);
    }

    // Draw line indicating current video time
    const lineX = currentPixel - scrollOffset;
    if (lineX >= 0 && lineX <= effectiveWidth) {
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(lineX, 0);
      ctx.lineTo(lineX, height);
      ctx.stroke();
    }

    // Update container scroll position
    container.scrollLeft = scrollOffset;
  };

  // Redraw when props change
  useEffect(() => {
    drawIntervals();
  }, [currentTime, videoDuration, zoomLevel]);

  // Redraw when window resizes
  useEffect(() => {
    const handleResize = () => {
      drawIntervals();
    };

    window.addEventListener('resize', handleResize);
    drawIntervals(); // Initial draw on mount
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []); // Empty dependency array: runs once on mount

  return (
    <div
      ref={intervalsContainerRef}
      style={{
        width: '100%',
        overflowX: 'auto',
      }}
    >
      {/* Canvas displaying the intervals */}
      <canvas
        ref={canvasRef}
        height={50} // Fixed height for the intervals
        onWheel={handleWheel}
        onClick={handleIntervalsClick}
        style={{
          display: 'block',
          margin: '0 auto',
        }}
      />
    </div>
  );
};
