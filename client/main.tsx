import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App';
import React = require('react');
import ReactDOM from 'react-dom/client';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);