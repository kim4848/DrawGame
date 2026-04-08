import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Home from './pages/Home';
import Lobby from './pages/Lobby';
import Play from './pages/Play';
import Reveal from './pages/Reveal';
import Login from './pages/Login';
import Register from './pages/Register';
import Premium from './pages/Premium';
import PremiumUpgrade from './pages/PremiumUpgrade';
import PremiumManage from './pages/PremiumManage';
import BurgerMenu from './components/BurgerMenu';
import ToastContainer from './components/Toast';
import SkipLink from './components/SkipLink';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <SkipLink />
        <BurgerMenu />
        <ToastContainer />
        <main id="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/join/:code" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/premium" element={<Premium />} />
            <Route path="/premium/upgrade" element={<PremiumUpgrade />} />
            <Route path="/premium/manage" element={<PremiumManage />} />
            <Route path="/lobby" element={<Lobby />} />
            <Route path="/play" element={<Play />} />
            <Route path="/reveal" element={<Reveal />} />
          </Routes>
        </main>
      </BrowserRouter>
    </AuthProvider>
  );
}
