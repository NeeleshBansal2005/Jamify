import dotenv from "dotenv";
import express from "express";
import cors from "cors"; //to allow backend to take data from frontend 
const app = express();
import roomRoutes from "./routes/rooms.js"
const port = process.env.PORT || 5000;
dotenv.config({
    path: "./.env",
});
app.use(cors());//
app.use(express.json()) //middleware frontend se ayi we json ko body me convert krega
app.use("/rooms",roomRoutes)

app.listen(port, () => {
  console.log(` Hi !!Example app listening on port http://localhost:${port}`)
})
