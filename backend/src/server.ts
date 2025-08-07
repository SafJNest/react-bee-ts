import express, { Request, Response } from "express";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import { v4 as uuidv4 } from "uuid";
import { Prisma } from '../generated/prisma'
import { PrismaClient } from '../generated/prisma'
import jwt from 'jsonwebtoken';
import cron from "node-cron";
import path from 'path';

const THIRTY_DAYS = 1000 * 60 * 60 * 24 * 30;

dotenv.config();
const app = express();

// Serve static files from public directory
const publicPath = path.join(__dirname, '../public');
console.log('Serving static files from:', publicPath);
app.use(express.static(publicPath));

app.use(cors({ origin: process.env.HOST, credentials: true }));
app.use(express.json());
app.use(cookieParser());
const prisma = new PrismaClient();

const PORT = process.env.SERVER_PORT || 3001;
const SERVER_HOST = `${process.env.SERVER_HOST}:${PORT}`;

const INTERNAL_API_BASE_URL = process.env.INTERNAL_API_BASE_URL || "http://localhost:8096";

const JWT_SECRET = process.env.JWT_SECRET!;

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '10m';

// Spotify configuration
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const SPOTIFY_CALLBACK_URL = process.env.SPOTIFY_CALLBACK_URL || `http://127.0.0.1:3001/spotify/callback`;
const spotifyCredentials = Buffer.from(
  `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
).toString('base64');

type fullSession = Prisma.UserSessionGetPayload<{ include: { user: true, discordToken: true } }>;

interface JwtPayload {
  sub: string;
  username: string;
  scopes?: string[];
}

interface SpotifyTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number; // seconds
  token_type: string;
  scope: string;
}

interface RefreshedTokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  scope: string;
  expires_in: number;
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
    } as jwt.SignOptions);
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

// Spotify utility functions
async function exchangeSpotifyCodeForTokens(code: string): Promise<SpotifyTokenResponse | null> {
    try {
        const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')}`
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code: code.toString(),
                redirect_uri: SPOTIFY_CALLBACK_URL
            })
        });

        if (!tokenResponse.ok) {
            throw new Error('Failed to exchange code for token');
        }

        return await tokenResponse.json() as SpotifyTokenResponse;
        
    } catch (error) {
        console.error(error);
        return null;
    }
}

async function refreshSpotifyTokenForUser(discordId: string): Promise<RefreshedTokenResponse | null> {
    const existingToken = await prisma.spotifyToken.findUnique({
        where: { discordId },
    });

    if (!existingToken) {
        return null;
    }

    const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${spotifyCredentials}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: existingToken.refreshToken,
        }),
    });

    if (!response.ok) {
        throw new Error(`Failed to refresh token: ${response.statusText}`);
    }

    const data = (await response.json()) as RefreshedTokenResponse;

    const expiresAt = new Date(Date.now() + data.expires_in * 1000);

    await prisma.spotifyToken.update({
        where: { discordId },
        data: {
            accessToken: data.access_token, 
            expiresAt,
            refreshToken: data.refresh_token || existingToken.refreshToken,
        },
    });

    return data;
}

async function saveTokensForDiscordUser(discordId: string, tokens: SpotifyTokenResponse): Promise<void> {
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    console.log(`access token: ` + tokens.access_token);

    await prisma.spotifyToken.upsert({
        where: { discordId },
        update: {
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiresAt,
        },
        create: {
            discordId,
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiresAt,
        },
    });
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


// Spotify routes
app.get('/spotify/callback', async (req: Request, res: Response) => {
    const { code, state, error } = req.query;

    if (error || !code || !state) {
        return res.redirect('/login-failed.html');
    }

    const [discordId, sessionState] = state?.toString().split(':') || [];

    try {
        const tokens = await exchangeSpotifyCodeForTokens(code as string);

        if (!tokens) throw new Error('No tokens received');

        await saveTokensForDiscordUser(discordId, tokens);

        return res.redirect('/login-success.html');
    } catch (err) {
        console.error('Callback failed:', err);
        return res.redirect('/login-failed.html');
    }
});

app.get('/spotify/refresh-token/:discordId', async (req: Request, res: Response) => {
    const { discordId } = req.params;
    try {
        const refreshedToken = await refreshSpotifyTokenForUser(discordId);
        if (!refreshedToken) {
            return res.status(404).json({ error: 'No token found for this user' });
        }
        return res.json(refreshedToken);
    } catch (error) {
        console.error('Error refreshing token:', error);
        return res.status(500).json({ error: 'Failed to refresh token' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}).on("error", (err: any) => {
    console.error("Server failed to start:", err);
});