import { createContext, useContext, useEffect, useState } from "react";
import { getCurrentUser, logoutUser } from "./services/authService.js";

// Context that will hold the authentication state
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {

  // Current logged-in user.
  // null = no authenticated user.
  const [user, setUser] = useState(null);

  // We don't immediately know whether the user is logged in.
  // First we have to ask the backend.
  const [loading, setLoading] = useState(true);


  // Runs when the application starts.
  useEffect(() => {

    const checkAuthentication = async () => {

      try {

        // Browser sends the HttpOnly accessToken cookie.
        // Backend verifies it and returns the current user.
        const currentUser = await getCurrentUser();

        setUser(currentUser);

      } catch {

        // No valid authentication session.
        setUser(null);

      } finally {

        // Finished checking authentication.
        setLoading(false);
      }
    };

    checkAuthentication();

  }, []);


  // End the server-side session before clearing the authenticated user.
  const logout = async () => {
    await logoutUser();
    setUser(null);
  };


  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        loading,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};


// Custom hook used by components to access auth state.
export const useAuth = () => {
  return useContext(AuthContext);
};
