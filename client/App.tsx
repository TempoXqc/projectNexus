import Home from './src/pages/Home';
import Game from './src/pages/Game';
import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import WaitingRoom from './src/pages/WaitingRoom';

function App() {
  useEffect(() => {}, []); // À vérifier si nécessaire
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/waiting/:gameId" element={<WaitingRoom />} />
        <Route path="/game/:gameId" element={<Game />} />
      </Routes>
      <ToastContainer position="top-right" autoClose={5000} hideProgressBar={false} />
    </>
  );
}

export default App;