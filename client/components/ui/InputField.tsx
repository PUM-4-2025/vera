import React, { useState, useEffect, useRef } from 'react';

export default function InputField() {
  const [input, setInput] = useState('');

  const handleAddInput = (txt: string) => {
    setInput(txt);
  };

  return (
    <div className="cont">
      <textarea />
    </div>
  );
}
