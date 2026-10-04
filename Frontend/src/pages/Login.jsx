import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Headphones, LogIn } from "lucide-react";
import { useAuth } from "../AuthContext.jsx";
import { loginUser } from "../services/authService.js";
import { getCurrentUser } from "../services/authService.js";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";


export default function Login() {

  const navigate = useNavigate();

  const { setUser } = useAuth(); // Access the global auth state setter from context , destructuring to get user property and setUser function from the context value. This allows us to update the current user state after a successful login.  

  // ==========================================================
  // FORM STATE
  // Stores whatever the user types into the inputs.
  // ==========================================================

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Stores an error message if login fails.
  const [error, setError] = useState("");

  // Used to disable the button while the request is running.
  const [loading, setLoading] = useState(false);


  // ==========================================================
  // LOGIN HANDLER
  // Calls our frontend auth service.
  // The service talks to the backend.
  // ==========================================================

 const handleLogin = async () => {


  setError("");
  setLoading(true);

  try {

    await loginUser(email, password);

    // Login succeeded.
    // Ask the backend for the actual logged-in user
    // and store it in our global React auth state.
    const currentUser = await getCurrentUser();

    setUser(currentUser);

    navigate("/discover");

  } catch (error) {

    setError(error.message);

  } finally {

    setLoading(false);
  }
};


  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background">

      {/* Background Glows */}

      <div className="absolute top-1/4 left-1/3 w-[400px] h-[400px] bg-[#1DB954] rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-pulse" />

      <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[400px] bg-blue-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-20" />


      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="z-10 w-full max-w-md px-6"
      >

        <Card className="bg-secondary/40 backdrop-blur-xl border-border/50 shadow-2xl">

          <CardHeader className="text-center pb-2">

            <div className="mx-auto bg-background p-4 rounded-full w-fit mb-4 border border-border/50 shadow-[0_0_20px_rgba(29,185,84,0.2)]">

              <Headphones
                size={36}
                className="text-[#1DB954]"
              />

            </div>

            <CardTitle className="text-3xl font-extrabold tracking-tight">
              Welcome to JamLite
            </CardTitle>

            <CardDescription className="text-base mt-2">
              Login to discover and join live music rooms globally.
            </CardDescription>

          </CardHeader>


          <CardContent className="pt-6 pb-8 flex flex-col items-center">

            {/* ==================================================
                EMAIL INPUT
                ================================================== */}

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full mb-4 px-4 py-3 rounded-lg bg-background border border-border outline-none focus:ring-2 focus:ring-[#1DB954]"
            />


            {/* ==================================================
                PASSWORD INPUT
                ================================================== */}

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full mb-4 px-4 py-3 rounded-lg bg-background border border-border outline-none focus:ring-2 focus:ring-[#1DB954]"
            />


            {/* ==================================================
                ERROR MESSAGE
                Only shown when login fails.
                ================================================== */}

            {error && (
              <p className="text-red-500 text-sm mb-4 text-center">
                {error}
              </p>
            )}


            {/* ==================================================
                LOGIN BUTTON
                ================================================== */}

            <Button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-[#1DB954] text-black hover:bg-[#1ed760] rounded-full py-6 text-lg font-bold shadow-[0_0_30px_rgba(29,185,84,0.3)] transition-all hover:scale-105 active:scale-95"
            >

              <LogIn className="mr-2 h-5 w-5" />

              {loading ? "Logging in..." : "Login"}

            </Button>


            <p className="text-xs text-muted-foreground mt-6 text-center max-w-[250px]">
              By logging in, you agree to JamLite's Terms of Service and Privacy Policy.
            </p>

          </CardContent>

        </Card>

      </motion.div>

    </div>
  );
}