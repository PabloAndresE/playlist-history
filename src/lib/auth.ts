import NextAuth from "next-auth";
import SpotifyProvider from "next-auth/providers/spotify";
import { prisma } from "./prisma";

const SPOTIFY_SCOPES = [
  "user-read-email",
  "user-library-read",
  "playlist-read-private",
  "playlist-read-collaborative",
  "playlist-modify-public",
  "playlist-modify-private",
].join(" ");

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID!,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
      authorization: {
        url: "https://accounts.spotify.com/authorize",
        params: {
          scope: SPOTIFY_SCOPES,
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (!account || !profile) return false;

      await prisma.user.upsert({
        where: { spotifyId: account.providerAccountId },
        create: {
          spotifyId: account.providerAccountId,
          email: (profile as { email?: string }).email ?? "",
          displayName:
            (profile as { display_name?: string }).display_name ?? "User",
          avatarUrl:
            (profile as { images?: { url: string }[] }).images?.[0]?.url ??
            null,
          accessToken: account.access_token!,
          refreshToken: account.refresh_token!,
          tokenExpiresAt: new Date(account.expires_at! * 1000),
        },
        update: {
          email: (profile as { email?: string }).email ?? "",
          displayName:
            (profile as { display_name?: string }).display_name ?? "User",
          avatarUrl:
            (profile as { images?: { url: string }[] }).images?.[0]?.url ??
            null,
          accessToken: account.access_token!,
          refreshToken: account.refresh_token!,
          tokenExpiresAt: new Date(account.expires_at! * 1000),
        },
      });

      return true;
    },
    async jwt({ token, account }) {
      if (account) {
        const user = await prisma.user.findUnique({
          where: { spotifyId: account.providerAccountId },
        });
        if (user) {
          token.userId = user.id;
          token.spotifyId = user.spotifyId;
        }
      }
      return token;
    },
    async session({ session, token }: { session: import("next-auth").Session; token: Record<string, unknown> }) {
      if (token.userId) {
        session.user.id = token.userId as string;
        (session.user as { spotifyId?: string }).spotifyId =
          token.spotifyId as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
});
