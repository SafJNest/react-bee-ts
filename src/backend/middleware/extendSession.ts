import { Request, Response, NextFunction } from "express";

//not used, but can be used to extend the session cookie expiration time
export function extendSessionCookie(maxAgeMs: number) {
  return function (req: Request, res: Response, next: NextFunction) {
    const sessionToken = req.cookies.session_token;

    if (sessionToken) {
      res.cookie("session_token", sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: maxAgeMs,
        sameSite: "lax",
      });
    }

    next();
  };
}