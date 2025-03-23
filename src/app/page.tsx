'use client';

import React from 'react';
import Game from './components/Game';

export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] min-h-screen max-h-screen overflow-hidden sm:p-2 py-0 font-[family-name:var(--font-geist-sans)] bg-gradient-to-r from-pink-300 via-pink-400 to-yellow-300 text-white">
      <main className="w-full max-h-full overflow-hidden flex flex-col gap-8 row-start-2 items-center sm:items-start bg-white/20 px-1 rounded-lg shadow-lg mx-auto">
        <Game />
      </main>
    </div>
  );
}