import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        // You can attach additional properties to the session user here if needed
        // e.g., session.user.id = token.sub
      }
      return session;
    },
  },
  pages: {
    signIn: "/", // We use the root page as the login screen
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
