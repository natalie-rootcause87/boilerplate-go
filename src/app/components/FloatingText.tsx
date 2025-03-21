import React from 'react';

const FloatingText = ({ text, color }: { text: string; color: string }) => {
  return (
    <div className={`absolute text-xl font-bold ${color} animate-bounce shadow-lg`}>
      {text}
    </div>
  );
};

export default FloatingText;
