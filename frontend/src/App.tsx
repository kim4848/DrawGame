import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Lobby from './pages/Lobby';
import Play from './pages/Play';
import Reveal from './pages/Reveal';
import BurgerMenu from './components/BurgerMenu';
import ToastContainer from './components/Toast';
import SkipLink from './components/SkipLink';

export default function App() {
  return (
    <BrowserRouter>
      <SkipLink />
      <BurgerMenu />
      <ToastContainer />
      <main id="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/join/:code" element={<Home />} />
          <Route path="/lobby" element={<Lobby />} />
          <Route path="/play" element={<Play />} />
          <Route path="/reveal" element={<Reveal />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
