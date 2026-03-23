"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Calendar, Clock, Plus, MessageSquare, Star, Video, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { useToast } from "@/hooks/use-toast"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import type { User, Availability, Lesson, CalendarInfo } from "@/types/schedule"
import { USER_LOGIN_ROUTE } from "@/lib/auth-route-config"

const FOCUS_LABELS: Record<string, string> = {
  conversation: "Conversation Practice",
  grammar: "Grammar",
  vocabulary: "Vocabulary Building",
  pronunciation: "Pronunciation",
  reading: "Reading Comprehension",
  writing: "Writing Skills",
  exam: "Exam Preparation",
  business: "Business Language",
}

const formatFocusLabel = (focus: string) => FOCUS_LABELS[focus.toLowerCase()] || focus

interface ParsedLessonNotes {
  studentNotes: string
  lessonFocus: string
  requestedStart: string
  requestedEnd: string
}

const parseLessonNotes = (rawNotes: unknown): ParsedLessonNotes => {
  const emptyResult: ParsedLessonNotes = {
    studentNotes: "",
    lessonFocus: "",
    requestedStart: "",
    requestedEnd: "",
  }

  if (!rawNotes) return emptyResult

  try {
    const parsed = typeof rawNotes === "string" ? JSON.parse(rawNotes) : rawNotes
    if (!parsed || typeof parsed !== "object") return emptyResult

    const notesRecord = parsed as Record<string, unknown>
    return {
      studentNotes: typeof notesRecord.studentNotes === "string" ? notesRecord.studentNotes : "",
      lessonFocus: typeof notesRecord.lessonFocus === "string" ? notesRecord.lessonFocus : "",
      requestedStart: typeof notesRecord.requestedStart === "string" ? notesRecord.requestedStart : "",
      requestedEnd: typeof notesRecord.requestedEnd === "string" ? notesRecord.requestedEnd : "",
    }
  } catch {
    return emptyResult
  }
}

// Helper function to format date in a specific timezone
function formatDateInTimezone(date: Date, timeZone: string): string {
  if (!date || isNaN(date.getTime())) {
    return "Invalid date"
  }

  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date)
}

// Helper function to format date object in a specific timezone
function formatDateObjectInTimezone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

export default function SchedulePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [user, setUser] = useState<User | null>(null)
  const [upcomingLessons, setUpcomingLessons] = useState<Lesson[]>([])
  const [pastLessons, setPastLessons] = useState<Lesson[]>([])
  const [loadingLessons, setLoadingLessons] = useState<boolean>(true)
  const [isTeacher, setIsTeacher] = useState<boolean>(false)
  const [availability, setAvailability] = useState<Availability>({
    monday: { available: false, slots: [] },
    tuesday: { available: false, slots: [] },
    wednesday: { available: false, slots: [] },
    thursday: { available: false, slots: [] },
    friday: { available: false, slots: [] },
    saturday: { available: false, slots: [] },
    sunday: { available: false, slots: [] },
  })
  const [calendarConnected, setCalendarConnected] = useState<boolean>(false)
  const [calendarType, setCalendarType] = useState<string>("")
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [teacherTimezone, setTeacherTimezone] = useState<string>(
    () => typeof window !== "undefined"
      ? localStorage.getItem("teacherTimezone") || Intl.DateTimeFormat().resolvedOptions().timeZone
      : Intl.DateTimeFormat().resolvedOptions().timeZone,
  )
  const [isSavingTimezone, setIsSavingTimezone] = useState(false)
  const [defaultMeetingLink, setDefaultMeetingLink] = useState<string>("")
  const [savedDefaultMeetingLink, setSavedDefaultMeetingLink] = useState<string>("")
  const [isSavingDefaultMeetingLink, setIsSavingDefaultMeetingLink] = useState(false)
  const [meetingLinkDialogOpen, setMeetingLinkDialogOpen] = useState(false)
  const [selectedLessonForMeeting, setSelectedLessonForMeeting] = useState<Lesson | null>(null)
  const [meetingLink, setMeetingLink] = useState("")
  const [isUpdatingMeetingLink, setIsUpdatingMeetingLink] = useState(false)
  const [availabilityMeetingLinkDialogOpen, setAvailabilityMeetingLinkDialogOpen] = useState(false)
  const [selectedSlotForMeetingLink, setSelectedSlotForMeetingLink] = useState<{day: string, slotId: string} | null>(null)
  const [slotMeetingLink, setSlotMeetingLink] = useState("")
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false)
  const [selectedLessonForReschedule, setSelectedLessonForReschedule] = useState<Lesson | null>(null)
  const [rescheduleStart, setRescheduleStart] = useState("")
  const [rescheduleEnd, setRescheduleEnd] = useState("")
  const [isRescheduling, setIsRescheduling] = useState(false)
  const [acceptingLessonId, setAcceptingLessonId] = useState<string | number | null>(null)
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false)
  const [selectedLessonForDecline, setSelectedLessonForDecline] = useState<Lesson | null>(null)
  const [declineNote, setDeclineNote] = useState("")
  const [isDeclining, setIsDeclining] = useState(false)
  const [lessonRequestDialogOpen, setLessonRequestDialogOpen] = useState(false)
  const [selectedLessonRequest, setSelectedLessonRequest] = useState<Lesson | null>(null)

  const resolveUserId = (userData: User | null): string | number | null => {
    if (!userData) return null
    const maybeUser = userData as User & { userId?: string | number }
    return maybeUser.id ?? maybeUser.userId ?? null
  }

  const getStoredAuthToken = () => {
    if (typeof window === "undefined") return null

    const directToken = localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token")
    if (directToken) return directToken

    const storedUser = localStorage.getItem("linguaConnectUser")
    if (!storedUser) return null

    try {
      const parsedUser = JSON.parse(storedUser) as { token?: string }
      return parsedUser.token || null
    } catch (error) {
      return null
    }
  }

  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem("linguaConnectUser")
    if (!storedUser) {
      router.push(USER_LOGIN_ROUTE)
      return
    }

    try {
      const userData = JSON.parse(storedUser) as User
      const resolvedUserId = resolveUserId(userData)
      if (!resolvedUserId) {
        router.push(USER_LOGIN_ROUTE)
        return
      }

      setUser(userData)
      setIsTeacher(userData.role === "teacher")

      // Backfill auth token for sessions created before token persistence was added.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const maybeToken = (userData as any)?.token
      if (maybeToken && !localStorage.getItem("auth_token")) {
        localStorage.setItem("auth_token", maybeToken)
      }

      // Fetch data
      fetchLessons(resolvedUserId, userData.role)
      if (userData.role === "teacher") {
        fetchAvailability(resolvedUserId)
        fetchTeacherProfile(resolvedUserId)
      }
    } catch (error) {
      console.error("Error parsing user data:", error)
      router.push(USER_LOGIN_ROUTE)
    }
  }, [router])

  const fetchLessons = async (userId: string | number, userRole: string) => {
    setLoadingLessons(true)
    try {
      // Fetch upcoming lessons from API
      const upcomingResponse = await fetch(
        `/api/lessons?userId=${userId}&role=${userRole}&status=upcoming`,
        { cache: "no-store" },
      )
      
      // Fetch past lessons from API
      const pastResponse = await fetch(
        `/api/lessons?userId=${userId}&role=${userRole}&status=past`,
        { cache: "no-store" },
      )

      if (upcomingResponse.ok) {
        const upcomingData = await upcomingResponse.json()
        // Transform the data to match the expected format
        const transformedUpcoming = upcomingData.map((lesson: any) => {
          const parsedNotes = parseLessonNotes(lesson.notes)

          return {
            id: lesson.id || lesson.lesson_id || lesson.lessonId || null,
            teacherId: lesson.teacher_id,
            studentId: lesson.student_id,
            teacherName: lesson.teacher_first_name
              ? `${lesson.teacher_first_name} ${lesson.teacher_last_name || ''}`.trim()
              : 'Teacher',
            studentName: lesson.student_first_name
              ? `${lesson.student_first_name} ${lesson.student_last_name || ''}`.trim()
              : 'Student',
            teacherAvatar: lesson.teacher_image || '/placeholder.svg',
            studentAvatar: lesson.student_image || '/placeholder.svg',
            date: lesson.start_time,
            startTime: lesson.start_time,
            endTime: lesson.end_time,
            status: String(lesson.status || '').toLowerCase() === 'scheduled' ? 'confirmed' : String(lesson.status || '').toLowerCase(),
            language: lesson.type || 'Language Lesson',
            topic: `${lesson.duration_minutes || 60} minute ${lesson.type || 'lesson'}`,
            meetingLink: lesson.meeting_link || lesson.meetingLink || null,
            studentTimezone: lesson.student_timezone,
            focus: lesson.focus || parsedNotes.lessonFocus || "",
            studentNotes: parsedNotes.studentNotes || "",
            requestedStart: parsedNotes.requestedStart || "",
            requestedEnd: parsedNotes.requestedEnd || "",
          }
        })
        setUpcomingLessons(transformedUpcoming)
      }

      if (pastResponse.ok) {
        const pastData = await pastResponse.json()
        const transformedPast = pastData.map((lesson: any) => {
          const parsedNotes = parseLessonNotes(lesson.notes)

          return {
          id: lesson.id || lesson.lesson_id || lesson.lessonId || null,
          teacherId: lesson.teacher_id,
          studentId: lesson.student_id,
          teacherName: lesson.teacher_first_name 
            ? `${lesson.teacher_first_name} ${lesson.teacher_last_name || ''}`.trim()
            : 'Teacher',
          studentName: lesson.student_first_name
            ? `${lesson.student_first_name} ${lesson.student_last_name || ''}`.trim()
            : 'Student',
          teacherAvatar: lesson.teacher_image || '/placeholder.svg',
          studentAvatar: lesson.student_image || '/placeholder.svg',
          date: lesson.start_time,
          startTime: lesson.start_time,
          endTime: lesson.end_time,
          status: String(lesson.status || '').toLowerCase(),
          language: lesson.type || 'Language Lesson',
          topic: `${lesson.duration_minutes || 60} minute ${lesson.type || 'lesson'}`,
          focus: lesson.focus || parsedNotes.lessonFocus || "",
          studentNotes: parsedNotes.studentNotes || "",
          requestedStart: parsedNotes.requestedStart || "",
          requestedEnd: parsedNotes.requestedEnd || "",
          }
        })
        setPastLessons(transformedPast)
      }
    } catch (error) {
      console.error("Error fetching lessons:", error)
      toast({
        title: "Error",
        description: "Failed to load your lessons. Please try again later.",
        variant: "destructive",
      })
      setUpcomingLessons([])
      setPastLessons([])
    } finally {
      setLoadingLessons(false)
    }
  }

  const fetchAvailability = async (teacherId: string | number) => {
    try {
      // First try to fetch from API (database)
      const token = getStoredAuthToken()
      const headers: Record<string, string> = {}
      if (token) {
        headers.Authorization = `Bearer ${token}`
      }

      const response = await fetch(`/api/teachers/availability?teacherId=${teacherId}`, {
        credentials: "include",
        headers,
      })
      
      if (response.ok) {
        const data = await response.json()
        
        if (data.availability && Array.isArray(data.availability) && data.availability.length > 0) {
          // Transform from API format [{ day: "Monday", slots: ["9:00 - 10:00"] }]
          // to component format { monday: { available: true, slots: [{start, end, id}] } }
          const transformedAvailability: Availability = {
            monday: { available: false, slots: [] },
            tuesday: { available: false, slots: [] },
            wednesday: { available: false, slots: [] },
            thursday: { available: false, slots: [] },
            friday: { available: false, slots: [] },
            saturday: { available: false, slots: [] },
            sunday: { available: false, slots: [] },
          }
          
          data.availability.forEach((item: { day: string; slots: any[] }) => {
            const dayKey = item.day.toLowerCase() as keyof Availability
            if (transformedAvailability[dayKey]) {
              transformedAvailability[dayKey] = {
                available: true,
                slots: item.slots.map((slot: any, index: number) => {
                  if (typeof slot === "string") {
                    const [start, end] = slot.split(" - ")
                    return { start: start.trim(), end: end.trim(), id: `${dayKey}-${index}` }
                  }

                  // Support storing meeting links directly in the slot object
                  const start = slot.start || ""
                  const end = slot.end || ""
                  return {
                    start: start.trim(),
                    end: end.trim(),
                    meetingLink: slot.meetingLink || "",
                    id: `${dayKey}-${index}`,
                  }
                })
              }
            }
          })
          
          setAvailability(transformedAvailability)
          // Also cache in localStorage
          localStorage.setItem(`teacherAvailability_${teacherId}`, JSON.stringify(transformedAvailability))
        } else {
          // Fall back to localStorage if API returns empty
          const storedAvailability = localStorage.getItem(`teacherAvailability_${teacherId}`)
          if (storedAvailability) {
            setAvailability(JSON.parse(storedAvailability) as Availability)
          }
        }
      } else {
        // Fall back to localStorage if API fails
        const storedAvailability = localStorage.getItem(`teacherAvailability_${teacherId}`)
        if (storedAvailability) {
          setAvailability(JSON.parse(storedAvailability) as Availability)
        }
      }

      // Check if calendar is connected
      const storedCalendarInfo = localStorage.getItem(`teacherCalendar_${teacherId}`)
      if (storedCalendarInfo) {
        const calendarInfo = JSON.parse(storedCalendarInfo) as CalendarInfo
        setCalendarConnected(true)
        setCalendarType(calendarInfo.type)
      }
    } catch (error) {
      console.error("Error fetching availability:", error)
      // Fall back to localStorage on error
      const storedAvailability = localStorage.getItem(`teacherAvailability_${teacherId}`)
      if (storedAvailability) {
        setAvailability(JSON.parse(storedAvailability) as Availability)
      }
    }
  }

  const fetchTeacherProfile = async (teacherId: string | number) => {
    try {
      const res = await fetch(`/api/teachers/${teacherId}`, {
        credentials: "include",
      })
      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}))
        console.warn("Teacher profile fetch failed:", errorBody)
        return
      }
      const data = await res.json()
      setDefaultMeetingLink(data.defaultMeetingLink || "")
      setSavedDefaultMeetingLink(data.defaultMeetingLink || "")
      if (data.timezone) {
        setTeacherTimezone(data.timezone)
        localStorage.setItem("teacherTimezone", data.timezone)
      }
    } catch (error) {
      console.error("Error fetching teacher profile:", error)
    }
  }

  const handleSaveDefaultMeetingLink = async () => {
    const resolvedUserId = resolveUserId(user)
    if (!resolvedUserId) {
      toast({
        title: "Error",
        description: "User information is missing.",
        variant: "destructive",
      })
      return
    }

    setIsSavingDefaultMeetingLink(true)
    try {
      const token = getStoredAuthToken()
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      if (token) {
        headers.Authorization = `Bearer ${token}`
      }

      const res = await fetch(`/api/users`, {
        method: "PUT",
        credentials: "include",
        headers,
        body: JSON.stringify({ id: resolvedUserId, defaultMeetingLink }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Failed to save default meeting link" }))
        throw new Error(err.error || err.message || "Failed to save default meeting link")
      }

      toast({
        title: "Saved",
        description: "Your default meeting link has been updated.",
      })
      setSavedDefaultMeetingLink(defaultMeetingLink)
    } catch (error) {
      console.error("Error saving default meeting link:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save meeting link.",
        variant: "destructive",
      })
    } finally {
      setIsSavingDefaultMeetingLink(false)
    }
  }

  const handleSaveTimezone = async () => {
    const resolvedUserId = resolveUserId(user)
    if (!resolvedUserId) {
      toast({
        title: "Error",
        description: "User information is missing.",
        variant: "destructive",
      })
      return
    }

    setIsSavingTimezone(true)
    try {
      const token = getStoredAuthToken()
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      if (token) {
        headers.Authorization = `Bearer ${token}`
      }

      const res = await fetch(`/api/users`, {
        method: "PUT",
        credentials: "include",
        headers,
        body: JSON.stringify({ id: resolvedUserId, timezone: teacherTimezone }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Failed to save timezone" }))
        throw new Error(err.message || "Failed to save timezone")
      }

      // Save to localStorage
      localStorage.setItem("teacherTimezone", teacherTimezone)

      toast({
        title: "Saved",
        description: "Your timezone has been updated.",
      })
    } catch (error) {
      console.error("Error saving timezone:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save timezone.",
        variant: "destructive",
      })
    } finally {
      setIsSavingTimezone(false)
    }
  }


  const saveAvailability = async (availabilityToSave: Availability) => {
    const resolvedUserId = resolveUserId(user)
    if (!resolvedUserId) {
      toast({
        title: "Error",
        description: "User information is missing.",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      // Transform availability to the format expected by the backend
      // We store time slots as strings unless a meeting link is present, in which case we store an object.
      const availabilityArray = Object.entries(availabilityToSave)
        .filter(([_, value]) => value.available && value.slots.length > 0)
        .map(([day, value]) => ({
          day: day.charAt(0).toUpperCase() + day.slice(1), // Capitalize day name
          slots: value.slots.map((slot) => {
            if (slot.meetingLink) {
              return {
                start: slot.start,
                end: slot.end,
                meetingLink: slot.meetingLink,
              }
            }
            return `${slot.start} - ${slot.end}`
          }),
        }))

      // Save to database via API
      const token = getStoredAuthToken()
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      if (token) {
        headers.Authorization = `Bearer ${token}`
      }

      const response = await fetch("/api/teachers/availability", {
        method: "PUT",
        credentials: "include",
        headers,
        body: JSON.stringify({
          teacherId: resolvedUserId,
          availability: availabilityArray,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        const message = errorData?.error || errorData?.message || "Failed to save availability"
        throw new Error(message)
      }

      // Also save to localStorage for local state
      localStorage.setItem(`teacherAvailability_${resolvedUserId}`, JSON.stringify(availabilityToSave))
      setAvailability(availabilityToSave)

      toast({
        title: "Success",
        description: "Your availability has been updated and is now visible to students.",
      })
    } catch (error) {
      console.error("Error saving availability:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save your availability settings.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveAvailability = async () => {
    await saveAvailability(availability)
  }

  const handleToggleDay = (day: string) => {
    setAvailability((prev) => {
      const current = prev[day as keyof Availability]
      const isNowAvailable = !current.available

      return {
        ...prev,
        [day]: {
          available: isNowAvailable,
          slots: isNowAvailable ? current.slots : [],
        },
      }
    })
  }

  const handleAddTimeSlot = (day: string) => {
    setAvailability((prev) => {
      const current = prev[day as keyof Availability]
      const newSlot = {
        id: `${day}-${Date.now()}`,
        start: "09:00",
        end: "10:00",
      }

      return {
        ...prev,
        [day]: {
          available: true,
          slots: [...current.slots, newSlot],
        },
      }
    })
  }

  const handleUpdateTimeSlot = (
    day: string,
    slotId: string,
    field: "start" | "end",
    value: string,
  ) => {
    setAvailability((prev) => {
      const current = prev[day as keyof Availability]
      return {
        ...prev,
        [day]: {
          ...current,
          slots: current.slots.map((slot) =>
            slot.id === slotId ? { ...slot, [field]: value } : slot,
          ),
        },
      }
    })
  }

  const handleRemoveTimeSlot = (day: string, slotId: string) => {
    setAvailability((prev) => {
      const current = prev[day as keyof Availability]
      return {
        ...prev,
        [day]: {
          ...current,
          slots: current.slots.filter((slot) => slot.id !== slotId),
        },
      }
    })
  }

  const handleConnectCalendar = (calendarType: string) => {
    if (!user) {
      toast({
        title: "Error",
        description: "User information is missing.",
        variant: "destructive",
      })
      return
    }

    // In a real app, this would redirect to OAuth flow
    // For now, we'll simulate connecting
    try {
      localStorage.setItem(
        `teacherCalendar_${user.id}`,
        JSON.stringify({
          type: calendarType,
          connected: true,
          lastSync: new Date().toISOString(),
        }),
      )

      setCalendarConnected(true)
      setCalendarType(calendarType)

      toast({
        title: "Calendar Connected",
        description: `Your ${calendarType} calendar has been connected successfully.`,
      })
    } catch (error) {
      console.error("Error connecting calendar:", error)
      toast({
        title: "Error",
        description: "Failed to connect your calendar.",
        variant: "destructive",
      })
    }
  }

  const handleDisconnectCalendar = () => {
    if (!user) {
      toast({
        title: "Error",
        description: "User information is missing.",
        variant: "destructive",
      })
      return
    }

    try {
      localStorage.removeItem(`teacherCalendar_${user.id}`)

      setCalendarConnected(false)
      setCalendarType("")

      toast({
        title: "Calendar Disconnected",
        description: "Your calendar has been disconnected.",
      })
    } catch (error) {
      console.error("Error disconnecting calendar:", error)
      toast({
        title: "Error",
        description: "Failed to disconnect your calendar.",
        variant: "destructive",
      })
    }
  }

  const toLocalInputValue = (isoString: string) => {
    const d = new Date(isoString)
    if (isNaN(d.getTime())) return ""
    const pad = (n: number) => String(n).padStart(2, "0")
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  const formatLessonDate = (value: string) => {
    const date = new Date(value)
    if (isNaN(date.getTime())) return "Date unavailable"
    return format(date, "EEEE, MMMM d, yyyy")
  }

  const formatLessonTimeRange = (start: string, end: string, timezone?: string) => {
    const startDate = new Date(start)
    const endDate = new Date(end)
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return "Time unavailable"

    const useTimezone = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
    const options: Intl.DateTimeFormatOptions = {
      timeZone: useTimezone,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }

    return `${new Intl.DateTimeFormat("en-US", options).format(startDate)} - ${new Intl.DateTimeFormat("en-US", options).format(endDate)}`
  }

  const openRescheduleDialog = (lesson: Lesson) => {
    setSelectedLessonForReschedule(lesson)
    setRescheduleStart(toLocalInputValue(lesson.startTime))
    setRescheduleEnd(toLocalInputValue(lesson.endTime))
    setRescheduleDialogOpen(true)
  }

  const handleRescheduleLesson = async () => {
    if (!selectedLessonForReschedule || !rescheduleStart || !rescheduleEnd) {
      toast({
        title: "Missing information",
        description: "Please choose a valid new start and end time.",
        variant: "destructive",
      })
      return
    }

    if (!selectedLessonForReschedule.id) {
      toast({
        title: "Error",
        description: "Lesson ID is missing. Please refresh and try again.",
        variant: "destructive",
      })
      return
    }

    setIsRescheduling(true)
    try {
      const token = getStoredAuthToken()
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      const resolvedUserId = resolveUserId(user)
      if (resolvedUserId) {
        headers["x-user-id"] = String(resolvedUserId)
      }
      if (user?.role) {
        headers["x-user-role"] = String(user.role)
      }
      if (token) {
        headers.Authorization = `Bearer ${token}`
      }

      const response = await fetch(`/api/lessons/${selectedLessonForReschedule.id}`, {
        method: "PATCH",
        credentials: "include",
        headers,
        body: JSON.stringify({
          action: "reschedule",
          startTime: new Date(rescheduleStart).toISOString(),
          endTime: new Date(rescheduleEnd).toISOString(),
        }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error || data.message || "Failed to reschedule lesson")
      }

      setUpcomingLessons((prev) =>
        prev.map((lesson) =>
          lesson.id === selectedLessonForReschedule.id
            ? {
                ...lesson,
                date: data.startTime || new Date(rescheduleStart).toISOString(),
                startTime: data.startTime || new Date(rescheduleStart).toISOString(),
                endTime: data.endTime || new Date(rescheduleEnd).toISOString(),
                status: "pending",
              }
            : lesson,
        ),
      )

      toast({
        title: "Lesson rescheduled",
        description: "The other participant has been notified by email.",
      })

      setRescheduleDialogOpen(false)
      setSelectedLessonForReschedule(null)
      setRescheduleStart("")
      setRescheduleEnd("")
    } catch (error) {
      console.error("Error rescheduling lesson:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reschedule lesson.",
        variant: "destructive",
      })
    } finally {
      setIsRescheduling(false)
    }
  }

  const handleCancelLesson = async (lessonId: string | number) => {
    if (!lessonId) {
      toast({
        title: "Error",
        description: "Lesson ID is missing. Please refresh and try again.",
        variant: "destructive",
      })
      return
    }

    try {
      const token = getStoredAuthToken()
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      const resolvedUserId = resolveUserId(user)
      if (resolvedUserId) {
        headers["x-user-id"] = String(resolvedUserId)
      }
      if (user?.role) {
        headers["x-user-role"] = String(user.role)
      }
      if (token) {
        headers.Authorization = `Bearer ${token}`
      }

      const response = await fetch(`/api/lessons/${lessonId}`, {
        method: "PATCH",
        credentials: "include",
        headers,
        body: JSON.stringify({ action: "cancel" }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error || data.message || "Failed to cancel lesson")
      }

      // Update the UI
      setUpcomingLessons(
        upcomingLessons.map((lesson) => (lesson.id === lessonId ? { ...lesson, status: "canceled" } : lesson)),
      )

      toast({
        title: "Lesson canceled",
        description: "The other participant has been notified by email.",
      })
    } catch (error) {
      console.error("Error canceling lesson:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to cancel lesson. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleAcceptPendingLesson = async (lessonId: string | number) => {
    if (!lessonId) {
      toast({
        title: "Error",
        description: "Lesson ID is missing. Please refresh and try again.",
        variant: "destructive",
      })
      return
    }

    setAcceptingLessonId(lessonId)
    try {
      const token = getStoredAuthToken()
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      const resolvedUserId = resolveUserId(user)
      if (resolvedUserId) {
        headers["x-user-id"] = String(resolvedUserId)
      }
      if (user?.role) {
        headers["x-user-role"] = String(user.role)
      }
      if (token) {
        headers.Authorization = `Bearer ${token}`
      }

      const lesson = upcomingLessons.find((item) => String(item.id) === String(lessonId))

      const response = await fetch(`/api/lessons/${lessonId}`, {
        method: "PATCH",
        credentials: "include",
        headers,
        body: JSON.stringify({ action: "accept", meetingLink: lesson?.meetingLink || undefined }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        const details = data.error || data.message || response.statusText || "Failed to accept lesson"
        throw new Error(`${details} (HTTP ${response.status})`)
      }

      setUpcomingLessons((prev) =>
        prev.map((item) =>
          String(item.id) === String(lessonId)
            ? {
                ...item,
                status: "confirmed",
                meetingLink: data.meetingLink || item.meetingLink,
              }
            : item,
        ),
      )

      toast({
        title: "Lesson accepted",
        description: "The rescheduled lesson is now confirmed.",
      })
    } catch (error) {
      console.error("Error accepting lesson:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to accept lesson.",
        variant: "destructive",
      })
    } finally {
      setAcceptingLessonId(null)
    }
  }

  const openDeclineDialog = (lesson: Lesson) => {
    setSelectedLessonForDecline(lesson)
    setDeclineNote("")
    setDeclineDialogOpen(true)
  }

  const openLessonRequestDialog = (lesson: Lesson) => {
    setSelectedLessonRequest(lesson)
    setLessonRequestDialogOpen(true)
  }

  const handleDeclinePendingLesson = async () => {
    if (!selectedLessonForDecline?.id) {
      toast({
        title: "Error",
        description: "Lesson ID is missing. Please refresh and try again.",
        variant: "destructive",
      })
      return
    }

    setIsDeclining(true)
    try {
      const token = getStoredAuthToken()
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      const resolvedUserId = resolveUserId(user)
      if (resolvedUserId) {
        headers["x-user-id"] = String(resolvedUserId)
      }
      if (user?.role) {
        headers["x-user-role"] = String(user.role)
      }
      if (token) {
        headers.Authorization = `Bearer ${token}`
      }

      const response = await fetch(`/api/lessons/${selectedLessonForDecline.id}/decline`, {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify({ note: declineNote.trim() }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error || data.message || "Failed to decline lesson")
      }

      setUpcomingLessons((prev) =>
        prev.map((item) =>
          String(item.id) === String(selectedLessonForDecline.id)
            ? { ...item, status: "declined" as any }
            : item,
        ),
      )

      toast({
        title: "Lesson declined",
        description: declineNote.trim() ? "Decline note saved." : "Reschedule request declined.",
      })

      setDeclineDialogOpen(false)
      setSelectedLessonForDecline(null)
      setDeclineNote("")
    } catch (error) {
      console.error("Error declining lesson:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to decline lesson.",
        variant: "destructive",
      })
    } finally {
      setIsDeclining(false)
    }
  }

  const handleAddMeetingLink = async () => {
    if (!selectedLessonForMeeting || !meetingLink.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid meeting link.",
        variant: "destructive",
      })
      return
    }

    setIsUpdatingMeetingLink(true)
    try {
      const token = getStoredAuthToken()
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      }
      if (token) {
        headers.Authorization = `Bearer ${token}`
      }

      const response = await fetch(`/api/lessons/${selectedLessonForMeeting.id}`, {
        method: "PATCH",
        credentials: "include",
        headers,
        body: JSON.stringify({ meetingLink: meetingLink.trim() }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error || error.message || "Failed to add meeting link")
      }

      // Update the lesson in the UI
      setUpcomingLessons(
        upcomingLessons.map((lesson) =>
          lesson.id === selectedLessonForMeeting.id
            ? { ...lesson, meetingLink: meetingLink.trim(), status: "confirmed" }
            : lesson
        ),
      )

      toast({
        title: "Meeting link added",
        description: "The meeting link has been added and the student has been notified.",
      })

      setMeetingLinkDialogOpen(false)
      setMeetingLink("")
      setSelectedLessonForMeeting(null)
    } catch (error) {
      console.error("Error adding meeting link:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add meeting link. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUpdatingMeetingLink(false)
    }
  }

  const openMeetingLinkDialog = (lesson: Lesson) => {
    setSelectedLessonForMeeting(lesson)
    setMeetingLink(lesson.meetingLink || "")
    setMeetingLinkDialogOpen(true)
  }

  const handleAddMeetingLinkToSlot = (day: string, slotId: string) => {
    setSelectedSlotForMeetingLink({ day, slotId })

    const daySlots = availability[day as keyof Availability]?.slots || []
    const slot = daySlots.find((s) => s.id === slotId)

    setSlotMeetingLink(slot?.meetingLink || "")
    setAvailabilityMeetingLinkDialogOpen(true)
  }

  const handleSaveSlotMeetingLink = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "User information is missing.",
        variant: "destructive",
      })
      return
    }

    if (!selectedSlotForMeetingLink) {
      toast({
        title: "Error",
        description: "No time slot selected.",
        variant: "destructive",
      })
      return
    }

    if (!slotMeetingLink.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid meeting link.",
        variant: "destructive",
      })
      return
    }

    const newAvailability = {
      ...availability,
      [selectedSlotForMeetingLink.day]: {
        ...availability[selectedSlotForMeetingLink.day],
        slots: availability[selectedSlotForMeetingLink.day].slots.map((slot) =>
          slot.id === selectedSlotForMeetingLink.slotId
            ? { ...slot, meetingLink: slotMeetingLink.trim() }
            : slot,
        ),
      },
    }

    setAvailability(newAvailability)
    setAvailabilityMeetingLinkDialogOpen(false)
    setSlotMeetingLink("")
    setSelectedSlotForMeetingLink(null)

    // Persist the updated availability (including meeting links)
    await saveAvailability(newAvailability)
  }

  const isLoading = loadingLessons
  const pendingLessons = isTeacher
    ? upcomingLessons.filter((lesson) => String(lesson.status || "").toLowerCase() === "pending")
    : []

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 px-4 md:px-6">
        <div className="flex flex-col space-y-6">
          <div className="flex flex-col space-y-2">
            <div className="h-8 w-48 bg-muted rounded animate-pulse"></div>
            <div className="h-4 w-96 bg-muted rounded animate-pulse"></div>
          </div>

          <div className="h-12 w-full bg-muted rounded animate-pulse"></div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-muted rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <div className="flex flex-col space-y-6">
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Schedule</h1>
          <p className="text-muted-foreground">
            {isTeacher
              ? "Manage your teaching schedule and availability."
              : "Manage your upcoming lessons and book new sessions with your teachers."}
          </p>
        </div>

        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className={`grid w-full md:w-auto ${isTeacher ? "grid-cols-4" : "grid-cols-3"}`}>
            <TabsTrigger value="upcoming">Upcoming Lessons</TabsTrigger>
            {isTeacher ? (
              <TabsTrigger value="pending">Pending Requests</TabsTrigger>
            ) : null}
            {isTeacher ? (
              <TabsTrigger value="availability">Manage Availability</TabsTrigger>
            ) : (
              <TabsTrigger value="book">Book New Lesson</TabsTrigger>
            )}
            <TabsTrigger value="past">Past Lessons</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="mt-6">
            {upcomingLessons.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {upcomingLessons.map((lesson) => (
                  <Card key={lesson.id} className={(lesson.status === "canceled" || lesson.status === "cancelled" || lesson.status === "declined") ? "opacity-60" : ""}>
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center space-x-3">
                          <Avatar>
                            <AvatarImage
                              src={isTeacher ? lesson.studentAvatar : lesson.teacherAvatar || "/placeholder.svg"}
                              alt={isTeacher ? lesson.studentName : lesson.teacherName}
                            />
                            <AvatarFallback>
                              {(isTeacher ? lesson.studentName : lesson.teacherName)?.charAt(0) || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <CardTitle className="text-lg">
                              {isTeacher ? lesson.studentName : lesson.teacherName}
                            </CardTitle>
                            <CardDescription>{lesson.language}</CardDescription>
                          </div>
                        </div>
                        <Badge
                          variant={
                            (lesson.status === "confirmed" || lesson.status === "scheduled")
                              ? "default"
                              : lesson.status === "pending"
                                ? "outline"
                                : "destructive"
                          }
                        >
                          {(lesson.status === "cancelled" ? "Canceled" : lesson.status?.charAt(0).toUpperCase() + lesson.status?.slice(1)) || "Unknown"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center text-sm">
                          <Calendar className="mr-2 h-4 w-4 opacity-70" />
                          <span>{formatLessonDate(lesson.startTime || lesson.date)}</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <Clock className="mr-2 h-4 w-4 opacity-70" />
                          <span>
                            {isTeacher && lesson.studentTimezone
                              ? formatLessonTimeRange(lesson.startTime, lesson.endTime, teacherTimezone)
                              : formatLessonTimeRange(lesson.startTime, lesson.endTime)
                            }
                          </span>
                        </div>
                        {isTeacher && lesson.studentTimezone && (
                          <div className="text-xs text-muted-foreground">
                            Student booked in: {lesson.studentTimezone.replace('_', ' ')}
                          </div>
                        )}
                        <p className="text-sm mt-2">{lesson.topic}</p>
                      </div>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-2 pt-3">
                      {isTeacher && (
                        <div className="w-full">
                          {lesson.meetingLink ? (
                            <div className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded-md">
                              <div className="flex items-center text-sm text-green-700">
                                <Video className="mr-2 h-4 w-4" />
                                Meeting link added
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openMeetingLinkDialog(lesson)}
                              >
                                Update
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="default"
                              size="sm"
                              className="w-full bg-orange-600 hover:bg-orange-700"
                              onClick={() => openMeetingLinkDialog(lesson)}
                            >
                              <Video className="mr-2 h-4 w-4" />
                              Add Meeting Link
                            </Button>
                          )}
                        </div>
                      )}
                      <div className="w-full flex flex-wrap gap-2">
                        {isTeacher ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 min-w-[130px]"
                            onClick={() => openLessonRequestDialog(lesson)}
                          >
                            View Request
                          </Button>
                        ) : null}
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 min-w-[130px]"
                          onClick={() =>
                            router.push(
                              `/dashboard/messages?lessonId=${lesson.id}`,
                            )
                          }
                        >
                          <MessageSquare className="mr-2 h-4 w-4" />
                          Message
                        </Button>

                        {lesson.status !== "canceled" && lesson.status !== "cancelled" && lesson.status !== "declined" && (
                          <>
                            {isTeacher && lesson.status === "pending" ? (
                              <Button
                                variant="default"
                                size="sm"
                                className="flex-1 min-w-[130px] bg-emerald-600 hover:bg-emerald-700"
                                onClick={() => handleAcceptPendingLesson(lesson.id)}
                                disabled={acceptingLessonId === lesson.id}
                              >
                                <Check className="mr-2 h-4 w-4" />
                                {acceptingLessonId === lesson.id ? "Accepting..." : "Accept"}
                              </Button>
                            ) : null}
                            {isTeacher && lesson.status === "pending" ? (
                              <Button
                                variant="destructive"
                                size="sm"
                                className="flex-1 min-w-[130px]"
                                onClick={() => openDeclineDialog(lesson)}
                              >
                                Decline
                              </Button>
                            ) : null}
                            {lesson.meetingLink ? (
                              <Button variant="default" size="sm" className="flex-1 min-w-[130px]" asChild>
                                <a href={lesson.meetingLink} target="_blank" rel="noopener noreferrer">
                                  <Video className="mr-2 h-4 w-4" />
                                  Join Class
                                </a>
                              </Button>
                            ) : null}
                            {!(isTeacher && lesson.status === "pending") && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex-1 min-w-[130px]"
                                  onClick={() => openRescheduleDialog(lesson)}
                                >
                                  Reschedule
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="flex-1 min-w-[130px]"
                                  onClick={() => handleCancelLesson(lesson.id)}
                                >
                                  Cancel
                                </Button>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No upcoming lessons</h3>
                <p className="text-muted-foreground mt-2 mb-6">
                  {isTeacher
                    ? "You don't have any lessons scheduled with students yet."
                    : "You don't have any lessons scheduled. Book a lesson to get started."}
                </p>
                {!isTeacher && (
                  <Button
                    onClick={() => {
                      const bookTab = document.querySelector('[data-value="book"]')
                      if (bookTab) {
                        ;(bookTab as HTMLElement).click()
                      }
                    }}
                  >
                    Book Your First Lesson
                  </Button>
                )}
              </div>
            )}
          </TabsContent>

          {isTeacher ? (
            <TabsContent value="pending" className="mt-6">
              {pendingLessons.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {pendingLessons.map((lesson) => (
                    <Card key={lesson.id}>
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center space-x-3">
                            <Avatar>
                              <AvatarImage src={lesson.studentAvatar || "/placeholder.svg"} alt={lesson.studentName} />
                              <AvatarFallback>{lesson.studentName?.charAt(0) || "U"}</AvatarFallback>
                            </Avatar>
                            <div>
                              <CardTitle className="text-lg">{lesson.studentName}</CardTitle>
                              <CardDescription>{lesson.language}</CardDescription>
                            </div>
                          </div>
                          <Badge variant="outline">Pending</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex items-center text-sm">
                            <Calendar className="mr-2 h-4 w-4 opacity-70" />
                            <span>{formatLessonDate(lesson.startTime || lesson.date)}</span>
                          </div>
                          <div className="flex items-center text-sm">
                            <Clock className="mr-2 h-4 w-4 opacity-70" />
                            <span>{formatLessonTimeRange(lesson.startTime, lesson.endTime, teacherTimezone)}</span>
                          </div>
                          {lesson.studentTimezone && (
                            <div className="text-xs text-muted-foreground">
                              Student booked in: {lesson.studentTimezone.replace('_', ' ')}
                            </div>
                          )}
                          <p className="text-sm mt-2">{lesson.topic}</p>
                        </div>
                      </CardContent>
                      <CardFooter className="w-full flex flex-wrap gap-2 pt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 min-w-[130px]"
                          onClick={() => openLessonRequestDialog(lesson)}
                        >
                          View Request
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 min-w-[130px]"
                          onClick={() => router.push(`/dashboard/messages?lessonId=${lesson.id}`)}
                        >
                          <MessageSquare className="mr-2 h-4 w-4" />
                          Message
                        </Button>
                        {lesson.meetingLink ? (
                          <Button variant="default" size="sm" className="flex-1 min-w-[130px]" asChild>
                            <a href={lesson.meetingLink} target="_blank" rel="noopener noreferrer">
                              <Video className="mr-2 h-4 w-4" />
                              Join Class
                            </a>
                          </Button>
                        ) : null}
                        <Button
                          variant="default"
                          size="sm"
                          className="flex-1 min-w-[130px] bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => handleAcceptPendingLesson(lesson.id)}
                          disabled={acceptingLessonId === lesson.id}
                        >
                          <Check className="mr-2 h-4 w-4" />
                          {acceptingLessonId === lesson.id ? "Accepting..." : "Accept"}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="flex-1 min-w-[130px]"
                          onClick={() => openDeclineDialog(lesson)}
                        >
                          Decline
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No pending requests</h3>
                  <p className="text-muted-foreground mt-2">Reschedule requests from students will appear here.</p>
                </div>
              )}
            </TabsContent>
          ) : null}

          {isTeacher ? (
            <TabsContent value="availability" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Manage Your Availability</CardTitle>
                  <CardDescription>
                    Set your weekly teaching schedule and connect your calendar to automatically sync your availability.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Default Meeting Link</h3>
                    <p className="text-sm text-muted-foreground">
                      Set a default meeting link so students automatically receive it when they book a lesson.
                    </p>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                      <div className="flex-1">
                        <Label htmlFor="default-meeting-link">Meeting Link</Label>
                        <Input
                          id="default-meeting-link"
                          type="url"
                          placeholder="https://zoom.us/j/123456789"
                          value={defaultMeetingLink}
                          onChange={(e) => setDefaultMeetingLink(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <Button onClick={handleSaveDefaultMeetingLink} disabled={isSavingDefaultMeetingLink}>
                        {isSavingDefaultMeetingLink ? "Saving..." : "Save Link"}
                      </Button>
                    </div>
                    {savedDefaultMeetingLink.trim() && (
                      <p className="text-xs text-emerald-700">
                        Saved link: {" "}
                        <a
                          href={savedDefaultMeetingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline break-all"
                        >
                          {savedDefaultMeetingLink}
                        </a>
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      This link will be used for new lessons unless you add a specific link for the time slot.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">Calendar Integration</h3>
                      {calendarConnected ? (
                        <Badge variant="outline" className="ml-2">
                          Connected to {calendarType}
                        </Badge>
                      ) : null}
                    </div>

                    {calendarConnected ? (
                      <div className="flex flex-col space-y-4">
                        <p className="text-sm text-muted-foreground">
                          Your {calendarType} calendar is connected. Your availability will be automatically updated
                          based on your calendar events.
                        </p>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              toast({
                                title: "Calendar Synced",
                                description: "Your availability has been updated based on your calendar.",
                              })
                            }
                          >
                            Sync Now
                          </Button>
                          <Button variant="ghost" size="sm" onClick={handleDisconnectCalendar}>
                            Disconnect
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                          Connect your calendar to automatically sync your availability with your existing schedule.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline" onClick={() => handleConnectCalendar("Google Calendar")}>
                            <svg
                              className="mr-2 h-4 w-4"
                              viewBox="0 0 24 24"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M6 4.8V19.2C6 20.88 7.12 22 8.8 22H15.2C16.88 22 18 20.88 18 19.2V4.8C18 3.12 16.88 2 15.2 2H8.8C7.12 2 6 3.12 6 4.8Z"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M11.98 18H12.02"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                            Google Calendar
                          </Button>
                          <Button variant="outline" onClick={() => handleConnectCalendar("Outlook")}>
                            <svg
                              className="mr-2 h-4 w-4"
                              viewBox="0 0 24 24"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M6 4.8V19.2C6 20.88 7.12 22 8.8 22H15.2C16.88 22 18 20.88 18 19.2V4.8C18 3.12 16.88 2 15.2 2H8.8C7.12 2 6 3.12 6 4.8Z"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M11.98 18H12.02"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                            Outlook
                          </Button>
                          <Button variant="outline" onClick={() => handleConnectCalendar("Apple Calendar")}>
                            <svg
                              className="mr-2 h-4 w-4"
                              viewBox="0 0 24 24"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M6 4.8V19.2C6 20.88 7.12 22 8.8 22H15.2C16.88 22 18 20.88 18 19.2V4.8C18 3.12 16.88 2 15.2 2H8.8C7.12 2 6 3.12 6 4.8Z"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M11.98 18H12.02"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                            Apple Calendar
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Timezone</h3>
                    <p className="text-sm text-muted-foreground">
                      Select your timezone for accurate lesson scheduling.
                    </p>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                      <div className="flex-1">
                        <Label htmlFor="timezone">Timezone</Label>
                        <Select value={teacherTimezone} onValueChange={setTeacherTimezone}>
                          <SelectTrigger id="timezone" className="mt-1">
                            <SelectValue placeholder="Select timezone" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                            <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                            <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                            <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                            <SelectItem value="Europe/London">London (GMT/BST)</SelectItem>
                            <SelectItem value="Europe/Paris">Paris (CET/CEST)</SelectItem>
                            <SelectItem value="Europe/Berlin">Berlin (CET/CEST)</SelectItem>
                            <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                            <SelectItem value="Asia/Dubai">Dubai (GST)</SelectItem>
                            <SelectItem value="Australia/Sydney">Sydney (AEDT/AEST)</SelectItem>
                            <SelectItem value="Asia/Singapore">Singapore (SGT)</SelectItem>
                            <SelectItem value="Asia/Hong_Kong">Hong Kong (HKT)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={handleSaveTimezone} disabled={isSavingTimezone}>
                        {isSavingTimezone ? "Saving..." : "Save Timezone"}
                      </Button>
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <h3 className="text-lg font-medium mb-4">Weekly Availability</h3>
                    <div className="space-y-6">
                      {Object.entries(availability).map(([day, dayData]) => (
                        <div key={day} className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Switch
                                id={`${day}-available`}
                                checked={dayData.available}
                                onCheckedChange={() => handleToggleDay(day)}
                              />
                              <Label htmlFor={`${day}-available`} className="capitalize">
                                {day}
                              </Label>
                            </div>
                            {dayData.available && (
                              <Button variant="ghost" size="sm" onClick={() => handleAddTimeSlot(day)}>
                                <Plus className="h-4 w-4 mr-1" />
                                Add Time Slot
                              </Button>
                            )}
                          </div>

                          {dayData.available && dayData.slots.length > 0 && (
                            <div className="grid gap-4 pl-8">
                              {dayData.slots.map((slot) => (
                                <div key={slot.id} className="flex items-center space-x-2">
                                  <Select
                                    value={slot.start}
                                    onValueChange={(value) => handleUpdateTimeSlot(day, slot.id, "start", value)}
                                  >
                                    <SelectTrigger className="w-[120px]">
                                      <SelectValue placeholder="Start time" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {Array.from({ length: 24 }).map((_, i) => (
                                        <SelectItem key={i} value={`${String(i).padStart(2, "0")}:00`}>
                                          {`${String(i).padStart(2, "0")}:00`}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <span>to</span>
                                  <Select
                                    value={slot.end}
                                    onValueChange={(value) => handleUpdateTimeSlot(day, slot.id, "end", value)}
                                  >
                                    <SelectTrigger className="w-[120px]">
                                      <SelectValue placeholder="End time" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {Array.from({ length: 24 }).map((_, i) => (
                                        <SelectItem key={i} value={`${String(i).padStart(2, "0")}:00`}>
                                          {`${String(i).padStart(2, "0")}:00`}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleAddMeetingLinkToSlot(day, slot.id)}
                                    className={slot.meetingLink ? "bg-green-50 border-green-200 text-green-700" : ""}
                                  >
                                    <Video className="h-4 w-4 mr-1" />
                                    {slot.meetingLink ? "Edit Link" : "Add Link"}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleRemoveTimeSlot(day, slot.id)}
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      width="24"
                                      height="24"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      className="h-4 w-4"
                                    >
                                      <path d="M18 6L6 18"></path>
                                      <path d="M6 6L18 18"></path>
                                    </svg>
                                    <span className="sr-only">Remove</span>
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}

                          {dayData.available && dayData.slots.length === 0 && (
                            <p className="text-sm text-muted-foreground pl-8">
                              No time slots added. Click "Add Time Slot" to add your availability.
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button onClick={handleSaveAvailability} disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save Availability"}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          ) : (
            <TabsContent value="book" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Book a New Lesson</CardTitle>
                  <CardDescription>
                    Select a teacher and schedule a lesson. You can search and filter teachers to find the perfect match.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    We’ve moved the full booking flow to the Find Teachers page so you can compare teachers and availability.
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button asChild className="w-full sm:w-auto">
                      <Link href="/dashboard/find-teachers">Find Teachers</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="past" className="mt-6">
            {pastLessons.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {pastLessons.map((lesson) => (
                  <Card key={lesson.id}>
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center space-x-3">
                          <Avatar>
                            <AvatarImage
                              src={isTeacher ? lesson.studentAvatar : lesson.teacherAvatar || "/placeholder.svg"}
                              alt={isTeacher ? lesson.studentName : lesson.teacherName}
                            />
                            <AvatarFallback>
                              {(isTeacher ? lesson.studentName : lesson.teacherName)?.charAt(0) || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <CardTitle className="text-lg">
                              {isTeacher ? lesson.studentName : lesson.teacherName}
                            </CardTitle>
                            <CardDescription>{lesson.language}</CardDescription>
                          </div>
                        </div>
                        {!isTeacher && lesson.rated && (
                          <div className="flex items-center">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 mr-1" />
                            <span className="text-sm">{lesson.rating}</span>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center text-sm">
                          <Calendar className="mr-2 h-4 w-4 opacity-70" />
                          <span>{formatLessonDate(lesson.startTime || lesson.date)}</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <Clock className="mr-2 h-4 w-4 opacity-70" />
                          <span>
                            {isTeacher && lesson.studentTimezone
                              ? formatLessonTimeRange(lesson.startTime, lesson.endTime, teacherTimezone)
                              : formatLessonTimeRange(lesson.startTime, lesson.endTime)
                            }
                          </span>
                        </div>
                        {isTeacher && lesson.studentTimezone && (
                          <div className="text-xs text-muted-foreground">
                            Student booked in: {lesson.studentTimezone.replace('_', ' ')}
                          </div>
                        )}
                        <p className="text-sm mt-2">{lesson.topic}</p>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between pt-3">
                      {isTeacher ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/dashboard/messages?lessonId=${lesson.id}`)}
                        >
                          <MessageSquare className="mr-2 h-4 w-4" />
                          Message Student
                        </Button>
                      ) : (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/dashboard/book-lesson/${lesson.teacherId}`)}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Book Again
                          </Button>
                          {!lesson.rated && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => {
                                // Handle rating
                              }}
                            >
                              <Star className="mr-2 h-4 w-4" />
                              Rate Lesson
                            </Button>
                          )}
                        </>
                      )}
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No past lessons</h3>
                <p className="text-muted-foreground mt-2">
                  {isTeacher
                    ? "You haven't completed any lessons with students yet."
                    : "You haven't completed any lessons yet."}
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Meeting Link Dialog */}
      <Dialog open={meetingLinkDialogOpen} onOpenChange={setMeetingLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Meeting Link</DialogTitle>
            <DialogDescription>
              Add a meeting link for your lesson with{" "}
              {selectedLessonForMeeting?.studentName || selectedLessonForMeeting?.teacherName}.
              The student will receive an email confirmation with the link.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="meeting-link">Meeting Link</Label>
              <Input
                id="meeting-link"
                type="url"
                placeholder="https://zoom.us/j/123456789 or https://meet.google.com/abc-defg-hij"
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                className="mt-1"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Supported platforms: Zoom, Google Meet, Microsoft Teams, etc.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setMeetingLinkDialogOpen(false)
                setMeetingLink("")
                setSelectedLessonForMeeting(null)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddMeetingLink}
              disabled={isUpdatingMeetingLink || !meetingLink.trim()}
            >
              {isUpdatingMeetingLink ? "Adding..." : "Add Meeting Link"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rescheduleDialogOpen} onOpenChange={setRescheduleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Lesson</DialogTitle>
            <DialogDescription>
              Pick a new time for this lesson. The other participant will be notified by email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reschedule-start">New Start Time</Label>
              <Input
                id="reschedule-start"
                type="datetime-local"
                value={rescheduleStart}
                onChange={(e) => setRescheduleStart(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="reschedule-end">New End Time</Label>
              <Input
                id="reschedule-end"
                type="datetime-local"
                value={rescheduleEnd}
                onChange={(e) => setRescheduleEnd(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRescheduleLesson} disabled={isRescheduling}>
              {isRescheduling ? "Saving..." : "Save New Time"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={declineDialogOpen} onOpenChange={setDeclineDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline Reschedule Request</DialogTitle>
            <DialogDescription>
              Add a note so the other participant understands why this time was declined.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="decline-note">Note</Label>
            <Textarea
              id="decline-note"
              value={declineNote}
              onChange={(e) => setDeclineNote(e.target.value)}
              placeholder="Please share why this time does not work and suggest alternatives."
              className="mt-1 min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeclineDialogOpen(false)}>
              Keep Request
            </Button>
            <Button variant="destructive" onClick={handleDeclinePendingLesson} disabled={isDeclining}>
              {isDeclining ? "Declining..." : "Decline with Note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={lessonRequestDialogOpen} onOpenChange={setLessonRequestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lesson Request Summary</DialogTitle>
            <DialogDescription>
              Student goals and notes submitted during booking.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            <div>
              <p className="font-medium">Student</p>
              <p className="text-muted-foreground">{selectedLessonRequest?.studentName || "Unknown student"}</p>
            </div>
            <div>
              <p className="font-medium">Focus Area</p>
              <p className="text-muted-foreground">{selectedLessonRequest?.focus ? formatFocusLabel(selectedLessonRequest.focus) : "Not provided"}</p>
            </div>
            <div>
              <p className="font-medium">Student Notes</p>
              <p className="text-muted-foreground whitespace-pre-wrap">{selectedLessonRequest?.studentNotes || "No additional notes"}</p>
            </div>
            {selectedLessonRequest?.requestedStart ? (
              <div>
                <p className="font-medium">Requested Start</p>
                <p className="text-muted-foreground">{formatLessonDate(selectedLessonRequest.requestedStart)} {formatLessonTimeRange(selectedLessonRequest.requestedStart, selectedLessonRequest.requestedEnd || selectedLessonRequest.requestedStart, teacherTimezone)}</p>
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setLessonRequestDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Availability Meeting Link Dialog */}
      <Dialog open={availabilityMeetingLinkDialogOpen} onOpenChange={setAvailabilityMeetingLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Meeting Link for this Slot</DialogTitle>
            <DialogDescription>
              Set a meeting link for this specific time slot. Students who book during this time will automatically receive this link in their confirmation email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="slot-meeting-link">Meeting Link</Label>
              <Input
                id="slot-meeting-link"
                type="url"
                placeholder="https://zoom.us/j/123456789 or https://meet.google.com/abc-defg-hij"
                value={slotMeetingLink}
                onChange={(e) => setSlotMeetingLink(e.target.value)}
                className="mt-1"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Supported platforms: Zoom, Google Meet, Microsoft Teams, etc.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAvailabilityMeetingLinkDialogOpen(false)
                setSlotMeetingLink("")
                setSelectedSlotForMeetingLink(null)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveSlotMeetingLink}
              disabled={!slotMeetingLink.trim()}
            >
              Save Meeting Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
