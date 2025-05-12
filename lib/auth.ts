// lib/auth.ts
import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth, { type NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import prisma from "../lib/prisma";

// Extend the built-in NextAuth types
declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            credits: number;
            name?: string | null;
            email?: string | null;
            image?: string | null;
        }
    }

    interface JWT {
        id: string;
        credits: number;
    }

    // Add the User type extension
    interface User {
        credits: number;
    }
}

// Extend AdapterUser to include credits
declare module "@auth/core/adapters" {
    interface AdapterUser {
        credits: number;
    }
}

export const authOptions: NextAuthConfig = {
    adapter: PrismaAdapter(prisma),
    session: {
        strategy: "jwt",
    },
    pages: {
        signIn: "/sign-in",
        signOut: "/sign-out",
        error: "/error",
    },
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        }),
        CredentialsProvider({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "text" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Invalid credentials");
                }

                const email = credentials.email as string;

                const user = await prisma.user.findUnique({
                    where: {
                        email: email,
                    },
                });

                if (!user || !user.password) {
                    throw new Error("User not found");
                }

                const password = credentials.password as string;

                const isPasswordValid = await bcrypt.compare(
                    password,
                    user.password
                );

                if (!isPasswordValid) {
                    throw new Error("Invalid password");
                }

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    image: user.image,
                    credits: user.credits,
                };
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                // Type assertion to tell TypeScript that these properties exist
                token.id = user.id as string;
                token.credits = user.credits as number;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                // Type assertion to tell TypeScript that these properties exist
                session.user.id = token.id as string;
                session.user.credits = token.credits as number;
            }
            return session;
        },
    },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions);