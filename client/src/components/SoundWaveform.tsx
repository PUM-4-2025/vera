import React, { useRef, useEffect } from 'react';

const samples = [
  -74.7, -50.0, -22.4, -15.3, -7.0, 0.0, -7.0, -15.3, -22.4, -50.0, -74.7,
]; //insert samples here

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
  const scrollOffsetRef = useRef<number>(0); // Scroll offset for click handler

  // Handle mouse wheel to zoom in/out of the waveform
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    onZoomChange(delta);
  };

  // Handle clicking the waveform to jump to a specific time (at any zoom level)
  const handleWaveformClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const container = waveformContainerRef.current;
    if (!canvas || !container || !videoDuration) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    // Time jumping when zoomed in
    const totalWaveformWidth = width * zoomLevel;
    const scrollOffset = scrollOffsetRef.current;
    const waveformPosition = scrollOffset + clickX;
    const fraction = waveformPosition / totalWaveformWidth;
    const clickedTime = fraction * videoDuration;
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

    // Waveform parameters
    const numBars = samples.length; // number of samples
    const totalWaveformWidth = effectiveWidth * zoomLevel;
    const timePerPixel = videoDuration / totalWaveformWidth;
    const currentPixel = currentTime / timePerPixel;
    let scrollOffset = 0;

    // Calculate scroll offset to center the current time when zoomed in
    if (totalWaveformWidth > effectiveWidth) {
      scrollOffset = currentPixel - effectiveWidth / 2;
      scrollOffset = Math.max(
        0,
        Math.min(scrollOffset, totalWaveformWidth - effectiveWidth)
      );
    }
    scrollOffsetRef.current = scrollOffset; // Store scroll offset

    const barWidth = totalWaveformWidth / numBars;
    const startBar = Math.floor(scrollOffset / barWidth);
    const visibleBars = Math.ceil(effectiveWidth / barWidth);

    // Draw waveform bars
    for (let i = startBar; i < startBar + visibleBars && i < numBars; i++) {
      const sample_min = 5977; // sampleFactor is 1 around 1 min
      const sample_max = 404212; // sampleFactor is 100 around 1 hour
      let sampleFactor = Math.round(
        1 +
          99 *
            (Math.log(
              ((Number(numBars) - sample_min) / (sample_max - sample_min)) * 9 +
                1
            ) /
              Math.log(10))
      );
      if (sampleFactor < 1) {
        sampleFactor = 1;
      }
      if (i % sampleFactor == 0) {
        // If video is near 1h we only draw mod 100 of the amount of bars
        let data = samples[i]; // Read the sample

        // Normalize sound data amplitude to fit in grapth (dB)
        const minVal = -80;
        const maxVal = 0; // Assume 0 dB as max for audio waveforms
        if (data == undefined || data == null) {
          data = minVal;
        }
        const barHeight = ((data - minVal) / (maxVal - minVal)) * height; // Normalize
        //const barHeight = Math.sin((i / numBars) * Math.PI * 2) * height * 0.5 + height * 0.5; //old sinewave test

        //Draw the bar
        const x = i * barWidth - scrollOffset;
        ctx.fillStyle = 'yellow';
        ctx.fillRect(
          x,
          height - barHeight,
          Math.max(1, barWidth - 1),
          barHeight
        );
      }
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
