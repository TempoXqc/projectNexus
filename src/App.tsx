import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import Game from './pages/Game';
import React, { useEffect } from 'react';

function App() {
  useEffect(() => {
  }, []);
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="game/:gameId" element={<Game />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
