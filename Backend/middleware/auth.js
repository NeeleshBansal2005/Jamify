import jwt from "jsonwebtoken";
const authmiddleware = (req, res, next) => {
    const token = req.cookies.accessToken;
    if (!token) {
        return res.status(401).json({ error: "Access denied. No token provided." });
    }
    try{
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; //store the decoded user information in the request object for further use
        next(); //pass control to the next middleware or route handler
    } catch (error) {
        return res.status(401).json({ error: "Invalid token." })
    }}
    export default authmiddleware;