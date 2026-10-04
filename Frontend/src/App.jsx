import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Discover from "./pages/Discover";
import Room from "./pages/Room";

import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    // The "dark" class forces the dark theme across the whole app
    <div className="min-h-screen bg-neutral-950 text-white">

      <Router>

        <Routes>

          {/* ==================================================
              PUBLIC ROUTES
              Anyone can access these.
              ================================================== */}

          <Route path="/" element={<Landing />} />

          <Route path="/login" element={<Login />} />


          {/* ==================================================
              PROTECTED ROUTES
              
              Every route inside this wrapper first goes through
              ProtectedRoute.
              ================================================== */}

          <Route element={<ProtectedRoute />}>

            <Route
              path="/discover"
              element={<Discover />}
            />

            <Route
              path="/room/:id"
              element={<Room />}
            />

          </Route>

        </Routes>

      </Router>

    </div>
  );
}

export default App;