import { Navigate, Outlet } from "react-router-dom"; //outlet is is a frontend component used to render child routes within a parent layout in react applications.
import { useAuth } from "../AuthContext.jsx";

export default function ProtectedRoute() {

  const { user, loading } = useAuth();
//loading state is used to indicate whether the authentication check is still in progress. This prevents rendering protected content before the auth status is known.
  // Auth check abhi complete nahi hua.
  // Is waqt redirect nahi karna.
  if (loading) {
    return <div>Loading...</div>; // Show a loading indicator while checking authentication status.S
  }

  // Backend ne confirm nahi kiya ki user logged in hai.
  if (!user) {
    return <Navigate to="/login" replace />; // Redirect to login page if user is not authenticated. The replace prop ensures that the navigation history is replaced, preventing the user from going back to the protected route using the browser's back button.  
  }

  // User authenticated hai.
  // Ab requested protected page render karo.
  return <Outlet />;
}