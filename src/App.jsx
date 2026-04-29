import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import Lobby from './components/Lobby.jsx';
import GameScreen from './components/GameScreen.jsx';
import ResultsScreen from './components/ResultsScreen.jsx';
import MuteToggle from './components/MuteToggle.jsx';
import { unlockAudio } from './lib/sound.js';

const SCREENS = { LOBBY: 'lobby', GAME: 'game', RESULTS: 'results' };

export default function App() {
  const [screen, setScreen] = useState(SCREENS.LOBBY);
  const [session, setSession] = useState(null);
  const [result, setResult] = useState(null);
  const [leaderboardKey, setLeaderboardKey] = useState(0);

  function start(s) {
    unlockAudio();
    setSession(s);
    setResult(null);
    setScreen(SCREENS.GAME);
  }

  function endRound(r) {
    setResult(r);
    setScreen(SCREENS.RESULTS);
  }

  function backToLobby() {
    setScreen(SCREENS.LOBBY);
    setSession(null);
    setResult(null);
  }

  function bumpLeaderboard() {
    setLeaderboardKey((k) => k + 1);
  }

  return (
    <div onClick={unlockAudio}>
      <MuteToggle />
      <AnimatePresence mode="wait">
        {screen === SCREENS.LOBBY && (
          <Lobby
            key="lobby"
            onStart={start}
            leaderboardKey={leaderboardKey}
            onLeaderboardChange={bumpLeaderboard}
          />
        )}
        {screen === SCREENS.GAME && session && (
          <GameScreen
            key="game"
            session={session}
            onEndRound={endRound}
            onAbort={backToLobby}
          />
        )}
        {screen === SCREENS.RESULTS && session && result && (
          <ResultsScreen
            key="results"
            session={session}
            result={result}
            onPlayAgain={() => { bumpLeaderboard(); backToLobby(); }}
            onSaved={bumpLeaderboard}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
