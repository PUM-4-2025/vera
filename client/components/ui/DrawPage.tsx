import React from 'react';
import { useRef, useState } from 'react';
import cv, { bool, imread } from "@techstark/opencv-js";
import video from '../VID_20200422_124032.mp4';


function DrawPage( {drawCircle, drawArrow, undoObject} ) {

    const editCanvasRef = useRef<HTMLCanvasElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    let drawing: boolean = false;
    let startPoint = useRef<cv.Point>(null);
    let nextId = 0;

    //const [canvases, setCanvas] = useState([canvasRef]);
    const [canvases, setCanvas] = useState([cv.Mat]);

    function HandleMouseMove(event: React.MouseEvent){

      const canvas = editCanvasRef.current;
      const saveCanvas = canvasRef.current;

      if(!canvas || !saveCanvas) return;

      const context = canvas.getContext('2d');
      if(!context) return;

      if(drawing){
        context.clearRect( 0, 0, canvas.width, canvas.height);
      }
      

      const cnv = cv.imread(canvas);

      const newPoint = new cv.Point(GetMousePosition(canvas, event).x,GetMousePosition(canvas, event).y);

      if(drawing == true && drawCircle){

        // Get new radius
        
        const deltaX = (startPoint.x - GetMousePosition(canvas, event).x)**2;
        const deltaY = (startPoint.y - GetMousePosition(canvas, event).y)**2;
        const radius = Math.sqrt(deltaX) + Math.sqrt(deltaY);

        //console.log('pos X:', event.clientX , 'pos Y:', event.clientY, 'drawing: ', drawing, 'rad: ', radius);

        cv.circle(cnv, startPoint, radius, [255, 0, 0, 255], 1);

      }

      if (drawing == true && drawArrow){
        //cv.arrowedLine(cnv, newPoint, startPoint, [255, 0, 0, 255], 1, 8, 0, 0.1);
        cv.line(cnv, newPoint, startPoint, [255, 0, 0, 255], 1, 8, 0)
      }

      cv.imshow(canvas, cnv);

      cnv.delete();

    }


    function HandleMouseDown(event: React.MouseEvent){
      //console.log('LMB pressed!')

      if(drawCircle || drawArrow){
        drawing = true;
      }
      
      const canvas = editCanvasRef.current;
      if(!canvas) return;

      const cnv = cv.imread(canvas);
      startPoint = new cv.Point(GetMousePosition(canvas, event).x,GetMousePosition(canvas, event).y);

      if (drawCircle) {

        // Set new starting point for drawing the circle
        cv.circle(cnv, startPoint, 10, [255, 0, 0, 255], 1);
      }

      if (drawArrow) {

        //cv.arrowedLine(cnv, startPoint, 10, [255, 0, 0, 255], 2);
        cv.circle(cnv, startPoint, 1, [255, 0, 0, 255], 1);
      }

      cv.imshow(canvas, cnv);
      cnv.delete();
    }


    function HandleMouseUp(event){

      const canvas = editCanvasRef.current;
      const saveCanvas = canvasRef.current;


      if(drawing == true){
        drawing = false;

        const cnv1 = cv.imread(saveCanvas);
        const cnv2 = cv.imread(canvas);

        const context2 = canvas.getContext('2d');
        context2.clearRect( 0, 0, canvas?.width, canvas?.height);

        cv.add(cnv1, cnv2, cnv1);

        //matList.push(cnv1);
        //console.log(matList.length, 'last: ', matList[0]);

        //cv.imshow(saveCanvas, cnv1);

        //canvasList = [...canvasList, saveCanvas];

        //setCanvas([...canvases, saveCanvas])
        const copy = cnv1.clone();

        cv.imshow(saveCanvas, copy);

        console.log(copy, ' clone');

        setCanvas([...canvases, copy]);

        //console.log(canvases[-1], ' last elem')
        console.log(canvases.slice(-1)[0], ' last elem')


        cnv1.delete();
        cnv2.delete();

        //console.log(canvasList.length, canvasList[1]);
        console.log(canvases.length);
      }


      if(undoObject) {
        //undoObject = false;

        // clear clear clear 
        const context1 = saveCanvas.getContext('2d');
        const context2 = canvas.getContext('2d');

        context1.clearRect( 0, 0, saveCanvas.width, saveCanvas.height);
        context2.clearRect( 0, 0, canvas?.width, canvas?.height);

        //console.log(cv.imread(canvases.pop()))
        //console.log(cv.imread(canvases[0]))

        //const cp = cv.imread(canvases[1]);

        cv.imshow(saveCanvas, canvases.slice(-1)[0]);

        const newCanvases = canvases.slice(0, -1);
        //canvases.pop();
        //setCanvas[newCanvases];
        setCanvas(newCanvases);

        console.log(canvases.length);

        //cv.imshow(saveCanvas, )

        //canvases.pop();

        //const cnv = cv.imread(canvases.slice(-1)[0])

        //setCanvas(canvases);



        //matList.pop();
        //console.log(matList.length, 'last: ', matList[0]);
        //const cnv = cv.imread(canvases[0]);

        // for(let i = 0; i < canvases.length; i++){
        //   const nextcnv = cv.imread(canvases[i]);
        //   //cv.imshow(saveCanvas, nextcnv);
        //   cv.add(cnv, nextcnv, cnv);
        //   cv.imshow(saveCanvas, cnv)
        // }


        //const cnv = cv.imread(canvases.slice(-1)[0])

        //cv.imshow(saveCanvas, cnv);

        //console.log(canvases.length);

      }

    }

    function HandleWheel(event){
      console.log('hjulet snurrar')
    }


    function GetMousePosition(canvasRef, event) {

      const rect = canvasRef.getBoundingClientRect()

      return{
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      };
    }

    function PauseVideo(){
      const vr = videoRef.current;
      if (!vr) return;
      vr.play();
    }

    return (
      <div
        onMouseMove={HandleMouseMove}
        onMouseDown={HandleMouseDown}
        onMouseUp={HandleMouseUp}
        onWheel={HandleWheel}   
        >
            <canvas
              ref={canvasRef}
              width={640}
              height={480}
              style={{position: 'absolute', top:100, left:100, border: '1px solid orange'}}
            />
            <canvas
              ref={editCanvasRef}
              width={640}
              height={480}
              style={{position: 'absolute', top:100, left: 740, border: '1px solid blue'}}
            />
            <video //onKeyDown={PauseVideo()}
              
              ref={videoRef}
              src={video}
              width={640}
              style={{
                position: 'absolute', 
                top: 100,
                left: 100,
                zIndex: -1,
              }}
            />      
      </div>
    );
  }
  
  export default DrawPage;