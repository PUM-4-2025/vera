import React, { useRef, useEffect } from 'react';

interface VideoTimeSliderProps {
  currentTime: number;
  videoDuration: number;
  zoomLevel: number; // Zoom level for the waveform (1 = normal, >1 = zoomed in)
  onTimeChange: (time: number) => void; // Callback to update video time when slider changes
  onZoomChange: (delta: number) => void; // Callback to adjust zoom level
}

export const VideoTimeSlider: React.FC<VideoTimeSliderProps> = ({
  currentTime,
  videoDuration,
  zoomLevel,
  onTimeChange,
  onZoomChange,
}) => {
  const timeSliderRef = useRef<HTMLInputElement>(null); // Reference to the range input
  const zoomIndicatorRef = useRef<HTMLDivElement>(null); // Reference to the zoom indicator overlay

  // Handle slider movement to update the video's current time
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    onTimeChange(time);
  };

  // Handle mouse wheel to zoom in/out of the waveform
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    onZoomChange(delta);
  };

  // Update the zoom indicator's position and width
  useEffect(() => {
    const zoomIndicator = zoomIndicatorRef.current;
    const slider = timeSliderRef.current;
    if (!zoomIndicator || !slider) return;

    const width = slider.clientWidth; // Slider's visible width in pixels
    const totalWaveformWidth = width * zoomLevel; // Total width when zoomed
    const timePerPixel = videoDuration / totalWaveformWidth;
    const currentPixel = currentTime / timePerPixel; // Current time in pixel units
    let scrollOffset = 0;

    // Calculate scroll offset to center the current time when zoomed in
    if (totalWaveformWidth > width) {
      scrollOffset = currentPixel - width / 2;
      scrollOffset = Math.max(
        0,
        Math.min(scrollOffset, totalWaveformWidth - width)
      );
    }

    const visibleWidth = width / zoomLevel; // Visible portion of the waveform
    const leftEdge = (scrollOffset / totalWaveformWidth) * 100; // Left edge as percentage
    const visibleWidthPercent = (visibleWidth / width) * 100;

    // Position the zoom indicator to show the visible portion of the waveform
    zoomIndicator.style.left = `${leftEdge}%`;
    zoomIndicator.style.width = `${visibleWidthPercent}%`;
  }, [zoomLevel, currentTime, videoDuration]);

  return (
    <div style={{ position: 'relative' }}>
      {/* Slider for controlling video playback time */}
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
      {/* Zoom indicator showing the visible portion of the waveform */}
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
  );
};
