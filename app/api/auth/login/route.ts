import { NextResponse } from "next/server"
import { comparePassword } from "@/lib/password-utils"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

// Define a proper interface for the user data
interface UserData {
  id: string
  email: string
  role: string
  firstName?: string
  lastName?: string
  name?: string
  language?: string
  hourlyRate?: number
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password } = body

    console.log("Login attempt for:", email)

    // Validate inputs
    if (!email || typeof email !== "string") {
      return NextResponse.json({ success: false, message: "Valid email is required" }, { status: 400 })
    }

    if (!password || typeof password !== "string") {
      return NextResponse.json({ success: false, message: "Password is required" }, { status: 400 })
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ success: false, message: "Invalid email format" }, { status: 400 })
    }

    // Check if database is available
    if (!process.env.DATABASE_URL) {
      console.warn("DATABASE_URL not set")
      return NextResponse.json({ success: false, message: "Database configuration error" }, { status: 500 })
    }

    // Query the database for the user
    try {
      // Ensure db is initialized
      if (!db || typeof db.rawQuery !== "function") {
        throw new Error("Database connection not initialized")
      }

      console.log("🔍 Looking up user in database:", email)
      const result = await db.rawQuery("SELECT * FROM users WHERE email = $1", [email])

      // Check if result is valid
      if (!result || !result.rows) {
        throw new Error("Invalid database response")
      }

      const user = result.rows.length > 0 ? result.rows[0] : null

      if (!user) {
        console.log("❌ User not found:", email)
        return NextResponse.json({ success: false, message: "Invalid email or password" }, { status: 401 })
      }

      console.log("✅ User found:", user.id, "Role:", user.role)

      // Compare the provided password with the stored hash
      const isPasswordValid = await comparePassword(password, user.password)

      if (!isPasswordValid) {
        console.log("❌ Invalid password for user:", email)
        return NextResponse.json({ success: false, message: "Invalid email or password" }, { status: 401 })
      }

      console.log("✅ Password valid, login successful")

      // Format user data based on table structure
      const normalizedRole = String(user.role || "student").trim().toLowerCase()
      const userData: UserData = {
        id: user.id,
        email: user.email,
        role: normalizedRole || "student", // Normalize role to keep client checks consistent
      }

      // Add name fields based on what's available
      if (user.first_name && user.last_name) {
        userData.firstName = user.first_name
        userData.lastName = user.last_name
        userData.name = `${user.first_name} ${user.last_name}`.trim()
      } else if (user.name) {
        userData.name = user.name
      }

      // Add optional fields if they exist
      if (user.language) userData.language = user.language
      if (user.hourly_rate) userData.hourlyRate = user.hourly_rate

      console.log("Returning user data with role:", userData.role)

      // Create session token and set it as a cookie so API endpoints can authenticate
      const token = auth.createToken(userData)
      const response = NextResponse.json({
        success: true,
        user: userData,
        token,
      })
      return auth.setAuthCookie(response, token)
    } catch (error) {
      console.error("Database error during login:", error)
      return NextResponse.json(
        {
          success: false,
          message: "An error occurred while authenticating",
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ success: false, message: "An error occurred" }, { status: 500 })
  }
}
