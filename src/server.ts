import express, { Request, Response } from "express";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import { v4 as uuidv4 } from "uuid";
import { PrismaClient } from 'generated/prisma/client'

dotenv.config();
const app = express();
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(cookieParser());
const prisma = new PrismaClient();

const PORT = process.env.SERVER_PORT || 3001;
const SERVER_HOST = `${process.env.SERVER_HOST}:${PORT}`;

app.get("/auth/discord", async (req: Request, res: Response) => {
    const code = req.query.code as string;
    if (!code) return res.status(400).json({ error: "Missing code" });

    try {
        const tokenResponse = await axios.post(
            "https://discord.com/api/oauth2/token",
            new URLSearchParams({
                client_id: process.env.CLIENT_ID!,
                client_secret: process.env.CLIENT_SECRET!,
                grant_type: "authorization_code",
                code,
                redirect_uri: `${SERVER_HOST}/auth/discord`,
            }),
            { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
        );

        const { access_token, refresh_token, expires_in } = tokenResponse.data;
        if (!access_token) throw new Error("Failed to obtain access token");

        const userResponse = await axios.get(
            "https://discord.com/api/users/@me",
            {
                headers: { Authorization: `Bearer ${access_token}` },
            }
        );

        const user = userResponse.data;
        const expiresAt = new Date(Date.now() + expires_in * 1000);

        const sessionToken = uuidv4();

        const session = await prisma.userSession.create({
            data: {
                id: sessionToken,
                user_id: user.id,
                username: user.username,
                avatar: user.avatar,
                access_token: access_token,
                refresh_token: refresh_token,
                expires_at: expiresAt,
            },
        });

        res.cookie("session_token", sessionToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 3600000,
            sameSite: "lax",
        });

        res.redirect(`${process.env.HOST}/dashboard`);
    } catch (error: any) {
        console.error(
            "Error exchanging code:",
            error.response?.data || error.message
        );
        res.status(500).json({ error: "Failed to get access token" });
    }
});

app.get("/discord/guilds", async (req: Request, res: Response) => {
    const sessionToken = req.cookies.session_token;

    if (!sessionToken) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        const session = await prisma.userSession.findUnique({
            where: { id: sessionToken },
        });

        if (!session || new Date() > session.expires_at) {
            return res.status(401).json({ error: "Session expired" });
        }

        const access_token = session.access_token;

        const guildResponse = await axios.get(
            "https://discord.com/api/users/@me/guilds",
            {
                headers: { Authorization: `Bearer ${access_token}` },
            }
        );

        const guilds = guildResponse.data.map((guild: any) => ({
            id: guild.id,
            name: guild.name,
            icon: guild.icon,
        }));

        res.json(guilds);
    } catch (error: any) {
        console.error(
            "Error fetching guilds:",
            error.response?.data || error.message
        );
        res.status(500).json({ error: "Failed to fetch guilds" });
    }
});

app.get("/discord/me", async (req: Request, res: Response) => {
    const sessionToken = req.cookies.session_token;

    if (!sessionToken) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        const session = await prisma.userSession.findUnique({
            where: { id: sessionToken },
        });

        if (!session || new Date() > session.expires_at) {
            return res.status(401).json({ error: "Session expired" });
        }

        const userInfo = {
            id: session.user_id,
            username: session.username,
            avatar: session.avatar,
        };

        res.json(userInfo);
    } catch (error: any) {
        console.error(
            "Error fetching user info:",
            error.response?.data || error.message
        );
        res.status(500).json({ error: "Failed to fetch user info" });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
