import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SocketProvider } from './context/SocketContext';
import Landing from './components/Landing';
import Lobby from './components/Lobby';
import Privacy from './components/Privacy';

function App() {
  return (
    <SocketProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/room/:roomId" element={<Lobby />} />
          <Route path="/privacy" element={<Privacy />} />
        </Routes>
      </Router>
    </SocketProvider>
  );
}

export default App;
