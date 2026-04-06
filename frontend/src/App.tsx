import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Lobby from './pages/Lobby';
import Play from './pages/Play';
import Reveal from './pages/Reveal';
import BurgerMenu from './components/BurgerMenu';
import ToastContainer from './components/Toast';

export default function App() {
  return (
    <BrowserRouter>
      <BurgerMenu />
      <ToastContainer />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/join/:code" element={<Home />} />
        <Route path="/lobby" element={<Lobby />} />
        <Route path="/play" element={<Play />} />
        <Route path="/reveal" element={<Reveal />} />
      </Routes>
    </BrowserRouter>
  );
}
