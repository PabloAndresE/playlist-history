import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      spotifyId?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }

  interface JWT {
    userId?: string;
    spotifyId?: string;
  }
}
