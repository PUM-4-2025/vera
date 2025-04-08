import React, { useRef, useState } from 'react';

interface DrawingCanvasProps {
    drawCircle: boolean;
    drawArrow: boolean;
}

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
    drawCircle = false,
    drawArrow = false
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [startPosition, setStartPosition] = useState(false);
}

