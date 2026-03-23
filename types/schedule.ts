export interface User {
  id: string | number
  role: string
  name?: string
  email?: string
}

export interface TimeSlot {
  id: string
  start: string
  end: string
  meetingLink?: string
}

export interface DayAvailability {
  available: boolean
  slots: TimeSlot[]
}

export interface Availability {
  monday: DayAvailability
  tuesday: DayAvailability
  wednesday: DayAvailability
  thursday: DayAvailability
  friday: DayAvailability
  saturday: DayAvailability
  sunday: DayAvailability
  [key: string]: DayAvailability // Index signature for dynamic access
}

export interface Lesson {
  id: string | number
  studentId: string | number
  teacherId: string | number
  studentName: string
  teacherName: string
  studentAvatar?: string
  teacherAvatar?: string
  language: string
  date: string
  startTime: string
  endTime: string
  topic: string
  status: "confirmed" | "pending" | "canceled" | "completed"
  rated?: boolean
  rating?: number
  meetingLink?: string
  studentTimezone?: string
  focus?: string
  studentNotes?: string
  requestedStart?: string
  requestedEnd?: string
}

export interface CalendarInfo {
  type: string
  connected: boolean
  lastSync: string
}
