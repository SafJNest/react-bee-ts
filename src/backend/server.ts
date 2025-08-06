import express, { Request, Response } from "express";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import { v4 as uuidv4 } from "uuid";
import { Prisma } from 'generated/prisma/client'
import { PrismaClient } from 'generated/prisma/client'
import jwt from 'jsonwebtoken';
import cron from "node-cron";

const THIRTY_DAYS = 1000 * 60 * 60 * 24 * 30;

dotenv.config();
const app = express();
app.use(cors({ origin: process.env.HOST, credentials: true }));
app.use(express.json());
app.use(cookieParser());
const prisma = new PrismaClient();

const PORT = process.env.SERVER_PORT || 3001;
const SERVER_HOST = `${process.env.SERVER_HOST}:${PORT}`;

const INTERNAL_API_BASE_URL = process.env.INTERNAL_API_BASE_URL || "http://localhost:8096";

const JWT_SECRET = Buffer.from(process.env.JWT_SECRET!, 'base64');

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '10m';

type fullSession = Prisma.UserSessionGetPayload<{ include: { user: true, discordToken: true } }>;

interface JwtPayload {
  sub: string;
  username: string;
  scopes?: string[];
}

cron.schedule("0 * * * *", async () => {
    const deleted = await prisma.userSession.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  
    console.log(`Cleaned up ${deleted.count} expired sessions`);
});

export function generateInternalJWT(payload: JwtPayload): string {
    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
    });
}

async function refreshDiscordToken(session: any): Promise<fullSession | null> {
    try {
        const tokenResponse = await axios.post(
            "https://discord.com/api/oauth2/token",
            new URLSearchParams({
                client_id: process.env.CLIENT_ID!,
                client_secret: process.env.CLIENT_SECRET!,
                grant_type: "refresh_token",
                refresh_token: session.discordToken.refreshToken,
            }),
            {
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
            }
        );

        const { access_token, refresh_token, expires_in } = tokenResponse.data;

        const newExpiresAt = new Date(Date.now() + expires_in * 1000);

        await prisma.userSession.update({
            where: { id: session.id },
            data: {
                discordToken: {
                    update: {
                        accessToken: access_token,
                        refreshToken: refresh_token,
                        expiresAt: newExpiresAt,
                    },
                },
            },
        })

        session.discordToken = {accessToken: access_token, refreshToken: refresh_token, expiresAt: newExpiresAt};

    } catch (err: any) {
        console.error("Failed to refresh token:", err.response?.data || err.message);
        return null;
    }
    return session;
}


async function getValidSession(sessionToken: string | undefined, res: Response): Promise<fullSession | null> {
    if (!sessionToken) {
        res.status(401).json({ error: "Missing session token" });
        return null;
    }

    let session;
    try {
    session = await prisma.userSession.findUnique({
        where: { id: sessionToken },
        include: { user: true, discordToken: true },
    });
    } catch (e) {
        console.error("DB error while fetching session:", e);
        res.status(500).json({ error: "Internal server error" });
        return null;
    }

    if (!session) return null;

    //non so se serve dato che in teoria se il cookie scade qui non ci arriva (giuro che non ci sto capendo più un cazzo)
    if(new Date() > session.expiresAt) {
        res.status(401).json({ error: "Session expired" });
        return null;
    }

    if (new Date() > session.discordToken.expiresAt) {
        const updatedSession = await refreshDiscordToken(session);
        if (!updatedSession) {
            res.status(401).json({ error: "Session expired and refresh failed" });
            return null;
        }
        session = updatedSession;
    }

    return session;
}

app.get("/session/status", async (req: Request, res: Response) => {
    const session = await getValidSession(req.cookies.session_token, res);
    if (!session) return;
    res.json({ ok: true, user: session.user });
  });

app.get("/auth/discord", async (req: Request, res: Response) => {
    const code = (req.query.code as string)?.trim();
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

        res.cookie("session_token", sessionToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: THIRTY_DAYS,
            sameSite: "lax",
        });

        await prisma.userSession.create({
            data: {
                id: sessionToken,
                expiresAt: new Date(Date.now() + THIRTY_DAYS), //this is our session expiration
                user: {
                    connectOrCreate: {
                        where: { id: user.id },
                        create: {
                            id: user.id,
                            username: user.username,
                            avatar: user.avatarUrl, //if this is null? i dont fucking know
                        },
                    },
                },
                discordToken: {
                    create: {
                        accessToken: access_token,
                        refreshToken: refresh_token,
                        expiresAt: expiresAt, //this is discord token expiration
                    },
                },
            },
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
                headers: { Authorization: `Bearer ${session.discordToken.accessToken}` },
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
            scopes: ['guilds'],
        });

        const discordGuildResponse = await axios.get(
            "https://discord.com/api/users/@me/guilds",
            {
            headers: { Authorization: `Bearer ${session.discordToken.accessToken}` },
            }
        );

        const discordGuildIds = discordGuildResponse.data.map((guild: any) => guild.id);

        const guildResponse = await axios.post(
            `${INTERNAL_API_BASE_URL}/api/guild/guilds`,
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



app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}).on("error", (err: any) => {
    console.error("Server failed to start:", err);
});