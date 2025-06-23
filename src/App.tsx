import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import Game from './pages/Game';
import React, { useEffect } from 'react';
import 'react-toastify/dist/ReactToastify.css';

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
