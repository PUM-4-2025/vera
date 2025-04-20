import React from 'react';
import { useRef, useState, useEffect, useCallback, useMemo } from 'react';

import konva from 'konva';
import { Stage, Layer, Label, Tag, Text, Rect, Circle, Arrow, Group, KonvaNodeEvents, Transformer } from 'react-konva';
import video from './VID_20200422_124032.mp4';

import { v4 as uuid } from "uuid";


export default function DrawComponent() {

    const containerRef = useRef<HTMLDivElement>(null);
    const stageRef = useRef<konva.Stage>(null); 
    const transformerRef = useRef<konva.Transformer>(null);

    const [tool, setTool] = useState('select');
    const isDrawing = useRef(false);
    const isDraggable = (tool === 'select');
    const currentShapeId = useRef('');
    const STROKE_COLOR = 'red';
    const DEFAULT_TXT = 'Click to change text!';
    const DEFAULT_FONTSIZE = 16;

    const [arrows, setArrows] = useState([]);
    const [circles, setCircles] = useState([]);
    const [rectangles, setRectangles] = useState([]);
    

    function handlePointerDown () {
        if(tool === 'select') return;

        const stage = stageRef.current;
        const x = stage?.getPointerPosition()?.x;
        const y = stage?.getPointerPosition()?.y;
        const id = uuid();

        currentShapeId.current = id;
        isDrawing.current = true;

        console.log("ptr down ID: ", currentShapeId.current);

        switch(tool){
            case 'arrow':
                setArrows( (arrows) => [...arrows, {
                    id: id,
                    points: [x+25, y-25, x, y],
                    stroke: STROKE_COLOR,
                    strokeWidth: 2,
                }])
                break;

            case 'circle':
                setCircles( (circles) => [...circles, {
                    id: id,
                    x: x,
                    y: y,
                    radius: 30,
                    stroke: STROKE_COLOR,
                    strokeWidth: 2,
                }])
                break;

            case 'text':
                setRectangles( (rectangles) => [...rectangles, {
                    id: id,
                    x: x,
                    y: y,
                    height: 25,
                    width: 25,
                    stroke: STROKE_COLOR,
                    strokeWidth: 2,
                    text: DEFAULT_TXT,
                }])
                break;
        }
    }


    function handlePointerMove () {
        if(tool === 'select' || !isDrawing.current) return;

        const stage = stageRef.current;
        const x = stage?.getPointerPosition()?.x;
        const y = stage?.getPointerPosition()?.y;

        switch(tool){
            case 'arrow':
                setArrows( (arrows) => arrows.map( (arrow) => {
                    if(arrow.id === currentShapeId.current){
                        return{...arrow,
                            points: [x, y, arrow.points[2], arrow.points[3]]
                        }
                    }
                    return arrow;
                }))
            
                break;
            case 'circle':
                setCircles( (circles) => circles.map( (circle) => {
                    if(circle.id === currentShapeId.current){
                        return{
                            ...circle, 
                            radius: Math.sqrt((x - circle.x)**2 + (y - circle.y)**2)
                        }
                    }
                    return circle;
                }))

                break;
            case 'text':
                setRectangles( (rectangles) => rectangles.map((rectangle) => {
                    if(rectangle.id === currentShapeId.current){
                        return{
                            ...rectangle, 
                            width: x - rectangle.x,
                            height: y - rectangle.y,
                        };
                    }
                    return rectangle;
                }));
                break;
        }

    }


    function handlePointerUp () {
        isDrawing.current = false;
    }

    
    function handleClick (event) {
        if(tool !== 'select' || !transformerRef.current) return;
        const targetShape = event.currentTarget;
        currentShapeId.current = targetShape.attrs.id;
        transformerRef.current.nodes([targetShape])

        //console.log(targetShape.attrs.id);

    }


    useEffect( () => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const code = event.key;

            switch (code) {
                case 'Delete':
                    console.log('DELETE');
                    setRectangles( (rectangles) => rectangles.filter( (rectangle) =>
                        rectangle.id !== currentShapeId.current)
                    );
                    setCircles( (circles) => circles.filter( (circle) => 
                        circle.id !== currentShapeId.current)
                    );
                    setArrows( (arrows) => arrows.filter( (arrow) => 
                        arrow.id !== currentShapeId.current)
                    );
                    transformerRef.current?.nodes([]);
            }
        }
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
          };

    }, [currentShapeId.current]);


    // useEffect(() => {
    //         const handleKeyDown = (event: KeyboardEvent) => {
    //           if (event.key === 'Delete' && selectedShapeId) {
    //             setShapes((prevShapes) =>
    //               prevShapes.filter((shape) => shape.id !== selectedShapeId)
    //             );
    //             setSelectedShapeId(null);
    //           } else if (event.key === 'z' && event.ctrlKey) {
    //             handleUndo();
    //           }
    //         };
        
    //         document.addEventListener('keydown', handleKeyDown);
    //         return () => {
    //           document.removeEventListener('keydown', handleKeyDown);
    //         };
    //     }, [selectedShapeId]);

    return(
        <div ref={containerRef} > 
            <select value={tool} onChange={(e) => {setTool(e.target.value);}}>
            <option value='select'>Select</option>
            <option value="arrow">Arrow</option>
            <option value="circle">Circle</option>
            <option value="text">Text</option>
            </select>

            {/* Canvas */}
            <Stage 
                ref={stageRef} 
                width={window.innerWidth} 
                height={window.innerHeight}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
            >
                
                <Layer>
                    <Rect
                    id={'background'}
                    width={window.innerWidth}
                    height={window.innerHeight}
                    onClick={ () => {transformerRef.current?.nodes([]); }}
                    />
                    {arrows.map( (arrow) => (
                        <Arrow
                        id={arrow.id}
                        draggable={isDraggable}
                        key={arrow.id}
                        points={arrow.points}
                        stroke={STROKE_COLOR}
                        fill={STROKE_COLOR}
                        strokeWidth={2}
                        onClick={handleClick}
                        />
                    ))}


                    {circles.map( (circle) => (
                        <Circle
                        id={circle.id}
                        draggable={isDraggable}
                        key={circle.id}
                        x={circle.x}
                        y={circle.y}
                        stroke={STROKE_COLOR}
                        strokeWidth={2}
                        radius={circle.radius}
                        onClick={handleClick}
                        />
                    ))}

                    {rectangles.map((rectangle) => (
                        <Group
                        id={rectangle.id}
                        key={rectangle.id}
                        draggable={isDraggable}
                        onClick={handleClick}
                        >
                            <Rect
                            key={rectangle.id +1}
                            x={rectangle.x}
                            y={rectangle.y}
                            stroke={STROKE_COLOR}
                            fill={'white'}
                            opacity={0.75}
                            strokeWidth={2}
                            width={rectangle.width}
                            height={rectangle.height}
                            />
                            <Text
                            key={rectangle.id +2}
                            x={rectangle.x}
                            y={rectangle.y}
                            stroke={STROKE_COLOR}
                            strokeWidth={0.5}
                            width={rectangle.width}
                            height={rectangle.height}
                            text={rectangle.text}
                            fontSize={DEFAULT_FONTSIZE}
                            />
                        </Group>
                    ))}

                    <Transformer ref={transformerRef} />

                </Layer>
            </Stage>
        </div>
    );
}