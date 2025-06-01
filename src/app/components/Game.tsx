import React, { useState, useEffect, useRef } from 'react';
import GameState, { LogEntry } from '../utils/GameState';
import EventManager from '../utils/EventManager';
import Spell, { allSpells } from '../utils/Spell';
import ProgressBar from './ProgressBar';
import { useVersion } from '../contexts/VersionContext';
import { useLeaderboard } from '../hooks/useLeaderboard';
import { useGameState } from '../hooks/useGameState';
import { Item } from '../utils/Items';

export default function Game() {
  const { gameState, updateGameState } = useGameState();
  const { leaderboard, error: leaderboardError, submitScore } = useLeaderboard();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const actionInProgress = useRef(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [currentEntries, setCurrentEntries] = useState<LogEntry[]>([]);
  const [selectedSpell, setSelectedSpell] = useState<Spell | null>(null);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const logRef = useRef<HTMLUListElement | null>(null);
  const [isTurnPaused, setIsTurnPaused] = useState(false);
  const [isSpellReplaceModalOpen, setIsSpellReplaceModalOpen] = useState(false);
  const [newSpellName, setNewSpellName] = useState<string>('');
  const { version, showVersionModal, setShowVersionModal, updateVersion } = useVersion();
  const [showDevButton, setShowDevButton] = useState(() => {
    if (typeof window === 'undefined') return false;
    const hasSeenVersion = localStorage.getItem('gameVersion') === version;
    return !hasSeenVersion && process.env.NODE_ENV === 'development';
  });
  const [isSpellChoiceModalOpen, setIsSpellChoiceModalOpen] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [hasSubmittedScore, setHasSubmittedScore] = useState(false);

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

  const pauseTurn = () => {
    console.log('Turn paused');
    setIsTurnPaused(true);
  };

  const unpauseTurn = () => {
    console.log('Turn unpaused');
    setIsTurnPaused(false);
  };

  const handleAction = () => {
    console.log('handleAction called', { actionInProgress: actionInProgress.current, gameState: !!gameState });
    if (actionInProgress.current || !gameState) return;
    actionInProgress.current = true;

    if (!gameStarted) {
      console.log('Starting new game');
      const newGameState = new GameState();
      newGameState.resetGame();
      console.log('New game state created:', newGameState);
      
      // Trigger first event immediately after game start
      const result = EventManager.triggerEvent(newGameState);
      console.log('Initial event result:', result);
      
      updateGameState.mutate(result);
      setGameStarted(true);
      
      // Handle the initial event result
      if (result.monster) {
        console.log('Initial monster encounter detected');
        pauseTurn();
        setCurrentEntries([result.gameLog[result.gameLog.length - 1][0]]);
        
        // Show remaining entries with a short delay
        const lastTurnEntries = result.gameLog[result.gameLog.length - 1];
        let index = 1;
        const intervalId = setInterval(() => {
          if (index < lastTurnEntries.length) {
            // Create a new state for this combat step
            const currentState = Object.assign(new GameState(), result);
            
            // Update the current entries to show progress
            setCurrentEntries(prevEntries => [...prevEntries, lastTurnEntries[index]]);
            
            // Update state based on effects
            const entry = lastTurnEntries[index];
            entry.effect?.forEach(effect => {
              if (effect.target === 'monster' && effect.type === 'HP' && currentState.monster) {
                currentState.monster.health += effect.value;
              }
              if (effect.target === 'player') {
                if (effect.type === 'Mana') {
                  currentState.player.mana += effect.value;
                }
                if (effect.type === 'HP') {
                  currentState.player.health += effect.value;
                }
              }
            });
            
            // Update the game state to reflect changes
            updateGameState.mutate(currentState);
            index++;
          } else {
            clearInterval(intervalId);
            unpauseTurn();
            if (result.player.pendingSpell) {
              setIsSpellChoiceModalOpen(true);
            }
          }
        }, 1000);
      } else {
        console.log('Initial non-monster event');
        setCurrentEntries([]);
        updateGameState.mutate(result);
        // Show spell choice modal immediately if there's a pending spell
        if (result.player.pendingSpell) {
          setIsSpellChoiceModalOpen(true);
        }
      }
      
      actionInProgress.current = false;
      return;
    }

    console.log('Creating updated game state');
    // Create a new instance of GameState to preserve class methods
    const updatedGameState = Object.assign(new GameState(), gameState);
    console.log('Triggering event');
    const result = EventManager.triggerEvent(updatedGameState);
    console.log('Event result:', result);

    // Check if there's a monster encounter
    if (result.monster) {
      console.log('Monster encounter detected');
      pauseTurn();
      setCurrentEntries([result.gameLog[result.gameLog.length - 1][0]]);
      
      // Show remaining entries with a short delay
      const lastTurnEntries = result.gameLog[result.gameLog.length - 1];
      let index = 1;
      const intervalId = setInterval(() => {
        if (index < lastTurnEntries.length) {
          // Create a new state for this combat step
          const currentState = Object.assign(new GameState(), result);
          
          // Update the current entries to show progress
          setCurrentEntries(prevEntries => [...prevEntries, lastTurnEntries[index]]);
          
          // Update state based on effects
          const entry = lastTurnEntries[index];
          entry.effect?.forEach(effect => {
            if (effect.target === 'monster' && effect.type === 'HP' && currentState.monster) {
              currentState.monster.health += effect.value;
            }
            if (effect.target === 'player') {
              if (effect.type === 'Mana') {
                currentState.player.mana += effect.value;
              }
              if (effect.type === 'HP') {
                currentState.player.health += effect.value;
              }
            }
          });
          
          // Update the game state to reflect changes
          updateGameState.mutate(currentState);
          index++;
        } else {
          clearInterval(intervalId);
          unpauseTurn();
          if (result.player.pendingSpell) {
            setIsSpellChoiceModalOpen(true);
          }
        }
      }, 1000);
    } else {
      console.log('Non-monster event');
      setCurrentEntries([]);
      updateGameState.mutate(result);
      // Show spell choice modal immediately if there's a pending spell
      if (result.player.pendingSpell) {
        setIsSpellChoiceModalOpen(true);
      }
    }
    
    actionInProgress.current = false;
  };

  const handleRestart = () => {
    console.log('Game restarted');
    const newGameState = new GameState();
    newGameState.resetGame();
    newGameState.gameLog = []; // Clear the game log
    if (newGameState.unlockedSpells.length > 0) {
      const randomSpellName = newGameState.unlockedSpells[Math.floor(Math.random() * newGameState.unlockedSpells.length)];
      newGameState.player.spells.push({ name: randomSpellName, level: 1 });
    }
    updateGameState.mutate(newGameState);
    setGameStarted(false);
    setHasSubmittedScore(false); // Reset the submission state when restarting
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

  const getEmojiClass = (entry: LogEntry) => {
    console.log('Message:', entry.message);
    
    // Spell casts
    if (entry.message.includes('casts Fireball') || entry.message.includes('fiery explosion')) {
      console.log('Matched: fireball');
      return 'emoji-float emoji-fireball';
    }
    if (entry.message.includes('Donut') || entry.message.includes('donut')) {
      console.log('Matched: donut');
      return 'emoji-float emoji-donut';
    }
    if (entry.message.includes('Freeze') || entry.message.includes('frozen')) {
      console.log('Matched: freeze');
      return 'emoji-float emoji-freeze';
    }
    if (entry.message.includes('Healing Light') || entry.message.includes('warm light')) {
      console.log('Matched: heal');
      return 'emoji-float emoji-heal';
    }
    if (entry.message.toLowerCase().includes('fist')) {
      console.log('Matched: fist');
      return 'emoji-float emoji-fist';
    }
    if (entry.message.includes('laugh')) {
      console.log('Matched: laugh');
      return 'emoji-float emoji-laugh';
    }
    
    // Monster events
    if (entry.message.includes('A wild')) {
      console.log('Matched: monster');
      return 'emoji-float emoji-monster';
    }
    if (entry.message.includes('strikes back') || entry.message.includes('damage')) {
      console.log('Matched: damage');
      return 'emoji-float emoji-damage';
    }
    if (entry.message.includes('has been defeated')) {
      console.log('Matched: defeated');
      return 'emoji-float emoji-damage';
    }
    
    // Random events
    if (entry.message.includes('shiny coin')) return 'emoji-float emoji-coin';
    if (entry.message.includes('gentle breeze')) return 'emoji-float emoji-breeze';
    if (entry.message.includes('bird sings')) return 'emoji-float emoji-bird';
    if (entry.message.includes('sudden chill')) return 'emoji-float emoji-chill';
    if (entry.message.includes('trip over')) return 'emoji-float emoji-trip';
    if (entry.message.includes('hidden stash')) return 'emoji-float emoji-supplies';
    if (entry.message.includes('sudden storm')) return 'emoji-float emoji-storm';
    if (entry.message.includes('donut flies')) return 'emoji-float emoji-flying-donut';
    
    // Status effects
    if (entry.message.includes('Level up')) return 'emoji-float emoji-level-up';
    if (entry.message.includes('defeated a boss')) return 'emoji-float emoji-level-up';
    if (entry.message.includes('found the') && entry.message.includes('spell')) return 'emoji-float emoji-level-up';
    if (entry.message.includes('Practice has paid off')) return 'emoji-float emoji-level-up';
    
    // Effect-based emojis (if no specific message match)
    if (entry.effect?.some(e => e.type === 'Mana')) return 'emoji-float emoji-mana';
    if (entry.effect?.some(e => e.type === 'XP')) return 'emoji-float emoji-xp';
    if (entry.effect?.some(e => e.type === 'HP' && e.value > 0)) return 'emoji-float emoji-heal';
    if (entry.effect?.some(e => e.type === 'HP' && e.value < 0)) return 'emoji-float emoji-damage';
    
    console.log('No emoji match found');
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

  const handleSpellChoice = (chosenSpell?: string) => {
    if (!gameState) return;
    
    const result = gameState.player.handleSpellChoice(chosenSpell);
    let message = "";
    
    switch (result) {
      case "kept_current":
        message = 'You decided to keep your current spells and skipped learning a new spell.';
        break;
      case "replaced":
        message = 'You replaced ' + chosenSpell;
        break;
      case "upgraded":
        message = 'You upgraded ' + gameState.player.pendingSpell + '.';
        break;
    }
    
    if (message) {
      gameState.addLogEntry(message);
    }
    
    setIsSpellChoiceModalOpen(false);
    updateGameState.mutate(Object.assign(new GameState(), gameState)); // Preserve class methods
  };

  const handleLeaderboardSubmit = async () => {
    if (!gameState || !playerName || hasSubmittedScore) return;
    
    try {
      await submitScore.mutateAsync({
        playerName,
        score: gameState.player.level // Using player level as score
      });
      setHasSubmittedScore(true);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error submitting score:', error);
    }
  };

  const isLevelUpMessage = (message: string) => {
    return message.includes('Level up!') || message.includes('defeated a boss');
  };

  const renderLogEntry = (entry: LogEntry, extraClasses: string = '', showExpandButton: boolean = false, turnEntries?: LogEntry[]) => {
    const isLevelUp = isLevelUpMessage(entry.message);
    const baseClasses = `text-sm p-3 rounded ${extraClasses} ${getAnimationClass(entry)}`;
    
    const content = (
      <>
        {isLevelUp && (
          <>
            <div className="level-up-particles">
              <div className="level-up-particle"></div>
              <div className="level-up-particle"></div>
              <div className="level-up-particle"></div>
              <div className="level-up-particle"></div>
              <div className="level-up-particle"></div>
            </div>
            <div className="level-up-text">LEVEL UP!</div>
          </>
        )}
        <span className={getEmojiClass(entry)}>
          {entry.message}
        </span>
        {entry.effect?.map((effect, effectIndex) => (
          <span
            key={`effect-${effectIndex}`}
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
        {showExpandButton && turnEntries && turnEntries.length > 1 && (
          <button
            className="text-xs ml-2 transition-transform duration-300 hover:bg-white/10 rounded-full p-1"
            onClick={() => handleEntryClick(turnEntries)}
          >
            <span>▼</span>
          </button>
        )}
      </>
    );

    if (isLevelUp) {
      return (
        <div className={`${baseClasses} level-up-container level-up-glow`}>
          {content}
        </div>
      );
    }

    return (
      <div className={baseClasses}>
        {content}
      </div>
    );
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
      <main className="flex-grow w-full max-w-7xl flex flex-col items-center p-2 overflow-auto sm:overflow-none sm:p-4 pb-20 sm:pb-4">
        {/* Player & Game Info */}
        <section className="w-full grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6">
          {/* Player Stats Card */}
          <div className="bg-pink-800/50 shadow-md rounded-lg p-3 sm:p-6">
            <h2 className="text-xl sm:text-2xl font-bold mb-4 text-center">Player Stats</h2>
            <div className="flex flex-col items-center space-y-3 sm:space-y-4">
              <div className={`text-base sm:text-lg`}>
                <span className="font-semibold">Level:</span> {gameState.player.level}
              </div>
              {/* Progress Bars (using donut-friendly colors) */}
              <ProgressBar label="HP" value={gameState.player.health >= 0 ? gameState.player.health : 0} max={gameState.player.maxHealth} color="bg-rose-500" />
              <ProgressBar label="XP" value={gameState.player.xp >= 0 ? gameState.player.xp : 0} max={gameState.player.xpForNextLevel} color="bg-yellow-400" />
              <ProgressBar label="Mana" value={gameState.player.mana >= 0 ? gameState.player.mana : 0} max={gameState.player.maxMana} color="bg-blue-400" />

              <div className="text-base sm:text-lg w-full">
                <span className="font-semibold">{`Spells (${gameState.player.getActiveSpells().length}/${gameState.player.level}):`}</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {gameState.player.getActiveSpells().length > 0
                    ? gameState.player.getActiveSpells()
                        .filter(
                          (spell, spellIndex) =>
                            gameState.player.getActiveSpells().findIndex(s => s.name === spell.name) === spellIndex
                        )
                        .map(spell => (
                          <button
                            key={spell.name}
                            onClick={() => handleSpellClick(spell.name)}
                            className="px-3 py-1.5 bg-pink-700 hover:bg-pink-600 rounded-full text-sm transition-colors"
                          >
                            {spell.name} {spell.level}
                          </button>
                        ))
                    : <span className="text-gray-300">None</span>}
                </div>
              </div>

              {/* Items Display */}
              {gameState.player.items.length > 0 && (
                <div className="text-base sm:text-lg w-full mt-4">
                  <span className="font-semibold">Special Items:</span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {gameState.player.items.map(item => (
                      <button
                        key={item.name}
                        onClick={() => setSelectedItem(item)}
                        className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-500 rounded-full text-sm flex items-center gap-2 transition-colors"
                        title={`Click for details`}
                      >
                        <span>{item.icon}</span>
                        <span>{item.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Combat Encounter Display */}
              {gameState.monster && (
                <div className="mt-4 p-2 rounded-lg w-full">
                  <h2 className="text-lg sm:text-xl font-bold mb-3">Combat Encounter</h2>
                  <ul className="text-white/90 overflow-y-auto max-h-[180px] space-y-2">
                    {currentEntries?.length && currentEntries[currentEntries.length - 1] && (
                      <li className={`${
                        currentEntries[currentEntries.length - 1].message.includes('A wild') ? 'shake' : ''
                      } ${
                        currentEntries[currentEntries.length - 1].message.includes('spell') ? 'glow' : ''
                      }`}>
                        {renderLogEntry(currentEntries[currentEntries.length - 1], 'bg-pink-900/50')}
                      </li>
                    )}
                  </ul>
                  <ProgressBar
                    label="Monster"
                    value={gameState.monster.health > 0 ? gameState.monster.health : 0}
                    max={gameState.monster.maxHealth}
                    color="bg-purple-400"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Game Log Card */}
          <div className="relative bg-pink-800/50 shadow-md rounded-lg p-3 sm:p-6 flex flex-col h-[calc(100vh-20rem)] sm:h-[400px]">
            <h2 className="text-lg sm:text-2xl font-bold mb-2 sm:mb-4 text-center">Game Log</h2>
            {!!gameState.gameLog.length && !gameState.isGameOver && (
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
              {gameStarted && gameState?.gameLog.length > 0 ? (
                gameState.gameLog
                  .slice(Math.max(gameState.gameLog.length - 3, 0))
                  .map((turnEntries: LogEntry[], turnIndex) => {
                    const lastEntry = turnEntries[turnEntries.length - 1];
                    return (
                      <li key={`turn-${turnIndex}`} className="mb-3">
                        <div className="font-bold text-sm sm:text-base">
                          Turn {gameState.gameLog.length > 3
                            ? gameState.gameLog.length - (2 - turnIndex)
                            : turnIndex + 1}
                        </div>
                        {!isTurnPaused ||
                        (gameState.gameLog.length > 3 ? turnIndex !== 2 : turnIndex !== gameState.gameLog.length - 1) ? (
                          <ul>
                            {Array.isArray(turnEntries) && lastEntry?.message ? (
                              <li className={turnIndex === 2 ? 'highlight' : ''}>
                                {renderLogEntry(lastEntry, 'bg-pink-900/50', true, turnEntries)}
                              </li>
                            ) : null}
                          </ul>
                        ) : (
                          <>
                            {/* Show initial monster encounter message */}
                            {turnEntries[0] && turnEntries[0].message.includes('A wild') && (
                              <div className="mb-2">
                                {renderLogEntry(turnEntries[0], 'bg-pink-900/50')}
                              </div>
                            )}
                            Combat encounter is live...
                          </>
                        )}
                      </li>
                    );
                  })
              ) : !gameStarted ? (
                <li>
                  <div className="font-bold text-sm sm:text-base">
                    Welcome to Donut Go, a game!
                  </div>
                </li>
              ) : null}
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
                    className="bg-gray-500 hover:bg-gray-600 transition-colors text-white font-bold py-2 px-4 rounded"
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

          {/* Leaderboard Card */}
          <div className="bg-pink-800/50 shadow-md rounded-lg p-3 sm:p-6">
            <h2 className="text-xl sm:text-2xl font-bold mb-4 text-center">Leaderboard</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                {leaderboard && leaderboard.map((entry, index) => (
                  <div key={index} className="flex justify-between items-center bg-pink-900/50 p-2 rounded text-white">
                    <span>{entry.name}</span>
                    <span className="font-bold">Level {entry.level}</span>
                  </div>
                ))}
              </div>
              {gameState.isGameOver && !hasSubmittedScore && (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full p-2 border rounded text-black"
                    maxLength={20}
                  />
                  <button
                    onClick={handleLeaderboardSubmit}
                    className="w-full bg-pink-500 hover:bg-pink-600 text-white font-bold py-2 px-4 rounded"
                    disabled={!playerName.trim()}
                  >
                    Submit Score
                  </button>
                  {leaderboardError && (
                    <p className="text-red-500 text-sm mt-2">{leaderboardError}</p>
                  )}
                </div>
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
                            className={`text-sm bg-gray-100 p-3 rounded mt-1`}
                          >
                            {renderLogEntry(entry)}
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
                    {renderLogEntry(entry)}
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
                {gameState.player.getActiveSpells().find(s => s.name === selectedSpell.name)?.level}
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
              {gameState?.player.getActiveSpells().map((spell, index) => (
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

      {isSpellChoiceModalOpen && gameState?.player.pendingSpell && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white text-black p-4 sm:p-6 rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-lg sm:text-xl font-bold mb-4">New Spell Found!</h2>
            <p className="mb-4 text-center">
              You discovered {gameState.player.pendingSpell}!{gameState.player.spells.length > gameState.player.level ? ` At level ${gameState.player.level}, 
              you can only hold ${gameState.player.level} spell${gameState.player.level > 1 ? 's' : ''}. Would you like to replace one of your current spells?` : ''}
            </p>
            <div className="space-y-3">
              {gameState.player.spells.length < gameState.player.level ? (
                <button
                  onClick={() => handleSpellChoice(gameState.player.pendingSpell)}
                  className="w-full bg-pink-500 hover:bg-pink-600 text-white font-bold py-2 px-4 rounded"
                >
                  Learn {gameState.player.pendingSpell}
                </button>
              ) : (
                <>
                  <p className="font-semibold">Your current spells:</p>
                  {gameState.player.getActiveSpells().map((spell) => (
                    <button
                      key={spell.name}
                      onClick={() => handleSpellChoice(spell.name)}
                      className="w-full text-left p-3 hover:bg-gray-100 rounded transition-colors flex justify-between items-center"
                    >
                      <span>Replace {spell.name} with {gameState?.player.pendingSpell}</span>
                      <span className="text-sm text-gray-600">Level {spell.level}</span>
                    </button>
                  ))}
                  <button
                    onClick={() => handleSpellChoice()}
                    className="w-full mt-4 bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded"
                  >
                    Keep Current Spells
                  </button>
                </>
              )}
            </div>
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
                <li>Added detailed item tooltips - click the Donut Crown to see what it does! <span className="emoji-float emoji-level-up">👑</span></li>
                <li>Fixed combat animations to show each action step-by-step</li>
                <li>Improved monster state handling between encounters</li>
                <li>Added proper spell learning UI for non-combat events</li>
                <li>Fixed various UI glitches and state bugs</li>
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

      {/* Item Details Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white text-black p-4 sm:p-6 rounded-lg shadow-lg w-full max-w-md">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">{selectedItem.icon}</span>
              <h2 className="text-lg sm:text-xl font-bold">{selectedItem.name}</h2>
            </div>
            <div className="space-y-2">
              <p>
                <strong>Description:</strong> {selectedItem.description}
              </p>
              <p>
                <strong>Effect:</strong> {selectedItem.effect === 'mana_regen' ? '+2 Mana regeneration per turn' : selectedItem.effect}
              </p>
            </div>
            <button
              onClick={() => setSelectedItem(null)}
              className="mt-6 bg-red-500 hover:bg-red-600 transition-colors text-white font-bold py-2 px-4 rounded w-full"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
