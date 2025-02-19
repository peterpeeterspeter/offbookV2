import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import type { JWT } from "next-auth/jwt";
import type { Session } from "next-auth";
import type { NextRequest } from "next/server";
import CredentialsProvider from "next-auth/providers/credentials";

// Define custom types
declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      accessToken?: string;
      refreshToken?: string;
    };
    accessToken?: string;
    error?: string;
  }

  interface User {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    accessToken?: string;
    refreshToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    exp?: number;
    error?: string;
    user?: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      accessToken?: string;
      refreshToken?: string;
    };
  }
}

const config = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          throw new Error("Missing credentials");
        }

        try {
          const response = await fetch(`${process.env.AUTH_API_URL}/auth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'login',
              username: credentials.username,
              password: credentials.password,
            }),
          });

          if (!response.ok) {
            const error = await response.text();
            console.error('Auth server error:', error);
            throw new Error(error || 'Authentication failed');
          }

          const userData = await response.json();

          if (!userData || !userData.token) {
            console.error('Invalid auth response:', userData);
            throw new Error("Invalid response from auth server");
          }

          return {
            id: userData.user?.id || 'unknown',
            name: userData.user?.name || null,
            email: userData.user?.email || null,
            image: userData.user?.image || null,
            accessToken: userData.token,
            refreshToken: userData.refreshToken,
          };
        } catch (error) {
          console.error('Authentication error:', error);
          throw error;
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }: { token: JWT; user: any }) {
      if (user) {
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
        token.user = user;
      }

      // Check if token needs refresh
      const tokenExpiry = token.exp as number;
      if (!tokenExpiry || Date.now() >= (tokenExpiry - 60) * 1000) {
        try {
          const response = await fetch(`${process.env.AUTH_API_URL}/auth`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              type: 'refresh',
              token: token.refreshToken,
            }),
          });

          if (!response.ok) {
            throw new Error('RefreshAccessTokenError');
          }

          const refreshedTokens = await response.json();

          if (!refreshedTokens.token) {
            throw new Error('RefreshAccessTokenError');
          }

          return {
            ...token,
            accessToken: refreshedTokens.token,
            refreshToken: refreshedTokens.refreshToken || token.refreshToken,
            exp: refreshedTokens.expiresIn ? Math.floor(Date.now() / 1000) + refreshedTokens.expiresIn : undefined,
            error: undefined, // Clear any previous errors
          };
        } catch (error) {
          console.error('Error refreshing access token:', error);
          return {
            ...token,
            error: 'RefreshAccessTokenError',
          };
        }
      }

      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      return {
        ...session,
        accessToken: token.accessToken,
        error: token.error,
        user: {
          ...session.user,
          id: token.user?.id || 'unknown',
          accessToken: token.accessToken,
          refreshToken: token.refreshToken,
        },
      };
    }
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  debug: process.env.NODE_ENV === 'development',
  events: {
    async signIn({ user }) {
      console.log('Successful sign in', user.email);
    },
    async signOut(message) {
      if ('session' in message && message.session && 'user' in message.session) {
        const accessToken = message.session.user?.accessToken;
        if (accessToken) {
          try {
            await fetch(`${process.env.AUTH_API_URL}/logout`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
              },
            });
          } catch (error) {
            console.error('Error during sign out:', error);
          }
        }
      }
    },
  },
} satisfies NextAuthConfig;

const auth = NextAuth(config);

export const GET = auth.handlers.GET;
export const POST = auth.handlers.POST;
