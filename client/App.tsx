import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Home from './src/pages/Home';
import Game from './src/pages/Game';
import React, { useEffect } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import WaitingRoom from './src/pages/WaitingRoom.tsx';

function App() {
  useEffect(() => {}, []);
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/waiting/:gameId" element={<WaitingRoom />} />
        <Route path="/game/:gameId" element={<Game />} />
      </Routes>
      <ToastContainer position="top-right" autoClose={5000} hideProgressBar={false} />
    </BrowserRouter>
  );
}

export default App;