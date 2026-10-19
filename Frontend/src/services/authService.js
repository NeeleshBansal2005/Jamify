const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

//frontend ka backend se api communication ka code , "Backend ko login request exactly kaise bhejni hai."
export const loginUser = async (email, password) => {

  const res = await fetch(`${API_URL}/auth/login`, {

    method: "POST",

    headers: {
      "Content-Type": "application/json"
    },

    // Important:
    // Allows browser to send/store our HttpOnly auth cookies.
    credentials: "include",

    body: JSON.stringify({
      email,
      password
    })
  });

  const data = await res.json();

  // fetch() does NOT automatically throw for 401/400.
  // So we explicitly check res.ok.
  if (!res.ok) {
    throw new Error(data.error || "Login failed");
  }

  return data;
};
// Ask the backend who is currently logged in.
// The browser automatically sends the HttpOnly accessToken cookie.
export const getCurrentUser = async () => {

  const res = await fetch(`${API_URL}/auth/me`, {

    method: "GET",

    // IMPORTANT:
    // Sends the HttpOnly authentication cookie
    // with this request.
    credentials: "include"
  });

  const data = await res.json();

  // If access token is missing, expired, or invalid,
  // backend will return 401.
  if (!res.ok) {
    throw new Error(data.error || "Not authenticated");
  }

  // Backend response is:
  // { user: {...} }
  return data.user;
};

// Log out from the current browser session.
// The browser sends the HttpOnly cookies; JavaScript never reads the tokens.
export const logoutUser = async () => {

  const res = await fetch(`${API_URL}/auth/logout`, {

    method: "POST",

    // Sends the HttpOnly authentication cookies with this request.
    credentials: "include"
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Logout failed");
  }

  return data;
};
