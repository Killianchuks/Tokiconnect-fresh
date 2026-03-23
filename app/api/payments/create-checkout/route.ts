import { NextResponse } from "next/server"
import stripe from "@/lib/stripe"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      teacherId,
      lessonType,
      lessonDate,
      lessonDuration,
      lessonStartTime,
      lessonEndTime,
      userTimezone,
      amount,
      userId,
      language,
      lessonFocus,
      studentNotes,
    } = body
    
    // Try session auth first, fall back to userId in body
    const token = await auth.getAuthCookie()
    const session = token ? auth.verifyToken(token) : null
    const currentUserId = session?.id || userId

    if (!currentUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Validate required fields
    if (!teacherId || !lessonType || !amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Get teacher information
    const result = await db.rawQuery(
      'SELECT first_name as "firstName", last_name as "lastName", email FROM users WHERE id = $1',
      [teacherId],
    )

    const teacher = result.rows[0]

    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 })
    }

    // Create a Stripe checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${lessonType} with ${teacher.firstName} ${teacher.lastName}`,
              description: `${lessonDuration} minute lesson${lessonDate ? ` on ${lessonDate}` : ""}`,
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId: currentUserId,
        teacherId,
        lessonType,
        lessonDate: lessonDate || "",
        lessonDuration: lessonDuration || "",
        lessonStartTime: lessonStartTime || "",
        lessonEndTime: lessonEndTime || "",
        userTimezone: userTimezone || "",
        language: language || "",
        lessonFocus: lessonFocus || "",
        studentNotes: studentNotes || "",
      },
      mode: "payment",
      // Use http in development to avoid SSL issues when running locally without HTTPS
      success_url: `${(process.env.NODE_ENV === "development"
        ? (process.env.NEXTAUTH_URL?.replace(/^https?:\/\//, "http://") || "http://localhost:3000")
        : process.env.NEXTAUTH_URL) || "http://localhost:3000"}/dashboard/book-lesson/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${(process.env.NODE_ENV === "development"
        ? (process.env.NEXTAUTH_URL?.replace(/^https?:\/\//, "http://") || "http://localhost:3000")
        : process.env.NEXTAUTH_URL) || "http://localhost:3000"}/dashboard/schedule`,
    })

    return NextResponse.json({ checkoutUrl: checkoutSession.url })
  } catch (error) {
    console.error("Error creating checkout session:", error)
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 })
  }
}
