import express, { Request, Response } from "express";
import cors from "cors";
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from "dotenv";
import { Prisma } from 'generated/prisma/client'
import { PrismaClient } from 'generated/prisma/client'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicPath = path.join(__dirname, '../../public');

console.log('Serving static files from:', publicPath);

dotenv.config();
const app = express();
app.use(express.static(publicPath));
app.use(express.json());

const prisma = new PrismaClient();

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

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const SPOTIFY_CALLBACK_URL = process.env.SPOTIFY_CALLBACK_URL || 'http://localhost:3002/callback';
const PORT = process.env.SPOTIFY_PORT || 3002;

const credentials = Buffer.from(
  `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
).toString('base64');

console.log(`Spotify backend running on port ${PORT}`);


app.get('/callback', async (req: Request, res: Response) => {
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

app.get('/refresh-token/:discordId', async (req: Request, res: Response) => {
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


export async function exchangeSpotifyCodeForTokens(code: string): Promise<SpotifyTokenResponse | null> {
    try {
        const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`
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

        return await tokenResponse.json();
        
    } catch (error) {
        console.error(error);
        return null;
    }
}

export async function refreshSpotifyTokenForUser(discordId: string): Promise<RefreshedTokenResponse | null> {
  const existingToken = await prisma.spotifyToken.findUnique({
    where: { discordId },
  });

  if (!existingToken) {
    return null;
  }

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
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

export async function saveTokensForDiscordUser(discordId: string, tokens: SpotifyTokenResponse): Promise<void> {
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


app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}).on("error", (err: any) => {
    console.error("Server failed to start:", err);
});