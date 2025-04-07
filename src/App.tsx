import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Home from './pages/Home.tsx';
import Dashboard from './pages/Dashboard.tsx'
import DashboardGuildWrapper from './pages/DashboardGuild.tsx'
import Settings from './pages/Settings.tsx';

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
    children: [
      {
        path: "general",
        element: <Settings />,
      },
      {
        path: "settings",
        element: <Settings />,
      },
    ],
  }


]);


function App() {
  return (
    <RouterProvider router={router} />
  );
}

export default App
