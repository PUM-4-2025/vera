import { useState, useRef } from 'react';
import './App.css';
import DrawPage from '../components/ui/DrawPage.tsx';

function App() {


  const [drawCircle, setDraw] = useState(false);
  const [drawArrow, setDrawArrow] = useState(false);
  const [undoObject, setUndoObject] = useState(false);

  return (
    <div>
      <button onClick={ () => setDraw(!drawCircle)} style={{position: 'absolute', top: 50, left:0}}> Circle </button>
      <button onClick={ () => setDrawArrow(!drawArrow)} style={{position: 'absolute', top: 100, left:0}}> Arrow </button>
      <button onClick={ () => setUndoObject(!undoObject)} style={{position: 'absolute', top: 150, left:0}}> &lt;----- </button>

      <DrawPage
        drawCircle={drawCircle}
        drawArrow={drawArrow}
        undoObject={undoObject}
      />
    </div>
  );
}

export default App;
