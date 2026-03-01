import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  secret: process.env.AUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    jwt({ token, account, profile }) {
      if (account && profile) {
        token.googleId = account.providerAccountId;
        token.picture = (profile as { picture?: string }).picture;
        token.email = profile.email;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.image = token.picture as string | null | undefined;
        // Expose googleId to client for Convex user lookup
        (session.user as unknown as Record<string, unknown>).googleId = token.googleId;
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
    error: "/",
  },
});
