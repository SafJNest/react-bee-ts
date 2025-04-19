import express, { Request, Response } from "express";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import { v4 as uuidv4 } from "uuid";
import { Prisma } from 'generated/prisma/client'
import { PrismaClient } from 'generated/prisma/client'
import jwt from 'jsonwebtoken';

dotenv.config();
const app = express();
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(cookieParser());
const prisma = new PrismaClient();

const PORT = process.env.SERVER_PORT || 3001;
const SERVER_HOST = `${process.env.SERVER_HOST}:${PORT}`;

const JWT_SECRET = Buffer.from(process.env.JWT_SECRET!, 'base64');

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '10m';

type SessionWithUser = Prisma.UserSessionGetPayload<{ include: { user: true } }>;

interface JwtPayload {
  sub: string;
  username: string;
  scopes?: string[];
}

export function generateInternalJWT(payload: JwtPayload): string {
    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
    });
}

async function getValidSession(sessionToken: string | undefined, res: Response): Promise<SessionWithUser | null> {
    if (!sessionToken) {
        res.status(401).json({ error: "Missing session token" });
        return null;
    }

    const session = await prisma.userSession.findUnique({
        where: { id: sessionToken },
        include: { user: true },
    });

    if (!session) return null;

    if (new Date() > session.expires_at) {
        try {
            const tokenResponse = await axios.post(
                "https://discord.com/api/oauth2/token",
                new URLSearchParams({
                    client_id: process.env.CLIENT_ID!,
                    client_secret: process.env.CLIENT_SECRET!,
                    grant_type: "refresh_token",
                    refresh_token: session.refresh_token,
                }),
                {
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                }
            );
    
            const { access_token, refresh_token, expires_in } = tokenResponse.data;
    
            const newExpiresAt = new Date(Date.now() + expires_in * 1000);
    
            await prisma.userSession.update({
                where: { id: sessionToken },
                data: {
                    access_token,
                    refresh_token,
                    expires_at: newExpiresAt,
                },
            });
    
            session.access_token = access_token;
            session.expires_at = newExpiresAt;
    
        } catch (err: any) {
            console.error("Failed to refresh token:", err.response?.data || err.message);
            res.status(401).json({ error: "Session expired and refresh failed" });
            return null;
        }
    }

    return session;
}

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

        await prisma.user.upsert({
            where: { id: user.id },
            update: {},
            create: {
                id: user.id,
                username: user.username,
                avatar: user.avatar,
            },
          });

        const session = await prisma.userSession.create({
            data: {
                id: sessionToken,
                user_id: user.id,
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
    const session = await getValidSession(sessionToken, res);
    if (!session) return;

    try {
        const guildResponse = await axios.get(
            "https://discord.com/api/users/@me/guilds",
            {
                headers: { Authorization: `Bearer ${session.access_token}` },
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
    const session = await getValidSession(sessionToken, res);
    if (!session) return;

    try {
        const userInfo = {
            id: session.user.id,
            username: session.user.username,
            avatar: session.user.avatar,
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

app.get("/beebot/guilds", async (req: Request, res: Response) => {
    const sessionToken = req.cookies.session_token;
    const session = await getValidSession(sessionToken, res);
    if (!session) return;

    try {
        const JWTtoken = generateInternalJWT({
            sub: session.user.id,
            username: session.user.username,
            scopes: ['settings:update'],
        });

        const discordGuildResponse = await axios.get(
            "https://discord.com/api/users/@me/guilds",
            {
            headers: { Authorization: `Bearer ${session.access_token}` },
            }
        );

        const discordGuildIds = discordGuildResponse.data.map((guild: any) => guild.id);

        const guildResponse = await axios.post(
            'http://localhost:8096/api/guild/guilds',
            discordGuildIds,
            { 
                headers: { 
                    Authorization: `Bearer ${JWTtoken}`,
                    'Content-Type': 'application/json'
                }
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
            "Error fetching guild info:",
            error.response?.data || error.message
        );
        res.status(500).json({ error: "Failed to fetch guild info" });
    }
});



app.listen(PORT, () => console.log(`Server running on port ${PORT}`));