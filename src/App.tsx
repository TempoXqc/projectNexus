import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import Game from './pages/Game';
import React, { useEffect } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  useEffect(() => {}, []);
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="game/:gameId" element={<Game />} />
      </Routes>
      <ToastContainer position="top-right" autoClose={5000} hideProgressBar={false} />
    </BrowserRouter>
  );
}

export default App;