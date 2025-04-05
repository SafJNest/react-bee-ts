import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Home from './pages/Home.tsx';
import Dashboard from './pages/Dashboard.tsx'
import DashboardGuildWrapper from './pages/DashboardGuild.tsx'

const router = createBrowserRouter([
  {
    path: "/",
    element: <Home/>,
  },
  {
    path: "/dashboard",
    element: <Dashboard/>,
  },
  {
    path: "/dashboard/:guildId",
    element: <DashboardGuildWrapper/>,
  }


]);


function App() {
  return (
    <RouterProvider router={router} />
  );
}

export default App
