import { NextResponse } from "next/server"
import stripe from "@/lib/stripe"
import { db } from "@/lib/db"
import { sendTeacherLessonBookedEmail, sendStudentLessonConfirmedEmail } from "@/lib/email"

export async function POST(request: Request) {
  try {
    const { sessionId } = await request.json()

    console.log("[v0] verify-session called with sessionId:", sessionId)

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID required" }, { status: 400 })
    }

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    console.log("[v0] Stripe session retrieved:", session.payment_status, session.metadata)

    if (session.payment_status !== "paid") {
      return NextResponse.json({ error: "Payment not completed" }, { status: 400 })
    }

    // Extract metadata
    const metadata = session.metadata || {}
    const userId = metadata.userId
    const teacherId = metadata.teacherId
    const lessonType = metadata.lessonType
    const lessonDate = metadata.lessonDate
    const lessonDuration = metadata.lessonDuration
    const lessonStartTime = metadata.lessonStartTime
    const lessonEndTime = metadata.lessonEndTime
    const userTimezone = metadata.userTimezone
    const language = metadata.language
    const lessonFocus = metadata.lessonFocus
    const studentNotes = metadata.studentNotes

    if (!userId || !teacherId) {
      return NextResponse.json({ error: "Missing booking information" }, { status: 400 })
    }

    const resolveMeetingLinkForStart = async (targetStartTime: Date): Promise<string | null> => {
      let resolvedMeetingLink: string | null = null
      let defaultMeetingLink: string | null = null

      try {
        const teacherAvailability = await db.rawQuery(
          `SELECT availability, default_meeting_link FROM users WHERE id::text = $1::text AND role = 'teacher'`,
          [teacherId],
        )

        if (teacherAvailability.rows.length > 0) {
          const row = teacherAvailability.rows[0]
          defaultMeetingLink = row.default_meeting_link || null

          if (row.availability && Array.isArray(row.availability)) {
            const availability = row.availability
            const lessonDay = new Date(targetStartTime).toLocaleString("en-US", { weekday: "long" }).toLowerCase()
            const dayAvailability = availability.find((item: any) => item.day?.toLowerCase() === lessonDay)

            if (dayAvailability && dayAvailability.slots) {
              const lessonHour = targetStartTime.getHours()
              const lessonMinute = targetStartTime.getMinutes()
              const lessonTimeString = `${String(lessonHour).padStart(2, "0")}:${String(lessonMinute).padStart(2, "0")}`

              for (const slot of dayAvailability.slots) {
                if (typeof slot === "string") {
                  const [startStr, endStr] = slot.split(" - ")
                  if (startStr && endStr) {
                    const slotStart = startStr.trim()
                    const slotEnd = endStr.trim()
                    if (lessonTimeString >= slotStart && lessonTimeString < slotEnd) {
                      break
                    }
                  }
                } else if (slot.start && slot.end && slot.meetingLink) {
                  if (lessonTimeString >= slot.start && lessonTimeString < slot.end) {
                    resolvedMeetingLink = slot.meetingLink
                    break
                  }
                }
              }
            }
          }
        }
      } catch (availabilityError) {
        console.warn("Failed to fetch teacher availability for meeting link:", availabilityError)
      }

      if (!resolvedMeetingLink && defaultMeetingLink) {
        resolvedMeetingLink = defaultMeetingLink
      }

      return resolvedMeetingLink
    }

    // Prevent duplicate booking creation for the same Stripe session
    const existingLessonResult = await db.rawQuery(
      `SELECT * FROM lessons WHERE payment_id::text = $1::text LIMIT 1`,
      [sessionId],
    )

    if (existingLessonResult.rows.length > 0) {
      const existingLesson = existingLessonResult.rows[0]

      if (!existingLesson.meeting_link) {
        const existingStart = new Date(existingLesson.start_time || lessonStartTime || lessonDate || Date.now())
        const recoveredMeetingLink = await resolveMeetingLinkForStart(existingStart)

        if (recoveredMeetingLink) {
          await db.rawQuery(
            `UPDATE lessons SET meeting_link = $1, updated_at = CURRENT_TIMESTAMP WHERE id::text = $2::text`,
            [recoveredMeetingLink, String(existingLesson.id)],
          )

          existingLesson.meeting_link = recoveredMeetingLink
          existingLesson.meetingLink = recoveredMeetingLink
        }
      }

      return NextResponse.json({
        success: true,
        alreadyProcessed: true,
        lesson: existingLesson,
      })
    }

    // Determine lesson start/end times
    let startTime: Date
    let endTime: Date

    if (lessonStartTime) {
      startTime = new Date(lessonStartTime)
    } else if (lessonDate) {
      startTime = new Date(lessonDate)
    } else {
      // Use a slightly-future start time so the lesson shows up as upcoming
      startTime = new Date(Date.now() + 60000)
    }

    // Fallback if parsing yielded an invalid date
    if (isNaN(startTime.getTime())) {
      console.warn("Invalid startTime from metadata, falling back to soon:", {
        lessonStartTime,
        lessonDate,
      })
      startTime = new Date(Date.now() + 60000)
    }

    // Ensure duration is a number and at least 30 minutes
    let durationMinutes = Number.parseInt(lessonDuration || "30")
    if (isNaN(durationMinutes) || durationMinutes < 30) {
      durationMinutes = 30
    }

    if (lessonEndTime) {
      endTime = new Date(lessonEndTime)
    } else {
      endTime = new Date(startTime.getTime() + durationMinutes * 60000)
    }

    if (isNaN(endTime.getTime())) {
      console.warn("Invalid endTime from metadata, using startTime + duration", { lessonEndTime, startTime, durationMinutes })
      endTime = new Date(startTime.getTime() + durationMinutes * 60000)
    }

    // Get meeting link from matching availability slot or teacher default link
    const meetingLink = await resolveMeetingLinkForStart(startTime)

    // Create the lesson
    const amount = (session.amount_total ?? 0) / 100
    const platformFee = amount * 0.15
    const teacherEarnings = amount * 0.85


    const lessonResult = await db.rawQuery(
      `INSERT INTO lessons (
        teacher_id, student_id, status, type, start_time, end_time, 
        duration_minutes, payment_id, payment_status, amount, focus, notes, student_timezone, language, meeting_link
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        teacherId,
        userId,
        "scheduled",
        lessonType || "single",
        startTime.toISOString(),
        endTime.toISOString(),
        durationMinutes,
        sessionId,
        "paid",
        amount,
        lessonFocus || null,
        JSON.stringify({
          timezone: userTimezone || null,
          requestedStart: lessonStartTime || null,
          requestedEnd: lessonEndTime || null,
          lessonFocus: lessonFocus || null,
          studentNotes: studentNotes || null,
        }),
        userTimezone || null,
        language || null,
        meetingLink,
      ]
    )
    console.log("[v0] Lesson created:", lessonResult.rows?.[0])

    // Create transaction record
    const existingTransactionResult = await db.rawQuery(
      `SELECT id FROM transactions WHERE payment_id::text = $1::text LIMIT 1`,
      [sessionId],
    )

    if (existingTransactionResult.rows.length === 0) {
      await db.rawQuery(
        `INSERT INTO transactions (
          user_id, teacher_id, amount, platform_fee, teacher_earnings, type, status, payment_id, stripe_payment_intent
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [userId, teacherId, amount, platformFee, teacherEarnings, "lesson", "completed", sessionId, session.payment_intent]
      )
    }

    // Send email notification to teacher
    try {
      const studentInfo = await db.rawQuery(
        `SELECT first_name, last_name, email FROM users WHERE id::text = $1::text`,
        [userId]
      )
      const student = studentInfo.rows[0]

      const teacherInfo = await db.rawQuery(
        `SELECT first_name, last_name, email FROM users WHERE id::text = $1::text`,
        [teacherId]
      )
      const teacher = teacherInfo.rows[0]

      if (teacher?.email) {
        const studentName = `${student?.first_name || ""} ${student?.last_name || ""}`.trim() || "A student"
        const teacherName = `${teacher?.first_name || ""} ${teacher?.last_name || ""}`.trim() || "there"
        const lessonDateTime = new Date(startTime).toLocaleString()

        await sendTeacherLessonBookedEmail(
          teacher.email,
          teacherName,
          studentName,
          lessonDateTime,
          durationMinutes,
          language || "Language lesson"
        )
      }

      // If meeting link is available, send confirmation to student immediately
      if (meetingLink && student?.email) {
        const studentName = `${student?.first_name || ""} ${student?.last_name || ""}`.trim() || "there"
        const teacherName = `${teacher?.first_name || ""} ${teacher?.last_name || ""}`.trim() || "Your teacher"
        const lessonDateTime = new Date(startTime).toLocaleString()

        await sendStudentLessonConfirmedEmail(
          student.email,
          studentName,
          teacherName,
          lessonDateTime,
          durationMinutes,
          language || "Language lesson",
          meetingLink
        )
      }
    } catch (emailError) {
      console.warn("Failed to send email notifications:", emailError)
      // Don't fail the payment verification if email fails
    }

    return NextResponse.json({ 
      success: true, 
      lesson: lessonResult.rows[0] 
    })

  } catch (error) {
    console.error("Error verifying session:", error)
    return NextResponse.json({ 
      error: "Failed to verify session",
      details: String(error)
    }, { status: 500 })
  }
}