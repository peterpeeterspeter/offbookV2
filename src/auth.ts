import NextAuth from "next-auth"
import { authOptions } from "@/lib/auth"

export const { auth, handlers: { GET, POST } } = NextAuth(authOptions)

// Re-export the auth options
export { authOptions }
