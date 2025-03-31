import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Home from './Home.tsx';
import Dashboard from './Dashboard.tsx'

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Home/>} />
          <Route path="/dashboard" element={<Dashboard/>} />
        </Routes>
      </div>
    </Router>
  );
}

export default App
