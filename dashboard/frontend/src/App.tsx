import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Header } from './components/Header';
import { Overview } from './pages/Overview';
import { Issues } from './pages/Issues';
import { Reports } from './pages/Reports';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Header />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/issues" element={<Issues />} />
            <Route path="/reports" element={<Reports />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
