import React from 'react';
import { useRef, useState } from 'react';



function CircleButton () {

    const [draw, setDraw] = useState(false);

    function DrawCircle () {
        console.log('CircleButton clicked')
    }

    return(
        <button onClick={()=>setDraw(!draw)}></button>
    );
}

export default CircleButton;