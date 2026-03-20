import { NextResponse } from "next/server"
import db from "@/lib/db"

export async function GET() {
  try {
    // Test database connection
    const dbStatus = await testDatabaseConnection()

    // Get environment info
    const environment = {
      nodeEnv: process.env.NODE_ENV || "development",
      nextAuthUrl: process.env.NEXTAUTH_URL ? "Set" : "Not set",
      databaseUrl: process.env.DATABASE_URL ? "Set" : "Not set",
      stripeKeys: process.env.STRIPE_SECRET_KEY ? "Set" : "Not set",
    }

    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      environment,
      database: dbStatus,
    })
  } catch (error) {
    console.error("Server status check failed:", error)
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

async function testDatabaseConnection() {
  try {
    const result = await db.rawQuery("SELECT NOW()")
    return {
      connected: true,
      timestamp: result.rows[0].now,
    }
  } catch (error) {
    console.error("Database connection test failed:", error)
    return {
      connected: false,
      error: error instanceof Error ? error.message : "Unknown database error",
    }
  }
}
