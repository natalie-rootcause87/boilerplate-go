import React, { useState, useEffect, useRef } from 'react';
import GameState, { PartialGameState, LogEntry } from '../utils/GameState';
import EventManager from '../utils/EventManager';
import Spell, { allSpells } from '../utils/Spell';
import ProgressBar from './ProgressBar';
import { useVersion } from '../contexts/VersionContext';

export default function Game() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const actionInProgress = useRef(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [currentEntries, setCurrentEntries] = useState<LogEntry[]>([]);
  const [selectedSpell, setSelectedSpell] = useState<Spell | null>(null);
  const logRef = useRef<HTMLUListElement | null>(null);
  const [isTurnPaused, setIsTurnPaused] = useState(false);
  const [isSpellReplaceModalOpen, setIsSpellReplaceModalOpen] = useState(false);
  const [newSpellName, setNewSpellName] = useState<string>('');
  const { version, showVersionModal, setShowVersionModal, updateVersion } = useVersion();
  const [showDevButton, setShowDevButton] = useState(() => {
    // Initialize based on localStorage
    const hasSeenVersion = localStorage.getItem('gameVersion') === version;
    return !hasSeenVersion && process.env.NODE_ENV === 'development';
  });

  useEffect(() => {
    const newGameState = new GameState();
    if (newGameState.unlockedSpells.length > 0) {
      const randomSpellName = newGameState.unlockedSpells[Math.floor(Math.random() * newGameState.unlockedSpells.length)];
      newGameState.player.spells.push({ name: randomSpellName, level: 1 });
    }
    console.log('Initial GameState:', newGameState);
    setGameState(newGameState);

    // Example polling logic commented out:
    // const intervalId = setInterval(async () => {
    //   try {
    //     const response = await axios.post('/api/activity');
    //     setGameState(response.data.gameState);
    //   } catch (error) {
    //     console.error('Error fetching game state:', error);
    //   }
    // }, 5000);
    // return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [gameState?.gameLog]);

  useEffect(() => {
    // Check if we need to show the spell replacement modal
    if (gameState?.player.spellToReplace) {
      setNewSpellName(gameState.player.spellToReplace);
      setIsSpellReplaceModalOpen(true);
    }
  }, [gameState?.player.spellToReplace]);

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
    // setRenderTrigger(prev => prev + 1);

    const lastTurnEntries = updatedGameLog?.[updatedGameLog.length - 1];
    if (Array.isArray(lastTurnEntries) && lastTurnEntries.some(entry => entry.message.includes('A wild'))) {
      pauseTurn();
      setCurrentEntries([lastTurnEntries[0]]); // Set the first entry immediately

      // Show remaining entries with a short delay
      let index = 1; // Start from the second entry
      const intervalId = setInterval(() => {
        if (index > 1) {
          setCurrentEntries(prevEntries => [...prevEntries, lastTurnEntries[index - 1]]);
        }

        if (index < lastTurnEntries.length) {
          lastTurnEntries[index].effect?.forEach(effect => {
            if (effect.target === 'player') {
              if (effect.type === 'XP') {
                const oldMaxHealth = updatedGameState.player.maxHealth;
                const oldMaxMana = updatedGameState.player.maxMana;
                const didLevelUp = updatedGameState.player.gainXP(effect.value);
                if (didLevelUp) {
                  updatedGameState.addLogEntry(
                    `You leveled up to ${updatedGameState.player.level}!`,
                    [
                      { type: 'MAXHP', value: updatedGameState.player.maxHealth - oldMaxHealth, target: 'none' },
                      { type: 'MAXMANA', value: updatedGameState.player.maxMana - oldMaxMana, target: 'none' }
                    ]
                  );
                }
              } else if (effect.type === 'HP') {
                updatedGameState.player.health += effect.value;
                if (updatedGameState.player.health > updatedGameState.player.maxHealth) {
                  updatedGameState.player.health = updatedGameState.player.maxHealth;
                }
              } else if (effect.type === 'Mana') {
                updatedGameState.player.mana += effect.value;
                if (updatedGameState.player.mana > updatedGameState.player.maxMana) {
                  updatedGameState.player.mana = updatedGameState.player.maxMana;
                }
              }
            } else if (updatedGameState.monster && effect.target === 'monster') {
              updatedGameState.monster.health += effect.value;
            }
          });
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
      lastTurnLog?.forEach(entry => {
        if (entry.effect) {
          entry.effect.forEach(effect => {
            if (effect.type === 'XP') {
              const oldMaxHealth = updatedGameState.player.maxHealth;
              const oldMaxMana = updatedGameState.player.maxMana;
              const didLevelUp = updatedGameState.player.gainXP(effect.value);
              if (didLevelUp) {
                updatedGameState.addLogEntry(
                  `You leveled up to ${updatedGameState.player.level}!`,
                  [
                    { type: 'MAXHP', value: updatedGameState.player.maxHealth - oldMaxHealth, target: 'none' },
                    { type: 'MAXMANA', value: updatedGameState.player.maxMana - oldMaxMana, target: 'none' }
                  ]
                );
              }
            } else if (effect.type === 'HP') {
              updatedGameState.player.health += effect.value;
              if (updatedGameState.player.health > updatedGameState.player.maxHealth) {
                updatedGameState.player.health = updatedGameState.player.maxHealth;
              }
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
    if (isSpellReplaceModalOpen) {
      // If we're in spell replacement mode, replace the selected spell
      if (gameState) {
        gameState.player.setSpellToReplace(spellName);
        EventManager.spellSelection(gameState, newSpellName);
        setIsSpellReplaceModalOpen(false);
      }
    } else {
      // Normal spell selection mode
      const spell = allSpells.find(s => s.name === spellName);
      setSelectedSpell(spell || null);
    }
  };

  const dismissVersionModal = () => {
    setShowVersionModal(false);
    setShowDevButton(false);
    localStorage.setItem('gameVersion', version);
  };

  if (!gameState) {
    return <div>Loading...</div>;
  }

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-pink-600 to-pink-800 flex flex-col items-center text-white">
      {/* Header / Title */}
      <header className="w-full py-3 text-center shadow-lg bg-pink-800/80 sticky top-0 z-10">
        <h1 className="text-xl sm:text-3xl font-extrabold tracking-wide uppercase">
          Donut Go
        </h1>
        <div className="text-xs opacity-75 mt-1">{version}</div>
      </header>

      {/* Main Container */}
      <main className="flex-grow w-full max-w-5xl flex flex-col items-center p-2 sm:p-4 pb-20 sm:pb-4">
        {/* Player & Game Info */}
        <section className="w-full grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
          {/* Player Stats Card */}
          <div className="bg-pink-800/50 shadow-md rounded-lg p-3 sm:p-6">
            <h2 className="text-xl sm:text-2xl font-bold mb-4 text-center">Player Stats</h2>
            <div className="flex flex-col items-center space-y-3 sm:space-y-4">
              <div className="text-base sm:text-lg">
                <span className="font-semibold">Level:</span> {gameState.player.level}
              </div>
              {/* Progress Bars (using donut-friendly colors) */}
              <ProgressBar label="HP" value={gameState.player.health >= 0 ? gameState.player.health : 0} max={gameState.player.maxHealth} color="bg-rose-500" />
              <ProgressBar label="XP" value={gameState.player.xp >= 0 ? gameState.player.xp : 0} max={gameState.player.xpForNextLevel} color="bg-yellow-400" />
              <ProgressBar label="Mana" value={gameState.player.mana >= 0 ? gameState.player.mana : 0} max={gameState.player.maxMana} color="bg-blue-400" />

              <div className="text-base sm:text-lg w-full">
                <span className="font-semibold">Spells:</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {gameState.player.spells.length > 0
                    ? gameState.player.spells
                        .filter(
                          (spell, spellIndex) =>
                            gameState.player.spells.findIndex(s => s.name === spell.name) === spellIndex
                        )
                        .map(spell => (
                          <button
                            key={spell.name}
                            onClick={() => handleSpellClick(spell.name)}
                            className="px-3 py-1.5 bg-pink-700 hover:bg-pink-600 rounded-full text-sm transition-colors"
                          >
                            {spell.name}
                          </button>
                        ))
                    : <span className="text-gray-300">None</span>}
                </div>
              </div>
            </div>

            {/* Combat Encounter Display */}
            {currentEntries?.length > 0 && gameState.monster && (
              <div className="mt-4 p-2 rounded-lg">
                <h2 className="text-lg sm:text-xl font-bold mb-3">Combat Encounter</h2>
                <ul className="text-white/90 overflow-y-auto max-h-[180px] space-y-2">
                  {currentEntries?.length && currentEntries[currentEntries.length - 1] && (
                    <li
                      className={`text-sm bg-pink-900/50 p-3 rounded ${
                        currentEntries[currentEntries.length - 1].message.includes('A wild') ? 'shake' : ''
                      } ${
                        currentEntries[currentEntries.length - 1].message.includes('spell') ? 'glow' : ''
                      }`}
                    >
                      {currentEntries[currentEntries.length - 1].message}
                      {currentEntries[currentEntries.length - 1].effect
                        ?.filter(effect => effect.target !== 'monster')
                        .map((effect, effectIndex) => (
                          <span
                            key={`effectIndex3-${effectIndex}`}
                            className={`text-xs ml-2 ${
                              effect?.type.includes('HP')
                                ? effect?.value >= 0
                                  ? 'text-green-300'
                                  : 'text-red-300'
                                : effect?.type.toLowerCase().includes('mana')
                                ? 'text-blue-300'
                                : 'text-yellow-300'
                            }`}
                          >
                            {`${effect?.value >= 0 ? '+' : ''}${effect?.value} ${effect?.type}`}
                          </span>
                        ))}
                    </li>
                  )}
                </ul>
                <ProgressBar
                  label="Monster"
                  value={gameState.monster.health > 0 ? gameState.monster.health : 0}
                  max={gameState.monster.difficultyLevel * 45}
                  color="bg-purple-400"
                />
              </div>
            )}
          </div>

          {/* Game Log Card */}
          <div className="relative bg-pink-800/50 shadow-md rounded-lg p-3 sm:p-6 flex flex-col h-[calc(100vh-20rem)] sm:h-[400px]">
            <h2 className="text-lg sm:text-2xl font-bold mb-2 sm:mb-4 text-center">Game Log</h2>
            {gameState.gameLog.length > 3 && (
              <button
                onClick={toggleModal}
                className="mb-2 bg-transparent hover:bg-white/10 transition-colors text-white font-bold py-1 px-3 rounded text-sm"
              >
                View Full Log
              </button>
            )}
            <ul
              ref={logRef}
              className={`flex-grow overflow-y-auto space-y-2 px-2 py-2 mb-16 ${
                gameState.isGameOver ? 'mb-24' : ''
              }`}
            >
              {gameState?.gameLog.length > 0 &&
                gameState.gameLog
                  .slice(Math.max(gameState.gameLog.length - 3, 0))
                  .map((turnEntries: LogEntry[], turnIndex) => {
                    const lastEntry = turnEntries[turnEntries.length - 1];
                    return (
                      <li key={`turnIndex1-${turnIndex}`} className="mb-3">
                        <div className="font-bold text-sm sm:text-base">
                          Turn{' '}
                          {gameState.gameLog.length > 3
                            ? gameState.gameLog.length - (2 - turnIndex)
                            : turnIndex + 1}
                        </div>
                        {!isTurnPaused ||
                        (gameState.gameLog.length > 3 ? turnIndex !== 2 : turnIndex !== gameState.gameLog.length - 1) ? (
                          <ul>
                            {Array.isArray(turnEntries) && lastEntry?.message ? (
                              <li
                                className={`text-sm bg-pink-900/50 p-3 rounded ${
                                  turnIndex === 2 ? 'highlight' : ''
                                } ${turnIndex === 2 ? getAnimationClass(lastEntry) : ''}`}
                              >
                                {lastEntry.message}
                                {lastEntry.effect && (
                                  <span
                                    className={`text-xs ml-2 ${
                                      lastEntry.effect[0]?.type.includes('HP')
                                        ? lastEntry.effect[0]?.value >= 0
                                          ? 'text-green-300'
                                          : 'text-red-300'
                                        : lastEntry.effect[0]?.type
                                            .toLowerCase()
                                            .includes('mana')
                                        ? 'text-blue-300'
                                        : 'text-yellow-300'
                                    }`}
                                  >
                                    {`${lastEntry.effect[0]?.value >= 0 ? '+' : ''}${
                                      lastEntry.effect[0]?.value
                                    } ${lastEntry.effect[0]?.type}`}
                                  </span>
                                )}
                                {turnEntries.length > 1 && (
                                  <button
                                    className="text-xs ml-2 transition-transform duration-300 hover:bg-white/10 rounded-full p-1"
                                    onClick={() => handleEntryClick(turnEntries)}
                                  >
                                    <span>▼</span>
                                  </button>
                                )}
                              </li>
                            ) : null}
                          </ul>
                        ) : (
                          'Combat encounter is live...'
                        )}
                      </li>
                    );
                  })}
            </ul>

            {/* Action Button Container */}
            <div className="fixed bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-pink-800 via-pink-800/95 to-transparent md:absolute md:p-4">
              {gameState.isGameOver ? (
                <div className={`w-full bg-red-700/80 rounded-lg shadow-md p-3 text-center ${
                  isTurnPaused ? 'opacity-0' : 'opacity-100'
                }`}>
                  <h2 className="text-base font-extrabold text-red-200 mb-2">Game Over</h2>
                  <button
                    onClick={handleRestart}
                    className="bg-red-500 hover:bg-red-600 transition-colors text-white font-bold py-2 px-4 rounded text-sm"
                  >
                    Restart Game
                  </button>
                </div>
              ) : (
                <button
                  disabled={isTurnPaused}
                  onClick={handleAction}
                  className="w-full bg-yellow-600 hover:bg-yellow-700 transition-colors text-white font-semibold py-2 sm:py-3 px-4 rounded shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {gameStarted ? 'Continue' : 'Start Game'}
                </button>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Modals */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white text-black p-4 sm:p-6 rounded-lg shadow-lg w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
            <h2 className="text-lg sm:text-xl font-bold mb-4">Full Game Log</h2>
            <ul className="overflow-y-auto flex-grow space-y-2 mb-4">
              {gameState.gameLog.map((turnEntries, turnIndex) => (
                <li key={`turnIndex2-${turnIndex}`} className="mb-3">
                  <div className="font-bold">Turn {turnIndex + 1}</div>
                  <ul>
                    {Array.isArray(turnEntries)
                      ? turnEntries.map((entry, entryIndex) => (
                          <li
                            key={`entryIndex1-${entryIndex}`}
                            className="text-sm bg-gray-100 p-3 rounded mt-1"
                          >
                            {entry.message}
                            {entry.effect?.map((effect, effectIndex) => (
                              <span
                                key={`effectIndex1-${entryIndex}-${effectIndex}`}
                                className={`text-xs ml-2 ${
                                  effect?.type.includes('HP')
                                    ? effect?.value >= 0
                                      ? 'text-green-600'
                                      : 'text-red-600'
                                    : effect?.type.toLowerCase().includes('mana')
                                    ? 'text-blue-600'
                                    : 'text-yellow-600'
                                }`}
                              >
                                {`${effect?.value >= 0 ? '+' : ''}${effect?.value} ${effect?.type}`}
                              </span>
                            ))}
                          </li>
                        ))
                      : null}
                  </ul>
                </li>
              ))}
            </ul>
            <button
              onClick={toggleModal}
              className="bg-red-500 hover:bg-red-600 transition-colors text-white font-bold py-2 px-4 rounded"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {isEntryModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white text-black p-4 sm:p-6 rounded-lg shadow-lg w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
            <h2 className="text-lg sm:text-xl font-bold mb-4">Combat Encounter</h2>
            <ul className="overflow-y-auto flex-grow space-y-2 mb-4">
              {currentEntries
                .filter(entry => entry)
                .map((entry, index) => (
                  <li
                    key={`entryIndex2-${index}`}
                    className={`text-sm bg-gray-100 p-3 rounded ${
                      entry.message.includes('A wild') ? 'shake' : ''
                    } ${entry.message.includes('spell') ? 'glow' : ''}`}
                  >
                    {entry.message}
                    {entry.effect
                      ?.filter(effect => effect.target !== 'monster')
                      .map((effect, effectIndex) => (
                        <span
                          key={`effectIndex2-${effectIndex}`}
                          className={`text-xs ml-2 ${
                            effect?.type.includes('HP')
                              ? effect?.value >= 0
                                ? 'text-green-600'
                                : 'text-red-600'
                              : effect?.type.toLowerCase().includes('mana')
                              ? 'text-blue-600'
                              : 'text-yellow-600'
                          }`}
                        >
                          {`${effect?.value >= 0 ? '+' : ''}${effect?.value} ${effect?.type}`}
                        </span>
                      ))}
                  </li>
                ))}
            </ul>
            <button
              onClick={() => setIsEntryModalOpen(false)}
              className="bg-red-500 hover:bg-red-600 transition-colors text-white font-bold py-2 px-4 rounded"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {selectedSpell && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white text-black p-4 sm:p-6 rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-lg sm:text-xl font-bold mb-4">{selectedSpell.name}</h2>
            <div className="space-y-2">
              <p>
                <strong>Description:</strong> {selectedSpell.description}
              </p>
              <p>
                <strong>Power:</strong> {selectedSpell.power}
              </p>
              <p>
                <strong>Mana Cost:</strong> {selectedSpell.manaCost}
              </p>
              <p>
                <strong>Level:</strong>{' '}
                {gameState.player.spells.find(s => s.name === selectedSpell.name)?.level}
              </p>
            </div>
            <button
              onClick={() => setSelectedSpell(null)}
              className="mt-6 bg-red-500 hover:bg-red-600 transition-colors text-white font-bold py-2 px-4 rounded w-full"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {isSpellReplaceModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white text-black p-4 sm:p-6 rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-lg sm:text-xl font-bold mb-4">Replace a Spell</h2>
            <p className="mb-4">Choose a spell to replace with {newSpellName}:</p>
            <ul className="space-y-2">
              {gameState?.player.spells.map((spell, index) => (
                <li key={`spell-${index}`}>
                  <button
                    onClick={() => handleSpellClick(spell.name)}
                    className="w-full text-left p-3 hover:bg-gray-100 rounded transition-colors flex justify-between items-center"
                  >
                    <span>{spell.name}</span>
                    <span className="text-sm text-gray-600">Level {spell.level}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {showVersionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white text-black p-4 sm:p-6 rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-lg sm:text-xl font-bold mb-4">Game Updated! {version}</h2>
            <div className="space-y-2 mb-6">
              <p className="font-bold">Changes in this version:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Faster leveling progression</li>
                <li>Increased health gain on level up (20 HP, up from 10)</li>
                <li>Increased mana gain on level up (5 Mana, up from 2)</li>
                <li>Health and mana now fully restore on level up</li>
              </ul>
            </div>
            <button
              onClick={dismissVersionModal}
              className="w-full bg-pink-500 hover:bg-pink-600 transition-colors text-white font-bold py-2 px-4 rounded"
            >
              Got it!
            </button>
          </div>
        </div>
      )}

      {showDevButton && process.env.NODE_ENV === 'development' && (
        <button
          onClick={() => updateVersion(`v${Math.random().toString().slice(2, 5)}`)}
          className="fixed bottom-4 right-4 bg-pink-500 text-white px-4 py-2 rounded"
        >
          Test Version Update
        </button>
      )}
    </div>
  );
}
