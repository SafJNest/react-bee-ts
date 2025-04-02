import express, { Request, Response } from "express";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

dotenv.config();
const app = express();
app.use(cors({ origin: "http://localhost:5173", credentials: true })); 
app.use(express.json());
app.use(cookieParser());

const PORT = process.env.SERVER_PORT || 3001;
const SERVER_HOST = `${process.env.SERVER_HOST}:${PORT}`;

app.get("/auth/discord", async (req: Request, res: Response) => {
  const code = req.query.code as string;
  if (!code) 
    return res.status(400).json({ error: "Missing code" });
  console.log(`${SERVER_HOST}/auth/discord`)
  try {
    const tokenResponse = await axios.post(
      "https://discord.com/api/oauth2/token",
      new URLSearchParams({
        client_id: process.env.CLIENT_ID!,
        client_secret: process.env.CLIENT_SECRET!,
        grant_type: "authorization_code",
        code,
        redirect_uri: `${SERVER_HOST}/auth/discord`,
        scope: "identify guilds",
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const accessToken = tokenResponse.data.access_token;
    if (!accessToken) {
      throw new Error("Failed to obtain access token");
    }

    res.cookie("discord_token", accessToken, {
      httpOnly: false,
      secure: false,
      maxAge: 3600000,
      sameSite: "lax",
    });

    res.redirect(`${process.env.HOST}/dashboard`);
  } catch (error: any) {
    console.error("Error exchanging code:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to get access token" });
  }
});

app.get("/discord/me", async (req: Request, res: Response) => {
  const token = req.cookies.discord_token;

  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const userResponse = await axios.get("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${token}` }
    });

    res.json(userResponse.data);
  } catch (error: any) {
    console.error("Error fetching Discord user:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch user data" });
  }
});

app.get("/discord/guilds", async (req: Request, res: Response) => {
  const token = req.cookies.discord_token;

  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const userResponse = await axios.get("https://discord.com/api/users/@me/guilds", {
      headers: { Authorization: `Bearer ${token}` }
    });

    res.json(userResponse.data);
  } catch (error: any) {
    console.error("Error fetching Discord user:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch user data" });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));