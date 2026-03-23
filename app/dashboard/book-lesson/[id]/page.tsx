"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Check, CreditCard, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Calendar } from "@/components/ui/calendar"
import { useToast } from "@/hooks/use-toast"

// Define interfaces for our data structures
interface TeacherAvailability {
  day: string
  slots: string[]
}

interface TeacherDiscounts {
  monthly4: number
  monthly8: number
  monthly12: number
}

interface Teacher {
  id: number | string
  name: string
  language: string
  rating: number
  reviews: number
  hourlyRate: number
  availability: TeacherAvailability[]
  bio: string
  image: string
  discounts: TeacherDiscounts
  trialClassAvailable: boolean
  trialClassPrice: number
}

interface AvailableDate {
  date: string
  day: string
}

interface PriceCalculation {
  original: number
  discounted: number
  discount: number
  total: number
}

type RawAvailabilitySlot =
  | string
  | {
      day?: string
      startTime?: string
      endTime?: string
      slots?: unknown
    }

const DEFAULT_TIMEZONE = "UTC"
const SUPPORTED_TIMEZONES = new Set([
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Australia/Sydney",
  "UTC",
])

const defaultAvailability: TeacherAvailability[] = [
  { day: "Monday", slots: ["9:00 - 10:00", "10:00 - 11:00", "14:00 - 15:00", "15:00 - 16:00"] },
  { day: "Tuesday", slots: ["9:00 - 10:00", "10:00 - 11:00", "14:00 - 15:00", "15:00 - 16:00"] },
  { day: "Wednesday", slots: ["9:00 - 10:00", "10:00 - 11:00", "14:00 - 15:00", "15:00 - 16:00"] },
  { day: "Thursday", slots: ["9:00 - 10:00", "10:00 - 11:00", "14:00 - 15:00", "15:00 - 16:00"] },
  { day: "Friday", slots: ["9:00 - 10:00", "10:00 - 11:00", "14:00 - 15:00", "15:00 - 16:00"] },
]

const getSafeInitialTimezone = () => {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    return timezone && SUPPORTED_TIMEZONES.has(timezone) ? timezone : DEFAULT_TIMEZONE
  } catch {
    return DEFAULT_TIMEZONE
  }
}

const normalizeSlots = (slots: unknown): string[] => {
  if (!Array.isArray(slots)) return []

  return slots
    .map((slot) => {
      if (typeof slot === "string") {
        return slot.trim()
      }

      if (slot && typeof slot === "object") {
        const slotRecord = slot as RawAvailabilitySlot
        const start = typeof slotRecord.startTime === "string" ? slotRecord.startTime.trim() : ""
        const end = typeof slotRecord.endTime === "string" ? slotRecord.endTime.trim() : ""

        if (start && end) {
          return `${start} - ${end}`
        }

        if (Array.isArray(slotRecord.slots)) {
          return normalizeSlots(slotRecord.slots).join(", ")
        }
      }

      return ""
    })
    .flatMap((slot) => slot.split(","))
    .map((slot) => slot.trim())
    .filter(Boolean)
}

const normalizeAvailability = (value: unknown): TeacherAvailability[] => {
  let parsedValue = value

  if (typeof parsedValue === "string") {
    try {
      parsedValue = JSON.parse(parsedValue)
    } catch {
      return defaultAvailability
    }
  }

  if (!Array.isArray(parsedValue)) {
    return defaultAvailability
  }

  const normalized = parsedValue
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null

      const record = entry as RawAvailabilitySlot
      const day = typeof record.day === "string" ? record.day.trim() : ""
      const slots = normalizeSlots(record.slots)
      const start = typeof record.startTime === "string" ? record.startTime.trim() : ""
      const end = typeof record.endTime === "string" ? record.endTime.trim() : ""

      if (!day) return null
      if (slots.length > 0) return { day, slots }
      if (start && end) return { day, slots: [`${start} - ${end}`] }

      return null
    })
    .filter((entry): entry is TeacherAvailability => Boolean(entry))

  return normalized.length > 0 ? normalized : defaultAvailability
}

// Mock data for teachers (same as in find-teachers page)
const mockTeachers: Teacher[] = [
  {
    id: 1,
    name: "Maria Garcia",
    language: "spanish",
    rating: 4.9,
    reviews: 124,
    hourlyRate: 25,
    availability: [
      { day: "Monday", slots: ["9:00 - 11:00", "14:00 - 16:00"] },
      { day: "Wednesday", slots: ["10:00 - 12:00", "15:00 - 17:00"] },
      { day: "Friday", slots: ["9:00 - 11:00", "13:00 - 15:00"] },
    ],
    bio: "Native Spanish speaker with 5 years of teaching experience. Specialized in conversational Spanish for beginners and intermediate learners.",
    image: "/diverse-classroom.png",
    discounts: {
      monthly4: 10, // 10% discount for 4 classes per month
      monthly8: 15, // 15% discount for 8 classes per month
      monthly12: 20, // 20% discount for 12 classes per month
    },
    trialClassAvailable: true,
    trialClassPrice: 15,
  },
  {
    id: 2,
    name: "Jean Dupont",
    language: "french",
    rating: 4.8,
    reviews: 98,
    hourlyRate: 30,
    availability: [
      { day: "Tuesday", slots: ["8:00 - 10:00", "16:00 - 18:00"] },
      { day: "Thursday", slots: ["9:00 - 11:00", "15:00 - 17:00"] },
      { day: "Saturday", slots: ["10:00 - 13:00"] },
    ],
    bio: "French teacher with a focus on grammar and pronunciation. I help students achieve fluency through structured lessons and practical exercises.",
    image: "/diverse-classroom.png",
    discounts: {
      monthly4: 5, // 5% discount for 4 classes per month
      monthly8: 10, // 10% discount for 8 classes per month
      monthly12: 15, // 15% discount for 12 classes per month
    },
    trialClassAvailable: true,
    trialClassPrice: 20,
  },
  {
    id: 3,
    name: "Hiroshi Tanaka",
    language: "japanese",
    rating: 4.7,
    reviews: 87,
    hourlyRate: 28,
    availability: [
      { day: "Monday", slots: ["18:00 - 20:00"] },
      { day: "Wednesday", slots: ["18:00 - 20:00"] },
      { day: "Saturday", slots: ["9:00 - 12:00", "14:00 - 16:00"] },
    ],
    bio: "Tokyo native teaching Japanese for 7 years. I specialize in helping students master kanji and natural conversation patterns.",
    image: "/diverse-classroom.png",
    discounts: {
      monthly4: 8, // 8% discount for 4 classes per month
      monthly8: 12, // 12% discount for 8 classes per month
      monthly12: 18, // 18% discount for 12 classes per month
    },
    trialClassAvailable: true,
    trialClassPrice: 18,
  },
  {
    id: 4,
    name: "Anna Schmidt",
    language: "german",
    rating: 4.9,
    reviews: 112,
    hourlyRate: 27,
    availability: [
      { day: "Tuesday", slots: ["10:00 - 12:00", "17:00 - 19:00"] },
      { day: "Thursday", slots: ["10:00 - 12:00", "17:00 - 19:00"] },
      { day: "Sunday", slots: ["14:00 - 17:00"] },
    ],
    bio: "German language instructor with a background in linguistics. My teaching approach focuses on practical communication skills and cultural context.",
    image: "/diverse-classroom.png",
    discounts: {
      monthly4: 7, // 7% discount for 4 classes per month
      monthly8: 12, // 12% discount for 8 classes per month
      monthly12: 18, // 18% discount for 12 classes per month
    },
    trialClassAvailable: true,
    trialClassPrice: 17,
  },
  {
    id: 5,
    name: "Li Wei",
    language: "mandarin",
    rating: 4.8,
    reviews: 76,
    hourlyRate: 26,
    availability: [
      { day: "Monday", slots: ["8:00 - 10:00", "19:00 - 21:00"] },
      { day: "Wednesday", slots: ["8:00 - 10:00", "19:00 - 21:00"] },
      { day: "Friday", slots: ["19:00 - 21:00"] },
    ],
    bio: "Mandarin teacher from Beijing with 6 years of experience. I help students master tones and characters through interactive lessons.",
    image: "/diverse-classroom.png",
    discounts: {
      monthly4: 5, // 5% discount for 4 classes per month
      monthly8: 10, // 10% discount for 8 classes per month
      monthly12: 15, // 15% discount for 12 classes per month
    },
    trialClassAvailable: true,
    trialClassPrice: 16,
  },
  {
    id: 6,
    name: "Sofia Rossi",
    language: "italian",
    rating: 4.7,
    reviews: 92,
    hourlyRate: 24,
    availability: [
      { day: "Tuesday", slots: ["9:00 - 11:00", "15:00 - 17:00"] },
      { day: "Thursday", slots: ["9:00 - 11:00", "15:00 - 17:00"] },
      { day: "Saturday", slots: ["11:00 - 14:00"] },
    ],
    bio: "Italian language enthusiast from Florence. My lessons combine grammar, vocabulary, and cultural insights to provide a comprehensive learning experience.",
    image: "/diverse-classroom.png",
    discounts: {
      monthly4: 8, // 8% discount for 4 classes per month
      monthly8: 15, // 15% discount for 8 classes per month
      monthly12: 20, // 20% discount for 12 classes per month
    },
    trialClassAvailable: true,
    trialClassPrice: 15,
  },
]

// Get next 14 days for date selection
const getNextTwoWeeks = (): AvailableDate[] => {
  const dates: AvailableDate[] = []
  const today = new Date()

  for (let i = 0; i < 14; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() + i)

    // Get day name
    const dayName = date.toLocaleDateString("en-US", { weekday: "long" })

    // Format date
    const formattedDate = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })

    dates.push({
      date: formattedDate,
      day: dayName,
    })
  }

  return dates
}

export default function BookLessonPage() {
  const params = useParams<{ id?: string }>()
  const router = useRouter()
  const { toast } = useToast()
  const [teacher, setTeacher] = useState<Teacher | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [bookingType, setBookingType] = useState<"single" | "monthly" | "trial">("single")
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>("")
  const [lessonDuration, setLessonDuration] = useState<string>("60")
  const [lessonFocus, setLessonFocus] = useState<string>("")
  const [notes, setNotes] = useState<string>("")
  const [step, setStep] = useState<number>(1)
  const [availableDates, setAvailableDates] = useState<AvailableDate[]>([])
  const [availableTimeSlots, setAvailableTimeSlots] = useState<Array<string | { startTime?: string; endTime?: string; day?: string; slots?: any }>>([])

  // Monthly subscription options
  const [classesPerMonth, setClassesPerMonth] = useState<string>("4")
  const [selectedDays, setSelectedDays] = useState<string[]>([])
  const [preferredTimeSlot, setPreferredTimeSlot] = useState<string>("")
  const [subscriptionDuration, setSubscriptionDuration] = useState<string>("3") // in months
  const [selectedTimezone, setSelectedTimezone] = useState<string>(getSafeInitialTimezone)
  
  // Payment method state
  const [paymentMethods, setPaymentMethods] = useState<Array<{
    id: string
    brand: string
    last4: string
    expMonth: number
    expYear: number
    isDefault: boolean
  }>>([])
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("")
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(true)

  // Calculate total and discounted prices
  const calculatePrice = (): PriceCalculation => {
    if (!teacher) return { original: 0, discounted: 0, discount: 0, total: 0 }

    if (bookingType === "trial" && teacher.trialClassAvailable) {
      return {
        original: teacher.trialClassPrice,
        discounted: teacher.trialClassPrice,
        discount: 0,
        total: teacher.trialClassPrice,
      }
    }

    if (bookingType === "single") {
      const basePrice = (teacher.hourlyRate * Number.parseInt(lessonDuration)) / 60
      return {
        original: basePrice,
        discounted: basePrice,
        discount: 0,
        total: basePrice,
      }
    }

    if (bookingType === "monthly") {
      const classesCount = Number.parseInt(classesPerMonth)
      const months = Number.parseInt(subscriptionDuration)
      const basePrice = teacher.hourlyRate * classesCount * months

      let discountPercent = 0
      if (classesCount === 4) discountPercent = teacher.discounts.monthly4
      else if (classesCount === 8) discountPercent = teacher.discounts.monthly8
      else if (classesCount === 12) discountPercent = teacher.discounts.monthly12

      const discountAmount = basePrice * (discountPercent / 100)
      const discountedPrice = basePrice - discountAmount

      return {
        original: basePrice,
        discounted: discountedPrice,
        discount: discountPercent,
        total: discountedPrice,
      }
    }

    return { original: 0, discounted: 0, discount: 0, total: 0 }
  }

  useEffect(() => {
    const fetchTeacher = async () => {
      const normalizedTeacherId = decodeURIComponent(String(params.id || "")).trim()

      if (!normalizedTeacherId) {
        toast({
          title: "Teacher not found",
          description: "The teacher you're looking for doesn't exist.",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      try {
        // Try to fetch teacher from API first
        const response = await fetch(`/api/teachers/${encodeURIComponent(normalizedTeacherId)}`)
        
        if (response.ok) {
          const data = await response.json()
          if (data && !data.error) {
            const normalizedAvailability = normalizeAvailability(data.availability)

            // Transform API data to match expected format
            const teacherData: Teacher = {
              id: data.id,
              name: data.name || `${data.firstName || ''} ${data.lastName || ''}`.trim(),
              language: data.languages?.[0] || 'english',
              rating: data.rating || 4.5,
              reviews: data.reviews || 0,
              hourlyRate: data.hourlyRate || 25,
              availability: normalizedAvailability,
              bio: data.bio || 'Experienced language teacher.',
              image: data.profileImage || data.image || '/diverse-classroom.png',
              discounts: data.discounts || {
                monthly4: 10,
                monthly8: 15,
                monthly12: 20,
              },
              trialClassAvailable: true,
              trialClassPrice: Math.round((data.hourlyRate || 25) * 0.6),
            }
            setTeacher(teacherData)
            
            // Get available dates based on teacher's availability
            const dates = getNextTwoWeeks()
            const availableDays = teacherData.availability.map((a) => a.day)
            const filteredDates = dates.filter((d) => availableDays.includes(d.day))
            setAvailableDates(filteredDates.length > 0 ? filteredDates : dates) // Fall back to all dates if no filter match
            setLoading(false)
            return
          }
        }

        // Fallback to teachers list if single-teacher endpoint fails or returns not found
        const teachersResponse = await fetch("/api/teachers")
        if (teachersResponse.ok) {
          const teachers = await teachersResponse.json()
          const matchedTeacher = Array.isArray(teachers)
            ? teachers.find((t) => String(t?.id || "").trim() === normalizedTeacherId)
            : null

          if (matchedTeacher) {
            const normalizedAvailability = normalizeAvailability(matchedTeacher.availability)

            const teacherData: Teacher = {
              id: matchedTeacher.id,
              name: matchedTeacher.name || `${matchedTeacher.firstName || ""} ${matchedTeacher.lastName || ""}`.trim(),
              language: matchedTeacher.languages?.[0] || "english",
              rating: matchedTeacher.rating || 4.5,
              reviews: matchedTeacher.reviewCount || 0,
              hourlyRate: matchedTeacher.hourlyRate || 25,
              availability: normalizedAvailability,
              bio: matchedTeacher.bio || "Experienced language teacher.",
              image: matchedTeacher.profileImage || matchedTeacher.image || "/diverse-classroom.png",
              discounts: matchedTeacher.discounts || {
                monthly4: 10,
                monthly8: 15,
                monthly12: 20,
              },
              trialClassAvailable: true,
              trialClassPrice: Math.round((matchedTeacher.hourlyRate || 25) * 0.6),
            }

            setTeacher(teacherData)

            const dates = getNextTwoWeeks()
            const availableDays = teacherData.availability.map((a) => a.day)
            const filteredDates = dates.filter((d) => availableDays.includes(d.day))
            setAvailableDates(filteredDates.length > 0 ? filteredDates : dates)
            setLoading(false)
            return
          }
        }
        
        // Fallback to mock data if API fails
        const teacherId = Number.parseInt(normalizedTeacherId)
        const foundTeacher = mockTeachers.find((t) => t.id === teacherId)

        if (foundTeacher) {
          setTeacher(foundTeacher)

          // Get available dates based on teacher's availability
          const dates = getNextTwoWeeks()
          const availableDays = foundTeacher.availability.map((a) => a.day)
          const filteredDates = dates.filter((d) => availableDays.includes(d.day))
          setAvailableDates(filteredDates)
        } else {
          // Handle teacher not found
          toast({
            title: "Teacher not found",
            description: "The teacher you're looking for doesn't exist.",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error("Error fetching teacher:", error)
        // Fallback to mock data
        const teacherId = Number.parseInt(normalizedTeacherId)
        const foundTeacher = mockTeachers.find((t) => t.id === teacherId)
        if (foundTeacher) {
          setTeacher(foundTeacher)
          const dates = getNextTwoWeeks()
          const availableDays = foundTeacher.availability.map((a) => a.day)
          const filteredDates = dates.filter((d) => availableDays.includes(d.day))
          setAvailableDates(filteredDates)
        } else {
          toast({
            title: "Teacher not found",
            description: "The teacher you're looking for doesn't exist.",
            variant: "destructive",
          })
        }
      } finally {
        setLoading(false)
      }
    }
    
    fetchTeacher()
  }, [params.id, router, toast])

  useEffect(() => {
    // Update available time slots when date changes
    if (selectedDate && teacher) {
      const selectedDay = selectedDate.toLocaleDateString("en-US", { weekday: "long" })
      const dayAvailability = teacher.availability.find((a) => a.day === selectedDay)

      if (dayAvailability) {
        setAvailableTimeSlots(
          (dayAvailability.slots || []).map((slot) => {
            if (typeof slot === "string") return slot
            if (slot && typeof slot === "object") {
              if (slot.startTime || slot.endTime) {
                const start = slot.startTime ?? "?"
                const end = slot.endTime ?? "?"
                return `${start} - ${end}`
              }
              if (slot.day && Array.isArray(slot.slots)) {
                return `${slot.day}: ${slot.slots.join(", ")}`
              }
            }
            return String(slot)
          }),
        )
      } else {
        setAvailableTimeSlots([])
      }
      // Reset time slot when date changes
      setSelectedTimeSlot("")
    }
  }, [selectedDate, teacher])

  // Fetch user's payment methods
  useEffect(() => {
    const fetchPaymentMethods = async () => {
      try {
        const userData = localStorage.getItem("linguaConnectUser")
        if (!userData) {
          setLoadingPaymentMethods(false)
          return
        }
        
        const user = JSON.parse(userData)
        const response = await fetch(`/api/payments/payment-methods?userId=${user.id}`)
        
        if (response.ok) {
          const data = await response.json()
          setPaymentMethods(data.paymentMethods || [])
          // Set default payment method if one exists
          const defaultMethod = data.paymentMethods?.find((pm: { isDefault: boolean }) => pm.isDefault)
          if (defaultMethod) {
            setSelectedPaymentMethod(defaultMethod.id)
          } else if (data.paymentMethods?.length > 0) {
            setSelectedPaymentMethod(data.paymentMethods[0].id)
          }
        }
      } catch (error) {
        console.error("Error fetching payment methods:", error)
      } finally {
        setLoadingPaymentMethods(false)
      }
    }
    
    fetchPaymentMethods()
  }, [])

  const handleBookLesson = async () => {
    // Validate form based on booking type
    if (bookingType === "single") {
      if (!selectedDate || !selectedTimeSlot || !lessonDuration || !lessonFocus) {
        toast({
          title: "Missing information",
          description: "Please fill in all required fields.",
          variant: "destructive",
        })
        return
      }
    } else if (bookingType === "monthly") {
      if (selectedDays.length === 0 || !preferredTimeSlot || !lessonFocus) {
        toast({
          title: "Missing information",
          description: "Please fill in all required fields.",
          variant: "destructive",
        })
        return
      }

      if (selectedDays.length > Number.parseInt(classesPerMonth)) {
        toast({
          title: "Too many days selected",
          description: `You've selected ${selectedDays.length} days but your plan includes only ${classesPerMonth} classes per month.`,
          variant: "destructive",
        })
        return
      }
    } else if (bookingType === "trial") {
      if (!selectedDate || !selectedTimeSlot) {
        toast({
          title: "Missing information",
          description: "Please select a date and time for your trial lesson.",
          variant: "destructive",
        })
        return
      }
    }
    
    // Validate payment method
    if (paymentMethods.length === 0) {
      toast({
        title: "Payment method required",
        description: "Please add a payment method in your settings before booking.",
        variant: "destructive",
      })
      router.push("/dashboard/settings")
      return
    }

    if (!teacher) {
      toast({
        title: "Error",
        description: "Teacher information is missing.",
        variant: "destructive",
      })
      return
    }

    try {
      // Create a checkout session
      const price = calculatePrice()
      
      // Get current user ID from localStorage
      const userData = localStorage.getItem("linguaConnectUser")
      const currentUser = userData ? JSON.parse(userData) : null
      const currentUserId = currentUser?.id ?? currentUser?.userId
      
      if (!currentUserId) {
        toast({
          title: "Error",
          description: "Please log in to complete your booking.",
          variant: "destructive",
        })
        return
      }
      
      const formatTimeForISO = (date: Date, timeStr: string): string | null => {
        if (!timeStr) return null
        const [timePart] = timeStr.split("-").map((t) => t.trim())
        const match = timePart.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i)
        if (!match) return null

        let hour = Number(match[1])
        const minute = Number(match[2] ?? "0")
        const ampm = match[3]?.toLowerCase()

        if (ampm === "pm" && hour < 12) hour += 12
        if (ampm === "am" && hour === 12) hour = 0

        const dateCopy = new Date(date)
        dateCopy.setHours(hour, minute, 0, 0)
        return dateCopy.toISOString()
      }

      const startTimeIso = selectedDate && selectedTimeSlot ? formatTimeForISO(selectedDate, selectedTimeSlot) : null
      const durationMinutes = bookingType === "single" ? Number(lessonDuration) || 30 : 60
      const endTimeIso = startTimeIso ? new Date(new Date(startTimeIso).getTime() + durationMinutes * 60000).toISOString() : null

      const response = await fetch("/api/payments/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: currentUserId,
          teacherId: teacher.id,
          lessonType: bookingType,
          lessonDate: selectedDate ? `${selectedDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} ${selectedTimeSlot}` : undefined,
          lessonDuration: bookingType === "single" ? lessonDuration : classesPerMonth,
          lessonStartTime: startTimeIso,
          lessonEndTime: endTimeIso,
          userTimezone: selectedTimezone,
          language: teacher.language,
          lessonFocus,
          studentNotes: notes,
          amount: price.total,
          paymentMethodId: selectedPaymentMethod,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to create checkout session")
      }

      const { checkoutUrl } = await response.json()

      // Redirect to Stripe Checkout
      window.location.href = checkoutUrl
    } catch (error) {
      console.error("Error creating checkout session:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process your booking",
        variant: "destructive",
      })
    }
  }

  const handleDayToggle = (day: string) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter((d) => d !== day))
    } else {
      setSelectedDays([...selectedDays, day])
    }
  }

  if (loading) {
    return (
      <div className="container px-4 py-6 md:px-6 md:py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <p>Loading booking page...</p>
        </div>
      </div>
    )
  }

  if (!teacher) {
    return null
  }

  const price = calculatePrice()

  return (
    <div className="container px-4 py-6 md:px-6 md:py-8">
      <div className="mb-6">
        <Link
          href={`/dashboard/teacher/${teacher.id}`}
          className="flex items-center text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to teacher profile
        </Link>
      </div>

      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight mb-6">Book with {teacher.name}</h1>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Booking steps sidebar */}
          <div className="md:col-span-1">
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full ${step >= 1 ? "bg-[#8B5A2B] text-white" : "border border-muted-foreground text-muted-foreground"}`}
                    >
                      {step > 1 ? <Check className="h-4 w-4" /> : "1"}
                    </div>
                    <div className="ml-3">
                      <p className="font-medium">Booking Type</p>
                      <p className="text-sm text-muted-foreground">Choose how you want to book</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full ${step >= 2 ? "bg-[#8B5A2B] text-white" : "border border-muted-foreground text-muted-foreground"}`}
                    >
                      {step > 2 ? <Check className="h-4 w-4" /> : "2"}
                    </div>
                    <div className="ml-3">
                      <p className="font-medium">Schedule</p>
                      <p className="text-sm text-muted-foreground">Choose when you want to learn</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full ${step >= 3 ? "bg-[#8B5A2B] text-white" : "border border-muted-foreground text-muted-foreground"}`}
                    >
                      {step > 3 ? <Check className="h-4 w-4" /> : "3"}
                    </div>
                    <div className="ml-3">
                      <p className="font-medium">Lesson Details</p>
                      <p className="text-sm text-muted-foreground">Specify your learning goals</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full ${step >= 4 ? "bg-[#8B5A2B] text-white" : "border border-muted-foreground text-muted-foreground"}`}
                    >
                      {step > 4 ? <Check className="h-4 w-4" /> : "4"}
                    </div>
                    <div className="ml-3">
                      <p className="font-medium">Review & Confirm</p>
                      <p className="text-sm text-muted-foreground">Finalize your booking</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Lesson rate</span>
                      <span className="font-medium">${teacher.hourlyRate}/hour</span>
                    </div>

                    {bookingType === "trial" && (
                      <div className="flex justify-between">
                        <span className="text-sm">Trial class</span>
                        <span className="font-medium">${teacher.trialClassPrice}</span>
                      </div>
                    )}

                    {bookingType === "single" && lessonDuration && (
                      <div className="flex justify-between">
                        <span className="text-sm">Duration</span>
                        <span className="font-medium">{lessonDuration} minutes</span>
                      </div>
                    )}

                    {bookingType === "monthly" && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-sm">Classes per month</span>
                          <span className="font-medium">{classesPerMonth}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Subscription duration</span>
                          <span className="font-medium">{subscriptionDuration} months</span>
                        </div>
                        {price.discount > 0 && (
                          <div className="flex justify-between text-green-600">
                            <span className="text-sm">Discount</span>
                            <span className="font-medium">{price.discount}% off</span>
                          </div>
                        )}
                      </>
                    )}

                    <div className="flex justify-between font-medium pt-2 border-t">
                      <span>Total</span>
                      {price.discount > 0 ? (
                        <div className="text-right">
                          <span className="line-through text-sm text-muted-foreground">
                            ${price.original.toFixed(2)}
                          </span>
                          <span className="ml-2">${price.total.toFixed(2)}</span>
                        </div>
                      ) : (
                        <span>${price.total.toFixed(2)}</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main booking form */}
          <div className="md:col-span-2">
            {step === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle>Choose Booking Type</CardTitle>
                  <CardDescription>Select how you want to book lessons with {teacher.name}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <RadioGroup
                    value={bookingType}
                    onValueChange={(value) => setBookingType(value as "single" | "monthly" | "trial")}
                    className="flex flex-col space-y-3"
                  >
                    <div className="flex items-center justify-between rounded-md border p-4">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="single" id="booking-single" />
                        <Label htmlFor="booking-single" className="font-medium">
                          Single Lesson
                        </Label>
                      </div>
                      <div className="text-sm text-muted-foreground">Book one lesson at a time</div>
                    </div>

                    <div className="flex items-center justify-between rounded-md border p-4">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="monthly" id="booking-monthly" />
                        <Label htmlFor="booking-monthly" className="font-medium">
                          Monthly Subscription
                        </Label>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Save up to{" "}
                        {Math.max(teacher.discounts.monthly4, teacher.discounts.monthly8, teacher.discounts.monthly12)}%
                        with regular lessons
                      </div>
                    </div>

                    {teacher.trialClassAvailable && (
                      <div className="flex items-center justify-between rounded-md border p-4">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="trial" id="booking-trial" />
                          <Label htmlFor="booking-trial" className="font-medium">
                            Trial Lesson
                          </Label>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Try a discounted 30-minute lesson for ${teacher.trialClassPrice}
                        </div>
                      </div>
                    )}
                  </RadioGroup>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button className="bg-[#8B5A2B] hover:bg-[#8B5A2B]/90" onClick={() => setStep(2)}>
                    Continue
                  </Button>
                </CardFooter>
              </Card>
            )}

            {step === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    Schedule Your {bookingType === "trial" ? "Trial" : bookingType === "monthly" ? "Monthly" : ""}{" "}
                    Lessons
                  </CardTitle>
                  <CardDescription>
                    {bookingType === "single" && "Choose when you want to have your lesson"}
                    {bookingType === "monthly" && "Set up your recurring lesson schedule"}
                    {bookingType === "trial" && "Choose when you want to have your trial lesson"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {(bookingType === "single" || bookingType === "trial") && (
                    <>
                      <div className="space-y-3">
                        <Label>Select a Date</Label>
                        <p className="text-sm text-muted-foreground">
                          Available days are highlighted based on {teacher.name}&apos;s schedule
                        </p>
                        <div className="flex justify-center border rounded-lg p-4">
                          <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={setSelectedDate}
                            disabled={(date) => {
                              // Disable past dates
                              const today = new Date()
                              today.setHours(0, 0, 0, 0)
                              if (date < today) return true
                              
                              // Disable dates more than 90 days (3 months) in the future
                              const maxDate = new Date()
                              maxDate.setDate(maxDate.getDate() + 90)
                              if (date > maxDate) return true
                              
                              // Only enable days that match teacher's availability
                              const dayName = date.toLocaleDateString("en-US", { weekday: "long" })
                              const isAvailable = teacher.availability.some((a) => a.day === dayName)
                              return !isAvailable
                            }}
                            modifiers={{
                              available: (date) => {
                                const today = new Date()
                                today.setHours(0, 0, 0, 0)
                                if (date < today) return false
                                const dayName = date.toLocaleDateString("en-US", { weekday: "long" })
                                return teacher.availability.some((a) => a.day === dayName)
                              }
                            }}
                            modifiersClassNames={{
                              available: "bg-[#8B5A2B]/10 text-[#8B5A2B] font-medium"
                            }}
                            className="rounded-md"
                          />
                        </div>
                        {selectedDate && (
                          <p className="text-sm text-center text-muted-foreground">
                            Selected: <span className="font-medium text-foreground">{selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</span>
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>Time Slot</Label>
                        {!selectedDate ? (
                          <p className="text-sm text-muted-foreground">Select a date first to see available time slots</p>
                        ) : availableTimeSlots.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No available time slots for this date</p>
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            {availableTimeSlots.map((slot, index) => {
                              const slotLabel = typeof slot === "string" ? slot : JSON.stringify(slot)
                              const slotValue = typeof slot === "string" ? slot : JSON.stringify(slot)
                              return (
                                <Button
                                  key={index}
                                  type="button"
                                  variant={selectedTimeSlot === slotValue ? "default" : "outline"}
                                  className={selectedTimeSlot === slotValue ? "bg-[#8B5A2B] hover:bg-[#8B5A2B]/90" : ""}
                                  onClick={() => setSelectedTimeSlot(slotValue)}
                                >
                                  {slotLabel}
                                </Button>
                              )
                            })}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>Your Timezone</Label>
                        <Select value={selectedTimezone} onValueChange={setSelectedTimezone}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select your timezone" />
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
                            <SelectItem value="Asia/Shanghai">Shanghai (CST)</SelectItem>
                            <SelectItem value="Australia/Sydney">Sydney (AEST/AEDT)</SelectItem>
                            <SelectItem value="UTC">UTC</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Select your timezone to ensure lesson times are displayed correctly for you.
                        </p>
                      </div>

                      {bookingType === "single" && (
                        <div className="space-y-2">
                          <Label>Lesson Duration</Label>
                          <RadioGroup
                            value={lessonDuration}
                            onValueChange={setLessonDuration}
                            className="flex flex-col space-y-1"
                          >
                            <div className="flex items-center justify-between rounded-md border p-4">
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="30" id="duration-30" />
                                <Label htmlFor="duration-30" className="font-normal">
                                  30 minutes
                                </Label>
                              </div>
                              <span className="font-medium">${(teacher.hourlyRate * 0.5).toFixed(2)}</span>
                            </div>
                            <div className="flex items-center justify-between rounded-md border p-4">
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="60" id="duration-60" />
                                <Label htmlFor="duration-60" className="font-normal">
                                  60 minutes
                                </Label>
                              </div>
                              <span className="font-medium">${teacher.hourlyRate.toFixed(2)}</span>
                            </div>
                            <div className="flex items-center justify-between rounded-md border p-4">
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="90" id="duration-90" />
                                <Label htmlFor="duration-90" className="font-normal">
                                  90 minutes
                                </Label>
                              </div>
                              <span className="font-medium">${(teacher.hourlyRate * 1.5).toFixed(2)}</span>
                            </div>
                          </RadioGroup>
                        </div>
                      )}
                    </>
                  )}

                  {bookingType === "monthly" && (
                    <>
                      <div className="space-y-2">
                        <Label>Classes per month</Label>
                        <RadioGroup
                          value={classesPerMonth}
                          onValueChange={setClassesPerMonth}
                          className="flex flex-col space-y-1"
                        >
                          <div className="flex items-center justify-between rounded-md border p-4">
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="4" id="classes-4" />
                              <Label htmlFor="classes-4" className="font-normal">
                                4 classes per month (1 per week)
                              </Label>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-green-600">{teacher.discounts.monthly4}% off</div>
                              <div className="font-medium">
                                ${(teacher.hourlyRate * 4 * (1 - teacher.discounts.monthly4 / 100)).toFixed(2)}/month
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between rounded-md border p-4">
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="8" id="classes-8" />
                              <Label htmlFor="classes-8" className="font-normal">
                                8 classes per month (2 per week)
                              </Label>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-green-600">{teacher.discounts.monthly8}% off</div>
                              <div className="font-medium">
                                ${(teacher.hourlyRate * 8 * (1 - teacher.discounts.monthly8 / 100)).toFixed(2)}/month
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between rounded-md border p-4">
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="12" id="classes-12" />
                              <Label htmlFor="classes-12" className="font-normal">
                                12 classes per month (3 per week)
                              </Label>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-green-600">{teacher.discounts.monthly12}% off</div>
                              <div className="font-medium">
                                ${(teacher.hourlyRate * 12 * (1 - teacher.discounts.monthly12 / 100)).toFixed(2)}/month
                              </div>
                            </div>
                          </div>
                        </RadioGroup>
                      </div>

                      <div className="space-y-2">
                        <Label>Subscription duration</Label>
                        <Select value={subscriptionDuration} onValueChange={setSubscriptionDuration}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select duration" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 month</SelectItem>
                            <SelectItem value="3">3 months</SelectItem>
                            <SelectItem value="6">6 months</SelectItem>
                            <SelectItem value="12">12 months</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>Preferred days</Label>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <Info className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  Select up to {classesPerMonth} days when you'd like to have your lessons each month
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <div className="grid grid-cols-7 gap-2">
                          {teacher.availability.map((slot, index) => (
                            <div key={index} className="flex flex-col items-center">
                              <Checkbox
                                id={`day-${slot.day}`}
                                checked={selectedDays.includes(slot.day)}
                                onCheckedChange={() => handleDayToggle(slot.day)}
                                className="mb-1"
                              />
                              <Label htmlFor={`day-${slot.day}`} className="text-xs">
                                {slot.day.substring(0, 3)}
                              </Label>
                            </div>
                          ))}
                        </div>
                        {selectedDays.length > Number.parseInt(classesPerMonth) && (
                          <p className="text-sm text-red-500">
                            You've selected {selectedDays.length} days but your plan includes only {classesPerMonth}{" "}
                            classes per month.
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>Preferred time slot</Label>
                        <Select value={preferredTimeSlot} onValueChange={setPreferredTimeSlot}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a time slot" />
                          </SelectTrigger>
                          <SelectContent>
                            {teacher.availability.flatMap((day, dayIndex) =>
                              day.slots.map((slot, slotIndex) => {
                                const slotLabel = typeof slot === "string" ? slot : `${slot.startTime || "?"} - ${slot.endTime || "?"}`
                                const slotValue = typeof slot === "string" ? slot : JSON.stringify(slot)
                                return (
                                  <SelectItem key={`${dayIndex}-${slotIndex}`} value={slotValue}>
                                    {slotLabel}
                                  </SelectItem>
                                )
                              }),
                            )}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          We'll try to schedule your lessons at this time, but it may vary based on availability.
                        </p>
                      </div>
                    </>
                  )}
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep(1)}>
                    Back
                  </Button>
                  <Button
                    className="bg-[#8B5A2B] hover:bg-[#8B5A2B]/90"
                    onClick={() => setStep(3)}
                    disabled={
                      (bookingType === "single" && (!selectedDate || !selectedTimeSlot || !lessonDuration)) ||
                      (bookingType === "monthly" && (selectedDays.length === 0 || !preferredTimeSlot)) ||
                      (bookingType === "trial" && (!selectedDate || !selectedTimeSlot))
                    }
                  >
                    Continue
                  </Button>
                </CardFooter>
              </Card>
            )}

            {step === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle>Lesson Details</CardTitle>
                  <CardDescription>Tell your teacher about your learning goals</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>What would you like to focus on?</Label>
                    <Select value={lessonFocus} onValueChange={setLessonFocus}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a focus area" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="conversation">Conversation Practice</SelectItem>
                        <SelectItem value="grammar">Grammar</SelectItem>
                        <SelectItem value="vocabulary">Vocabulary Building</SelectItem>
                        <SelectItem value="pronunciation">Pronunciation</SelectItem>
                        <SelectItem value="reading">Reading Comprehension</SelectItem>
                        <SelectItem value="writing">Writing Skills</SelectItem>
                        <SelectItem value="exam">Exam Preparation</SelectItem>
                        <SelectItem value="business">Business Language</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Additional notes for your teacher (optional)</Label>
                    <Textarea
                      placeholder="Share any specific topics, questions, or materials you'd like to cover in your lesson"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={4}
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep(2)}>
                    Back
                  </Button>
                  <Button
                    className="bg-[#8B5A2B] hover:bg-[#8B5A2B]/90"
                    onClick={() => setStep(4)}
                    disabled={!lessonFocus}
                  >
                    Continue
                  </Button>
                </CardFooter>
              </Card>
            )}

            {step === 4 && (
              <Card>
                <CardHeader>
                  <CardTitle>Review & Confirm</CardTitle>
                  <CardDescription>Confirm your booking details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="rounded-md border p-4 space-y-4">
                    <div className="flex justify-between">
                      <div>
                        <p className="font-medium">Booking Type</p>
                        <p className="text-sm text-muted-foreground">
                          {bookingType === "single" && "Single Lesson"}
                          {bookingType === "monthly" &&
                            `Monthly Subscription (${classesPerMonth} classes/month for ${subscriptionDuration} months)`}
                          {bookingType === "trial" && "Trial Lesson"}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
                        Edit
                      </Button>
                    </div>

                    <div className="flex justify-between">
                      <div>
                        <p className="font-medium">Schedule</p>
                        {(bookingType === "single" || bookingType === "trial") && selectedDate && (
                          <div className="text-sm text-muted-foreground">
                            <p>{selectedDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}, {selectedTimeSlot}</p>
                            <p className="text-xs">Timezone: {selectedTimezone.replace('_', ' ')}</p>
                          </div>
                        )}
                        {bookingType === "monthly" && (
                          <div className="text-sm text-muted-foreground">
                            <p>Days: {selectedDays.join(", ")}</p>
                            <p>Preferred time: {preferredTimeSlot}</p>
                            <p className="text-xs">Timezone: {selectedTimezone.replace('_', ' ')}</p>
                          </div>
                        )}
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setStep(2)}>
                        Edit
                      </Button>
                    </div>

                    <div className="flex justify-between">
                      <div>
                        <p className="font-medium">Lesson Details</p>
                        <p className="text-sm text-muted-foreground">
                          {bookingType === "single" && `${lessonDuration} minutes, `}Focus:{" "}
                          {lessonFocus.charAt(0).toUpperCase() + lessonFocus.slice(1)}
                        </p>
                        {notes && <p className="text-sm text-muted-foreground mt-1">Notes: {notes}</p>}
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setStep(3)}>
                        Edit
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-md border p-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <CreditCard className="h-5 w-5 mr-2 text-muted-foreground" />
                        <p>Payment Method</p>
                      </div>
                      {loadingPaymentMethods ? (
                        <p className="text-sm text-muted-foreground">Loading...</p>
                      ) : paymentMethods.length > 0 ? (
                        <div className="text-right">
                          {paymentMethods.length === 1 ? (
                            <p className="text-sm">
                              {paymentMethods[0].brand.charAt(0).toUpperCase() + paymentMethods[0].brand.slice(1)} ending in {paymentMethods[0].last4}
                            </p>
                          ) : (
                            <select
                              value={selectedPaymentMethod}
                              onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                              className="text-sm border rounded px-2 py-1"
                            >
                              {paymentMethods.map((pm) => (
                                <option key={pm.id} value={pm.id}>
                                  {pm.brand.charAt(0).toUpperCase() + pm.brand.slice(1)} ending in {pm.last4}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      ) : (
                        <a 
                          href="/dashboard/settings" 
                          className="text-sm text-[#8B5A2B] hover:underline"
                        >
                          Add payment method
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="rounded-md bg-muted p-4">
                    <p className="text-sm">
                      By booking this {bookingType === "monthly" ? "subscription" : "lesson"}, you agree to our Terms of
                      Service and Cancellation Policy.
                      {bookingType === "monthly"
                        ? " You can cancel your subscription at any time, but no refunds will be issued for the current billing period."
                        : " You can cancel or reschedule this lesson up to 24 hours before the scheduled time."}
                    </p>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep(3)}>
                    Back
                  </Button>
                  <Button className="bg-[#8B5A2B] hover:bg-[#8B5A2B]/90" onClick={handleBookLesson}>
                    Confirm Booking
                  </Button>
                </CardFooter>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
