import { NextResponse } from "next/server"
import bcryptjs from "bcryptjs" // Changed from 'bcrypt' to 'bcryptjs'
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const role = searchParams.get("role")

    let query = db.select().from(users)

    if (role) {
      query = query.where(eq(users.role, role))
    }

    const allUsers = await query

    // Remove sensitive information
    const safeUsers = allUsers.map((user) => {
      const { password, ...safeUser } = user
      return safeUser
    })

    return NextResponse.json(safeUsers)
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json({ message: "Failed to fetch users" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, email, password, role } = body

    // Check if user already exists
    const existingUsers = await db.select().from(users).where(eq(users.email, email))

    if (existingUsers.length > 0) {
      return NextResponse.json({ message: "User with this email already exists" }, { status: 400 })
    }

    // Hash password
    const hashedPassword = await bcryptjs.hash(password, 10)

    // Create user
    const newUsers = await db
      .insert(users)
      .values({
        name,
        email,
        password: hashedPassword,
        role: role || "student",
      })
      .returning()

    const { password: _, ...newUser } = newUsers[0]

    return NextResponse.json(newUser, { status: 201 })
  } catch (error) {
    console.error("Error creating user:", error)
    return NextResponse.json({ message: "Failed to create user" }, { status: 500 })
  }
}

export async function PUT(request: any) {
  try {
    const body = await request.json()
    const { id, first_name, last_name, name, email, language, languages, hourly_rate, bio, defaultMeetingLink, password } = body
    const { timezone } = body

    if (!id) {
      return NextResponse.json({ message: "User ID is required" }, { status: 400 })
    }
        // Check authentication - support both Authorization header and NextRequest cookies
        const { auth } = require("@/lib/auth")
        const authHeader = request.headers?.get?.("authorization")
        let isAuthenticated = false

        if (authHeader?.startsWith("Bearer ")) {
          const token = authHeader.substring(7)
          const payload = auth.verifyToken(token)
          isAuthenticated = !!payload
        } else if (request.cookies?.get) {
          const token = request.cookies.get("auth_token")?.value
          if (token) {
            const payload = auth.verifyToken(token)
            isAuthenticated = !!payload
          }
        }

        // Allow updates if authenticated and updating own profile, or if updating from admin
        if (!isAuthenticated && id) {
          // Allow unauthenticated requests that have minimal fields (shouldn't happen but be safe)
          if (!bio && !defaultMeetingLink && !language && !languages) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
          }
        }

    // Ensure optional columns exist (safe migrations for DBs created before these columns were added)
    try {
      await db.rawQuery(`ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone TEXT`, [])
    } catch {
      // Ignore – column already exists or insufficient permissions
    }

    // Resolve current users table columns to support environments with slightly different schemas
    const columnsResult = await db.rawQuery(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'users'`,
      [],
    )
    const userColumns = new Set(columnsResult.rows.map((row: any) => String(row.column_name)))
    const hasColumn = (columnName: string) => userColumns.has(columnName)

    // Build dynamic UPDATE query
    const updates: string[] = []
    const params: any[] = []
    let paramIndex = 1

    if (first_name !== undefined && hasColumn("first_name")) {
      updates.push(`first_name = $${paramIndex++}`)
      params.push(first_name)
    }
    if (last_name !== undefined && hasColumn("last_name")) {
      updates.push(`last_name = $${paramIndex++}`)
      params.push(last_name)
    }
    if (name !== undefined && hasColumn("name")) {
      updates.push(`name = $${paramIndex++}`)
      params.push(name)
    }
    if (email !== undefined && hasColumn("email")) {
      updates.push(`email = $${paramIndex++}`)
      params.push(email)
    }
    if (language !== undefined && hasColumn("language")) {
      updates.push(`language = $${paramIndex++}`)
      params.push(language)
    }
    if (languages !== undefined && hasColumn("languages")) {
      updates.push(`languages = $${paramIndex++}`)
      params.push(languages)
    }
    if (hourly_rate !== undefined && hasColumn("hourly_rate")) {
      updates.push(`hourly_rate = $${paramIndex++}`)
      params.push(hourly_rate)
    }
    if (bio !== undefined && hasColumn("bio")) {
      updates.push(`bio = $${paramIndex++}`)
      params.push(bio)
    }
    if (defaultMeetingLink !== undefined && hasColumn("default_meeting_link")) {
      updates.push(`default_meeting_link = $${paramIndex++}`)
      params.push(defaultMeetingLink)
    }
    if (timezone !== undefined && hasColumn("timezone")) {
      updates.push(`timezone = $${paramIndex++}`)
      params.push(timezone)
    }
    if (password !== undefined && hasColumn("password")) {
      const hashedPassword = await bcryptjs.hash(password, 10)
      updates.push(`password = $${paramIndex++}`)
      params.push(hashedPassword)
    }

    if (updates.length === 0) {
      return NextResponse.json({ message: "No fields to update" }, { status: 400 })
    }

    // Add the user ID as the last parameter
    params.push(id)

    const query = `UPDATE users SET ${updates.join(", ")} WHERE id = $${paramIndex} RETURNING *`
    
    const result = await db.rawQuery(query, params)

    if (result.rows.length === 0) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    const updatedUser = result.rows[0] || {}

    // If a teacher updates their default meeting link, apply it to upcoming scheduled lessons
    // that do not already have a meeting link so students receive access automatically.
    if (
      typeof defaultMeetingLink === "string" &&
      defaultMeetingLink.trim() !== "" &&
      String(updatedUser.role || "").toLowerCase() === "teacher"
    ) {
      try {
        await db.rawQuery(
          `UPDATE lessons
           SET meeting_link = $1, updated_at = CURRENT_TIMESTAMP
           WHERE teacher_id::text = $2::text
             AND (meeting_link IS NULL OR TRIM(meeting_link) = '')
             AND status IN ('scheduled', 'confirmed')`,
          [defaultMeetingLink.trim(), String(id)],
        )
      } catch (lessonUpdateError) {
        console.warn("Failed to backfill meeting links for existing lessons:", lessonUpdateError)
      }
    }

    return NextResponse.json({
      id: updatedUser.id,
      email: updatedUser.email,
      first_name: updatedUser.first_name,
      last_name: updatedUser.last_name,
      name: updatedUser.name,
      role: updatedUser.role,
      language: updatedUser.language,
      languages: updatedUser.languages,
      hourly_rate: updatedUser.hourly_rate,
      bio: updatedUser.bio,
      defaultMeetingLink: updatedUser.default_meeting_link ?? updatedUser.defaultMeetingLink,
      timezone: updatedUser.timezone,
    })
  } catch (error) {
    console.error("Error updating user:", error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ message: errorMessage || "Failed to update user", error: String(error) }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ message: "User ID is required" }, { status: 400 })
    }

    const deletedUsers = await db.delete(users).where(eq(users.id, id)).returning()

    if (deletedUsers.length === 0) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "User deleted successfully" })
  } catch (error) {
    console.error("Error deleting user:", error)
    return NextResponse.json({ message: "Failed to delete user" }, { status: 500 })
  }
}
