"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { PaymentMethods } from "@/components/payment-methods"
import { USER_LOGIN_ROUTE } from "@/lib/auth-route-config"

interface UserData {
  id: string
  email: string
  firstName?: string
  lastName?: string
  name?: string
  role: string
  settings?: {
    emailNotifications?: boolean
    lessonReminders?: boolean
    marketingEmails?: boolean
    darkMode?: boolean
  }
}

export default function SettingsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)

  // Settings state
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [lessonReminders, setLessonReminders] = useState(true)
  const [marketingEmails, setMarketingEmails] = useState(false)
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    // Load user data
    if (typeof window !== "undefined") {
      try {
        const storedUser = localStorage.getItem("linguaConnectUser")
        if (storedUser) {
          const user = JSON.parse(storedUser)
          setUserData(user)

          // Load settings if they exist
          if (user.settings) {
            setEmailNotifications(user.settings.emailNotifications ?? true)
            setLessonReminders(user.settings.lessonReminders ?? true)
            setMarketingEmails(user.settings.marketingEmails ?? false)
            setDarkMode(user.settings.darkMode ?? false)
          }
        } else {
          router.push(USER_LOGIN_ROUTE)
        }
      } catch (error) {
        console.error("Error loading user data:", error)
      } finally {
        setLoading(false)
      }
    }
  }, [router])

  const handleSaveSettings = () => {
    try {
      // Update user settings
      const updatedUserData = {
        ...userData,
        settings: {
          emailNotifications,
          lessonReminders,
          marketingEmails,
          darkMode,
        },
      }

      // Save to localStorage
      localStorage.setItem("linguaConnectUser", JSON.stringify(updatedUserData))

      setUserData(updatedUserData)

      toast({
        title: "Settings saved",
        description: "Your settings have been updated successfully",
      })
    } catch (error) {
      console.error("Error saving settings:", error)
      toast({
        title: "Error",
        description: "An error occurred while saving your settings",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="container px-4 py-6 md:px-6 md:py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <p>Loading settings...</p>
        </div>
      </div>
    )
  }

  if (!userData) {
    return null
  }

  const normalizedRole = String(userData.role || "").trim().toLowerCase()
  const showPaymentMethods = normalizedRole !== "admin"

  return (
    <div className="container px-4 py-6 md:px-6 md:py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account preferences</p>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Manage how you receive notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email-notifications">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive emails about your account activity</p>
              </div>
              <Switch id="email-notifications" checked={emailNotifications} onCheckedChange={setEmailNotifications} />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="lesson-reminders">Lesson Reminders</Label>
                <p className="text-sm text-muted-foreground">Get reminders before your scheduled lessons</p>
              </div>
              <Switch id="lesson-reminders" checked={lessonReminders} onCheckedChange={setLessonReminders} />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="marketing-emails">Marketing Emails</Label>
                <p className="text-sm text-muted-foreground">Receive updates about new features and promotions</p>
              </div>
              <Switch id="marketing-emails" checked={marketingEmails} onCheckedChange={setMarketingEmails} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Customize how the app looks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="dark-mode">Dark Mode</Label>
                <p className="text-sm text-muted-foreground">Use dark theme for the application</p>
              </div>
              <Switch id="dark-mode" checked={darkMode} onCheckedChange={setDarkMode} />
            </div>
          </CardContent>
        </Card>

        {showPaymentMethods ? (
          <PaymentMethods
            userId={userData.id}
            userEmail={userData.email}
            userName={userData.name || `${userData.firstName || ''} ${userData.lastName || ''}`.trim()}
          />
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Manage your account settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="destructive">Delete Account</Button>
            <p className="text-sm text-muted-foreground">
              This will permanently delete your account and all associated data. This action cannot be undone.
            </p>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSaveSettings}>Save Settings</Button>
        </div>
      </div>
    </div>
  )
}
