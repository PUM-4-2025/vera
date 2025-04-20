import React from 'react';
import { useRef, useState, useEffect, useCallback, useMemo } from 'react';

import konva from 'konva';
import { Stage, Layer, Label, Tag, Text, Rect, Circle, Arrow, Group, KonvaNodeEvents } from 'react-konva';
import video from './VID_20200422_124032.mp4';
import { KonvaEventObject, NodeConfig } from 'konva/lib/Node';


interface Shape {
  //id: string;
  type: 'arrow' | 'circle' | 'textbox';
  x: number;
  y: number;
  fill: string;
  stroke: string;
}


function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

const DrawComponent = () => {

  // HTML elements
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const stageRef = useRef<konva.Stage>(null); 

  // Drawing
  const [tool, setTool] = useState('select');
  //const [shapes, setShapes] = useState<konva.Shape[]>([]);
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [currentlyDrawnShape, setCurrentCurrentlyDrawnShape] = useState<konva.Shape>();
  const isDrawing = useRef(false);
  //const lastPos = useRef(null);
  const currentShapeRef = useRef(''); // ID of current drawing

  

  // Panning
  const [isPanning, setIsPanning] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  

  const startPan = useCallback((event: React.MouseEvent) => {
    if (event.button === 0 && event.altKey) {
      setIsPanning(true);
      event.preventDefault();
    }
  }, []);
  
  
  const pan = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isPanning) {
        setOffset({
          x: offset.x - e.movementX / scale,
          y: offset.y - e.movementY / scale,
        });
      }
    },
    [isPanning, offset, scale]
  );
  

  const stopPan = useCallback(() => {
    if (isPanning) {
        setIsPanning(false);
    }
  }, [isPanning]);


  const handleMouseDown = useCallback((e: KonvaEventObject<MouseEvent>) => {
    if(!stageRef.current) return;

    const color = 'red';

    if(tool === 'select') return;
    isDrawing.current = true;

    const stage = stageRef.current;
    const pos = stage.getPointerPosition();
    if(!pos) return;
    const x = pos.x - offset.x;
    const y = pos.y - offset.y;
    const id = generateId();
    currentShapeRef.current = id;

    switch(tool){
      case 'arrow':
      
      case 'circle':
        // const circle = new konva.Circle({
        //   key: id,
        //   name: 'circle',
        //   x: x,
        //   y: y,
        //   radius: 70,
        //   stroke: 'red',
        //   strokeWidth: 2,
        //   draggable: true
        // })

        // setShapes((prevShapes) => [
        //   ...prevShapes, circle
        // ]);


        break;
      case 'text':

    }




  }, [tool]);


  const handleMouseUp = () => {
    isDrawing.current = false;
  };


  const handleMouseMove = (e: konva.KonvaEventObject<MouseEvent>) => {
    if (!isDrawing.current) return;

  }


  return(
      <div>
        <select
          value={tool}
          onChange={(e) => {
            setTool(e.target.value);
          }}
        >
          <option value='select'>Select</option>
          <option value="arrow">Arrow</option>
          <option value="circle">Circle</option>
          <option value="text">Text</option>
        </select>
        <div
          ref={containerRef}
          style={{
              position: 'relative',
              width: '640px',
              height: '480px',
              border: '1px solid #333',
              margin: '0 auto',
              overflow: 'hidden',
              cursor: isPanning
              ? 'grabbing'
              : tool === 'select'
                  ? 'default'
                  : 'crosshair',
              boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
              borderRadius: '4px',
          }}
          onMouseDown={startPan}
          onMouseMove={pan}
          onMouseUp={stopPan}
          onMouseLeave={stopPan} 
        >
          <video
            ref={videoRef}
            src={video}
            style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                transformOrigin: 'center',
            }}
            playsInline
            muted
          />
          <Stage 
            ref={stageRef}
            width={640}
            height={480}
            style={{  
              borderWidth: 1,
              borderColor: 'red',
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp} 
          >
            <Layer>
              <Circle
                {...{x: 100, y: 100, radius: 100}}
                stroke={'red'}
                draggable
              />
              <Rect
                {...{x: 100, y: 100, height: 100, width: 100}}
                stroke={'red'}
                draggable
              />
              <Arrow
                {...{x: 100, y: 100, pointerLength: 10, points: [0,0,100,100]}}
                stroke='red'
                fill='red'
                draggable
              />
              {[...shapes, currentlyDrawnShape].map((shape) => {
                if(shape?.hasName('circle')){
                  return <Circle {...shape} {...shapes.at(shape.id)} />
                }
              })} 
            </Layer>
          </Stage>
        </div>
      </div>
  );

}

export default DrawComponent;