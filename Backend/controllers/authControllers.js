import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import Session from "../models/Sessions.js";

export const registerUser = async (req, res) => {
  console.log("✅ Register route hit");
console.log(req.body);

  const { username, email, password } = req.body;

  // ==========================
  // Basic Validation
  // ==========================

  if (!username) {
    return res.status(400).json({
      error: "Username is required"
    });
  }

  if (!email) {
    return res.status(400).json({
      error: "Email is required"
    });
  }

  if (!password) {
    return res.status(400).json({
      error: "Password is required"
    });
  }

  try {

    // ==========================
    // Check if email already exists
    // ==========================

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        error: "User with this email already exists"
      });
    }

    // ==========================
    // Hash Password
    // ==========================

    const hashedPassword = await bcrypt.hash(password, 10);

    // ==========================
    // Create User
    // ==========================

    const user = await User.create({
      username,
      email,
      password: hashedPassword
    });

    // ==========================
    // Success Response
    // Never send password back
    // ==========================

    return res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar
      }
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      error: "Failed to register user"
    });

  }

};

export const loginUser = async (req, res) => {

  const { email, password } = req.body;

  // ==========================================================
  // BASIC VALIDATION
  // Make sure required login fields were provided.
  // ==========================================================

  if (!email) {
    return res.status(400).json({
      error: "Email is required"
    });
  }

  if (!password) {
    return res.status(400).json({
      error: "Password is required"
    });
  }

  try {

    // ==========================================================
    // 1. FIND USER
    // Search MongoDB for a user with this email.
    // ==========================================================

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        error: "Invalid credentials"
      });
    }


    // ==========================================================
    // 2. COMPARE PASSWORD
    // Compare the password entered during login with the
    // hashed password stored in MongoDB.
    // ==========================================================

    const isMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!isMatch) {
      return res.status(401).json({
        error: "Invalid credentials"
      });
    }


    // ==========================================================
    // 3. CREATE ACCESS TOKEN
    // Short-lived JWT used to authenticate normal API requests.
    // ==========================================================

    const accessToken = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h"
      }
    );


    // ==========================================================
    // 4. CREATE REFRESH TOKEN
    // Unlike the access token, this is just a cryptographically
    // random string. It is NOT a JWT.
    // ==========================================================

    const refreshToken = crypto
      .randomBytes(64)
      .toString("hex");


    // ==========================================================
    // 5. HASH REFRESH TOKEN
    // We NEVER store the raw refresh token in MongoDB.
    // The browser gets the raw token; the DB stores only its hash.
    // ==========================================================

    const refreshTokenHash = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");


    // ==========================================================
    // 6. CREATE DATABASE SESSION
    // One login = one session record.
    //
    // The session connects this refresh token to the user,
    // stores its expiry time and allows us to revoke it later.
    // ==========================================================

    await Session.create({
      user: user._id,

      refreshTokenHash,

      // Refresh session remains valid for 7 days.
      expiresAt: new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000
      )

      // revoked is automatically false because
      // Session.js has default: false
    });


    // ==========================================================
    // 7. STORE ACCESS TOKEN IN HTTPONLY COOKIE
    // Browser stores the JWT and automatically sends it with
    // future requests.
    //
    // JavaScript cannot directly read this cookie because
    // httpOnly is true.
    // ==========================================================

    res.cookie("accessToken", accessToken, {
      httpOnly: true,

      // false for local HTTP development.
      // Will become true in production HTTPS.
      secure: false,

      sameSite: "lax",

      // 1 hour = same lifetime as access JWT.
      maxAge: 60 * 60 * 1000
    });


    // ==========================================================
    // 8. STORE REFRESH TOKEN IN HTTPONLY COOKIE
    // Raw refresh token goes to the browser ONLY.
    // Its hash is what we stored in MongoDB above.
    // ==========================================================

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,

      // false for local HTTP development.
      secure: false,

      sameSite: "lax",

      // 7 days.
      maxAge: 7 * 24 * 60 * 60 * 1000
    });


    // ==========================================================
    // 9. LOGIN SUCCESS
    // We DON'T send either token in the JSON response.
    // Both are already stored as HttpOnly cookies.
    // ==========================================================

    return res.status(200).json({
      message: "Login successful"
    });

  } catch (error) {

    // ==========================================================
    // UNEXPECTED SERVER / DATABASE ERROR
    // ==========================================================

    console.error(error);

    return res.status(500).json({
      error: "Failed to login user"
    });
  }

};
export const getCurrentUser = async (req, res) => {
//controller khud jwt decode nhi krega , middleware will decode the jwt and attach the user info to req.user , therefore authenticated user id is available in req.user.id
try{
  const user = await User.findById(req.user.id).select("-password"); //exclude password from the response
  if(!user){
    return res.status(404).json({error:"User not found"});
  }else{
    return res.status(200).json({user});
  }
}
catch(error){
  console.error(error);
  return res.status(500).json({error:"Failed to fetch user"})

}};
export const refreshAccessToken = async (req, res) => {

  try {

    // ==========================================================
    // 1. GET OLD REFRESH TOKEN FROM COOKIE
    // ==========================================================

    const oldRefreshToken = req.cookies.refreshToken;

    if (!oldRefreshToken) {
      return res.status(401).json({
        error: "Refresh token required"
      });
    }


    // ==========================================================
    // 2. HASH THE REFRESH TOKEN
    //
    // MongoDB stores only the hash.
    // So we hash the incoming cookie and search for that hash.
    // ==========================================================

    const oldRefreshTokenHash = crypto
      .createHash("sha256")
      .update(oldRefreshToken)
      .digest("hex");


    // ==========================================================
    // 3. FIND SESSION
    // ==========================================================

    const session = await Session.findOne({
      refreshTokenHash: oldRefreshTokenHash
    });

    if (!session) {
      return res.status(401).json({
        error: "Invalid refresh token"
      });
    }


    // ==========================================================
    // 4. CHECK IF TOKEN WAS ALREADY REVOKED
    //
    // If someone tries to use an old refresh token again,
    // it means that token has already been consumed.
    //
    // This can indicate token theft/reuse.
    // ==========================================================

    if (session.revoked) {

      // Revoke all sessions belonging to this user.
      // This is a security response to possible token reuse.

      await Session.updateMany(
        { user: session.user },
        { revoked: true }
      );

      return res.status(401).json({
        error: "Refresh token has already been revoked"
      });
    }


    // ==========================================================
    // 5. CHECK EXPIRATION
    // ==========================================================

    if (session.expiresAt < new Date()) {

      // Mark expired session as revoked.

      session.revoked = true;

      await session.save();

      return res.status(401).json({
        error: "Refresh token expired"
      });
    }


    // ==========================================================
    // 6. REVOKE OLD SESSION
    //
    // Refresh token A has now been consumed.
    // It cannot be used again.
    // ==========================================================

    session.revoked = true;

    await session.save();


    // ==========================================================
    // 7. GENERATE NEW ACCESS TOKEN
    // ==========================================================

    const accessToken = jwt.sign(
      { id: session.user },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h"
      }
    );


    // ==========================================================
    // 8. GENERATE NEW REFRESH TOKEN
    //
    // This is refresh-token rotation.
    // Old token A → new token B
    // ==========================================================

    const newRefreshToken = crypto
      .randomBytes(64)
      .toString("hex");


    // ==========================================================
    // 9. HASH NEW REFRESH TOKEN
    //
    // Again, only the hash goes into MongoDB.
    // ==========================================================

    const newRefreshTokenHash = crypto
      .createHash("sha256")
      .update(newRefreshToken)
      .digest("hex");


    // ==========================================================
    // 10. CREATE NEW SESSION
    // ==========================================================

    await Session.create({
      user: session.user,

      refreshTokenHash: newRefreshTokenHash,

      expiresAt: new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000
      )
    });


    // ==========================================================
    // 11. SET NEW ACCESS TOKEN COOKIE
    // ==========================================================

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 1000
    });


    // ==========================================================
    // 12. SET NEW REFRESH TOKEN COOKIE
    // ==========================================================

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000
    });


    // ==========================================================
    // 13. SUCCESS
    // ==========================================================

    return res.status(200).json({
      message: "Access token refreshed"
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      error: "Failed to refresh access token"
    });
  }
}; 
export const logoutUser = async (req, res) => {

  try {

    // Get the refresh token stored inside the HTTP-only cookie
    const refreshToken = req.cookies.refreshToken;

    // If there is no refresh token, there is nothing to revoke
    if (refreshToken) {

      // Hash the raw refresh token because
      // our database stores only the hashed version
      const refreshTokenHash = crypto
        .createHash("sha256")
        .update(refreshToken)
        .digest("hex");

      // Find the session belonging to this refresh token
      const session = await Session.findOne({
        refreshTokenHash
      });

      // If the session exists, revoke it
      if (session) {
        session.revoked = true;
        await session.save();
      }
    }

    // Remove authentication cookies from the client.
    // These options match the cookies set during login and refresh.
    const cookieOptions = {
      httpOnly: true,
      secure: false,
      sameSite: "lax"
    };

    res.clearCookie("accessToken", cookieOptions);
    res.clearCookie("refreshToken", cookieOptions);

    return res.status(200).json({
      message: "Logout successful"
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      error: "Failed to logout"
    });
  }
};
