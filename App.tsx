import { Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Home from './src/pages/Home';
import Game from './src/pages/Game';
import WaitingRoom from './src/pages/WaitingRoom';
import CardPage from './src/pages/Card';

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/waiting/:gameId" element={<WaitingRoom />} />
        <Route path="/game/:gameId" element={<Game />} />
        <Route path="/cards" element={<CardPage />} />
      </Routes>
      <ToastContainer position="top-right" autoClose={5000} hideProgressBar={false} />
    </>
  );
}

export default App;