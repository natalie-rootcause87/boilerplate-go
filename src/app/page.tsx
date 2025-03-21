'use client';

import React from 'react';
import Game from './components/Game';

export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] min-h-screen max-h-screen overflow-hidden sm:p-2 pb-20 font-[family-name:var(--font-geist-sans)] bg-gradient-to-r from-blue-500 to-purple-600 text-white">
      <main className="w-full max-h-full overflow-hidden flex flex-col gap-8 row-start-2 items-center sm:items-start bg-white bg-opacity-10 p-10 rounded-lg shadow-lg mx-auto">
        <Game />
      </main>
    </div>
  );
}
