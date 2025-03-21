import React, { useState, useEffect, useRef } from 'react';
import GameState, { PartialGameState, LogEntry } from '../utils/GameState';
import EventManager from '../utils/EventManager';
import Spell, { allSpells } from '../utils/Spell';
import ProgressBar from './ProgressBar';
import axios from 'axios';

export default function Game() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const actionInProgress = useRef(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [currentEntries, setCurrentEntries] = useState<LogEntry[]>([]);
  const [renderTrigger, setRenderTrigger] = useState(0);
  const [selectedSpell, setSelectedSpell] = useState<Spell | null>(null);
  const logRef = useRef<HTMLUListElement | null>(null);
  const [isTurnPaused, setIsTurnPaused] = useState(false);

  useEffect(() => {
    const newGameState = new GameState();
    if (newGameState.unlockedSpells.length > 0) {
      const randomSpellName = newGameState.unlockedSpells[Math.floor(Math.random() * newGameState.unlockedSpells.length)];
      newGameState.player.spells.push({ name: randomSpellName, level: 1 });
    }
    console.log('Initial GameState:', newGameState);
    setGameState(newGameState);

    // Set up polling to fetch game state updates
    // const intervalId = setInterval(async () => {
    //   try {
    //     const response = await axios.post('/api/activity');
    //     setGameState(response.data.gameState);
    //   } catch (error) {
    //     console.error('Error fetching game state:', error);
    //   }
    // }, 5000); // Poll every 5 seconds

    // // Clean up the interval on component unmount
    // return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [gameState?.gameLog]);

  const getUpdatedGameLog = (prev: GameState | null) => {
    if (!prev || prev.isGameOver) {
      console.log('Game is over, no action taken');
      actionInProgress.current = false;
      return prev?.gameLog;
    }
    console.log('Triggering log event for a new turn');
    const updatedState = EventManager.triggerEvent(prev) as GameState | PartialGameState;
    console.log('Updated GameState:', updatedState.gameLog.length, updatedState);
    if (updatedState instanceof GameState) {
      actionInProgress.current = false;
      return updatedState.gameLog;
    } else {
      const newState = GameState.fromPartial(updatedState);
      actionInProgress.current = false;
      return newState.gameLog;
    }
  };

  const pauseTurn = () => {
    console.log('Turn paused');
    setIsTurnPaused(true);
  };

  const unpauseTurn = () => {
    console.log('Turn unpaused');
    setIsTurnPaused(false);
  };

  const handleAction = () => {
    if (actionInProgress.current) return;
    actionInProgress.current = true;

    if (!gameState) {
      actionInProgress.current = false;
      return;
    }

    if (!gameStarted) {
      gameState.resetGame();
      setGameStarted(true);
    }

    const updatedGameLog = getUpdatedGameLog(gameState);
    const updatedGameState = gameState;

    if (updatedGameLog) updatedGameState.gameLog = updatedGameLog;

    console.log('Continue button clicked');
    setRenderTrigger(prev => prev + 1);

    const lastTurnEntries = updatedGameLog?.[updatedGameLog.length - 1];
    if (Array.isArray(lastTurnEntries) && lastTurnEntries.some(entry => entry.message.includes('A wild'))) {
      pauseTurn();
      setCurrentEntries([lastTurnEntries[0]]); // Set the first entry immediately

      // Show remaining entries with a 1-second delay
      let index = 1; // Start from the second entry
      const intervalId = setInterval(() => {
        if (index > 1) setCurrentEntries(prevEntries => [...prevEntries, lastTurnEntries[index - 1]]);

        if (index < lastTurnEntries.length) {
          lastTurnEntries[index].effect?.forEach(effect => {
            if (effect.target === 'player') {
              if (effect.type === 'XP') {
                const oldMaxHealth = updatedGameState.player.maxHealth;
                const oldMaxMana = updatedGameState.player.maxMana;
                const didLevelUp = updatedGameState.player.gainXP(effect.value);
                if (didLevelUp) {
                  updatedGameState.addLogEntry(`You leveled up to ${updatedGameState.player.level}!`, [{ type: 'MAXHP', value: updatedGameState.player.maxHealth - oldMaxHealth, target: 'none' }, { type: 'MAXMANA', value: updatedGameState.player.maxMana - oldMaxMana, target: 'none' }]);
                }
                console.log('updatedGameState.player.xp', updatedGameState.player.xp);
              } else if (effect.type === 'HP') {
                updatedGameState.player.health += effect.value;
                if (updatedGameState.player.health > updatedGameState.player.maxHealth) {
                  updatedGameState.player.health = updatedGameState.player.maxHealth;
                }
                console.log('updatedGameState.player.health', updatedGameState.player.health);
              } else if (effect.type === 'Mana') {
                updatedGameState.player.mana += effect.value;
                if (updatedGameState.player.mana > updatedGameState.player.maxMana) {
                  updatedGameState.player.mana = updatedGameState.player.maxMana;
                }
                console.log('updatedGameState.player.mana', updatedGameState.player.mana);
              }
            } else if (updatedGameState.monster && effect.target === 'monster') {
              updatedGameState.monster.health += effect.value;
              console.log('updatedGameState.monster.health', updatedGameState.monster.health);
            }
          })

          setGameState(updatedGameState);

          index++;
        } else {
          clearInterval(intervalId);
          unpauseTurn();
        }
      }, 1000);
    } else {
      setCurrentEntries([]);
      updatedGameState.monster = null;
      if (!updatedGameLog) return;

      const lastTurnLog = updatedGameLog[updatedGameLog.length - 1];
      console.log('lastTurnLog', lastTurnLog);

      lastTurnLog?.forEach(entry => {
        if (entry.effect) {
          console.log('effect', entry.effect);

          entry.effect.forEach(effect => {
            if (effect.type === 'XP') {
              const oldMaxHealth = updatedGameState.player.maxHealth;
              const oldMaxMana = updatedGameState.player.maxMana;
              const didLevelUp = updatedGameState.player.gainXP(effect.value);
              if (didLevelUp) {
                updatedGameState.addLogEntry(`You leveled up to ${updatedGameState.player.level}!`, [{ type: 'MAXHP', value: updatedGameState.player.maxHealth - oldMaxHealth, target: 'none' }, { type: 'MAXMANA', value: updatedGameState.player.maxMana - oldMaxMana, target: 'none' }]);
              }
              console.log('updatedGameState.player.xp', updatedGameState.player.xp);
            } else if (effect.type === 'HP') {
              updatedGameState.player.health += effect.value;
              if (updatedGameState.player.health > updatedGameState.player.maxHealth) {
                updatedGameState.player.health = updatedGameState.player.maxHealth;
              }
              console.log('updatedGameState.player.health', updatedGameState.player.health);
            }
          });
        }

        setGameState(updatedGameState);
      });
    }
  };

  const handleRestart = () => {
    console.log('Game restarted');
    const newGameState = new GameState();
    newGameState.resetGame();
    if (newGameState.unlockedSpells.length > 0) {
      const randomSpellName = newGameState.unlockedSpells[Math.floor(Math.random() * newGameState.unlockedSpells.length)];
      newGameState.player.spells.push({ name: randomSpellName, level: 1 });
    }
    setGameState(newGameState);
    setGameStarted(false);
  };

  const toggleModal = () => {
    setIsModalOpen(!isModalOpen);
  };

  const getAnimationClass = (entry: LogEntry) => {
    if (entry.message.includes('A wild')) return 'monster-encounter';
    if (entry.message.includes('You have practiced a spell')) return 'spell-selection';
    if (entry.message.includes('Nothing happens')) return 'nothing-happens';
    return '';
  };

  const handleEntryClick = (entries: LogEntry[]) => {
    setCurrentEntries(entries);
    setIsEntryModalOpen(true);
  };

  const handleSpellClick = (spellName: string) => {
    const spell = allSpells.find(s => s.name === spellName);
    setSelectedSpell(spell || null);
  };

  if (!gameState) {
    return <div>Loading...</div>;
  }

  return (
    <div className="w-full h-full bg-gradient-to-b from-green-700 to-green-900 flex flex-col items-center text-white">
      {/* Header / Title */}
      <header className="w-full py-6 text-center shadow-lg bg-green-800/70">
        <h1 className="text-3xl font-extrabold tracking-wide uppercase">
          Boilerplate Go
        </h1>
      </header>

      {/* Main Container */}
      <main className="flex-grow max-h-[calc(100%-84px)] w-full max-w-5xl flex flex-col items-center space-y-6 md:space-y-0">
        {/* Player & Game Info */}
        <section className="w-full max-h-full py-4 flex flex-col md:flex-row md:space-x-6 space-y-6 md:space-y-0">
          {/* Player Stats Card */}
          <div className="flex-1 bg-green-800/50 shadow-md rounded-lg p-6 relative">
            <h2 className="text-2xl font-bold mb-4 text-center">Player Stats</h2>
            <div className="flex flex-col items-center space-y-4">
              <div className="text-lg">
                <span className="font-semibold">Level:</span> {gameState.player.level}
              </div>
              <ProgressBar label="HP" value={gameState.player.health >= 0 ? gameState.player.health : 0} max={gameState.player.maxHealth} color="bg-red-500" />
              <ProgressBar label="XP" value={gameState.player.xp >= 0 ? gameState.player.xp : 0} max={gameState.player.xpForNextLevel} color="bg-yellow-400" />
              <ProgressBar label="Mana" value={gameState.player.mana >= 0 ? gameState.player.mana : 0} max={gameState.player.maxMana} color="bg-blue-400" />
              <div className="text-lg">
                <span className="font-semibold">Spells:</span>{" "}
                {gameState.player.spells.length > 0
                  ? gameState.player.spells.filter((spell, spellIndex) => gameState.player.spells.findIndex(s => s.name === spell.name) === spellIndex).map(spell => (
                    <button
                      key={spell.name}
                      onClick={() => handleSpellClick(spell.name)}
                      className="cursor-pointer underline mx-1"
                    >
                      {spell.name}
                    </button>
                  ))
                  : "None"}
              </div>
            </div>
            {currentEntries?.length > 0 && gameState.monster && (
              <div className="p-2 rounded-lg h-fullw-full">
              <h2 className="text-xl font-bold mb-4">Combat Encounter</h2>
              <ul className="text-black overflow-y-auto max-h-[180px] space-y-2">
                {currentEntries?.length && currentEntries[currentEntries.length - 1] && (
                    <li className={`text-sm bg-gray-200 p-3 rounded ${currentEntries[currentEntries.length - 1].message.includes("A wild") ? "shake" : ""} ${currentEntries[currentEntries.length - 1].message.includes("spell") ? "glow" : ""}`}>
                      {currentEntries[currentEntries.length - 1].message}
                      {currentEntries[currentEntries.length - 1].effect?.filter(effect => effect.target !== 'monster').map((effect, effectIndex) => <span key={`effectIndex3-${effectIndex}`} className={`text-xs ml-2 ${effect?.type.includes('HP') ? effect?.value >= 0 ? 'text-green-500' : 'text-red-500' : effect?.type.toLowerCase().includes('mana') ? 'text-blue-500' : 'text-yellow-500'}`}>{`${effect?.value >= 0 ? '+' : ''}${effect?.value} ${effect?.type}`}</span>)}
                    </li>
                  )}
              </ul>
              <ProgressBar label="Monster" value={gameState.monster.health > 0 ? gameState.monster.health : 0} max={gameState.monster.difficultyLevel * 45} color="bg-purple-400" />
            </div>
            )}
          </div>

          {/* Game Log Card */}
          <div className="relative flex-1 bg-green-800/50 shadow-md rounded-lg p-6 flex flex-col max-h-full">
            <h2 className="text-2xl font-bold mb-4 text-center">Game Log</h2>
            {gameState.gameLog.length > 3 && (
              <button
                onClick={toggleModal}
                className="mt-4 bg-transparent hover:bg-white/10 transition-colors text-white font-bold py-2 px-4 rounded"
              >
                View Full Log
              </button>
            )}
            <ul ref={logRef} className={`flex-grow overflow-y-auto space-y-2 px-4 py-2 ${gameState.isGameOver ? 'pb-[140px]' : ''}`}>
              {gameState?.gameLog.length > 0 && gameState.gameLog.slice(Math.max(gameState.gameLog.length - 3, 0)).map((turnEntries: LogEntry[], turnIndex) => {
                const lastEntry = turnEntries[turnEntries.length - 1];
                
                return (
                <li key={`turnIndex1-${turnIndex}`} className="mb-4">
                  <div className="font-bold">
                    Turn {gameState.gameLog.length > 3 ? gameState.gameLog.length - (2 - turnIndex) : turnIndex + 1}
                  </div>
                  {!isTurnPaused || (gameState.gameLog.length > 3 ? turnIndex !== 2 : turnIndex !== gameState.gameLog.length - 1) ? (
                    <ul>
                    {Array.isArray(turnEntries) ? lastEntry?.message ? (
                          <li
                            key={`entryIndex-${turnIndex}`}
                            className={`text-sm bg-green-900/50 p-3 rounded ${turnIndex === 2 ? 'highlight' : ''} ${turnIndex === 2 ? getAnimationClass(lastEntry) : ''}`}
                          >
                            {lastEntry.message}
                            {lastEntry.effect && <span className={`text-xs ml-2 ${lastEntry.effect?.[0]?.type.includes('HP') ? lastEntry.effect?.[0]?.value >= 0 ? 'text-green-500' : 'text-red-500' : lastEntry.effect?.[0]?.type.toLowerCase().includes('mana') ? 'text-blue-500' : 'text-yellow-500'}`}>{`${lastEntry.effect?.[0]?.value >= 0 ? '+' : ''}${lastEntry.effect?.[0]?.value} ${lastEntry.effect?.[0]?.type}`}</span>}
                            {turnEntries.length > 1 && (
                              <button
                                className={`text-xs ml-2 transition-transform duration-300 ${isEntryModalOpen ? '' : 'rotate-180'}`}
                                onClick={() => handleEntryClick(turnEntries)}
                              >
                                <span>▼</span>
                              </button>
                            )}
                          </li>
                        ) : null : null
                    }
                  </ul>
                  ) : "Combat encounter is live..."}
                </li>
              )})}
            </ul>

            {/* Action / Restart Buttons */}
            {gameState.isGameOver ? (
              <section className={`absolute bottom-0 left-0 w-full max-w-md bg-red-700/80 rounded-lg shadow-md p-6 text-center ${isTurnPaused ? 'opacity-0' : 'opacity-100'}`}>
                <h2 className="text-xl font-extrabold text-red-200 mb-6">Game Over</h2>
                <button
                  onClick={handleRestart}
                  className="bg-red-500 hover:bg-red-600 transition-colors text-white font-bold py-3 px-6 rounded"
                >
                  Restart Game
                </button>
              </section>
            ) : (
              <button
                disabled={isTurnPaused}
                onClick={handleAction}
                className="bg-blue-600 hover:bg-blue-700 transition-colors text-white font-semibold py-3 px-8 rounded shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {gameStarted ? 'Continue' : 'Start Game'}
              </button>
            )}
          </div>
        </section>
      </main>

      {/* Full Log Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-white text-black p-6 rounded-lg shadow-lg max-w-lg w-full modal">
            <h2 className="text-xl font-bold mb-4">Full Game Log</h2>
            <ul className="overflow-y-auto max-h-96 space-y-2">
              {gameState.gameLog.map((turnEntries, turnIndex) => (
                <li key={`turnIndex2-${turnIndex}`} className="mb-4">
                  <div className="font-bold">Turn {turnIndex + 1}</div>
                  <ul>
                    {Array.isArray(turnEntries) ? turnEntries.map((entry, entryIndex) => (
                      <li key={`entryIndex1-${entryIndex}`} className="text-sm bg-gray-200 p-3 rounded">
                        {entry.message}
                        {entry.effect?.map((effect, effectIndex) => <span key={`effectIndex1-${entryIndex}-${effectIndex}`} className={`text-xs ml-2 ${effect?.type.includes('HP') ? effect?.value >= 0 ? 'text-green-500' : 'text-red-500' : effect?.type.toLowerCase().includes('mana') ? 'text-blue-500' : 'text-yellow-500'}`}>{`${effect?.value >= 0 ? '+' : ''}${effect?.value} ${effect?.type}`}</span>)}
                      </li>
                    )) : null}
                  </ul>
                </li>
              ))}
            </ul>
            <button
              onClick={toggleModal}
              className="mt-4 bg-red-500 hover:bg-red-600 transition-colors text-white font-bold py-2 px-4 rounded"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Entry Modal */}
      {isEntryModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-white text-black p-6 rounded-lg shadow-lg max-w-lg w-full modal">
            <h2 className="text-xl font-bold mb-4">Combat Encounter</h2>
            <ul className="overflow-y-auto max-h-96 space-y-2">
              {currentEntries.filter(entry => entry).map((entry, index) => (
                <li key={`entryIndex2-${index}`} className={`text-sm bg-gray-200 p-3 rounded ${entry.message.includes("A wild") ? "shake" : ""} ${entry.message.includes("spell") ? "glow" : ""}`}>
                  {entry.message}
                  {entry.effect?.filter(effect => effect.target !== 'monster').map((effect, effectIndex) => <span key={`effectIndex2-${effectIndex}`} className={`text-xs ml-2 ${effect?.type.includes('HP') ? effect?.value >= 0 ? 'text-green-500' : 'text-red-500' : effect?.type.toLowerCase().includes('mana') ? 'text-blue-500' : 'text-yellow-500'}`}>{`${effect?.value >= 0 ? '+' : ''}${effect?.value} ${effect?.type}`}</span>)}
                </li>
              ))}
            </ul>
            <button
              onClick={() => setIsEntryModalOpen(false)}
              className="mt-4 bg-red-500 hover:bg-red-600 transition-colors text-white font-bold py-2 px-4 rounded"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Spell Details Modal */}
      {selectedSpell && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-white text-black p-6 rounded-lg shadow-lg max-w-md w-full modal">
            <h2 className="text-xl font-bold mb-4">{selectedSpell.name}</h2>
            <p><strong>Description:</strong> {selectedSpell.description}</p>
            <p><strong>Power:</strong> {selectedSpell.power}</p>
            <p><strong>Mana Cost:</strong> {selectedSpell.manaCost}</p>
            <p><strong>Level:</strong> {gameState.player.spells.find(s => s.name === selectedSpell.name)?.level}</p>
            <button
              onClick={() => setSelectedSpell(null)}
              className="mt-4 bg-red-500 hover:bg-red-600 transition-colors text-white font-bold py-2 px-4 rounded"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
