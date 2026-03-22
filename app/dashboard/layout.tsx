"use client"

import { useState, useEffect, type ReactNode } from "react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import {
  LayoutDashboard,
  Users,
  Calendar,
  BookOpen,
  MessageSquare,
  Settings,
  LogOut,
  Menu,
  X,
  DollarSign,
  Star,
  User,
  HelpCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { SafeImage } from "@/lib/client-utils"
import { isAuthenticated } from "@/lib/auth-check"
import { USER_LOGIN_ROUTE } from "@/lib/auth-route-config"

// Define the user type
interface UserData {
  id: string
  email: string
  role: string
  first_name?: string
  last_name?: string
  name?: string
  language?: string
  hourly_rate?: number
}

interface DashboardLayoutProps {
  children: ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname()
  const [user, setUser] = useState<UserData | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setIsMounted(true)

    try {
      const storedUser = localStorage.getItem("linguaConnectUser")

      if (!storedUser) {
        window.location.href = USER_LOGIN_ROUTE
        return
      }

      const userData = JSON.parse(storedUser) as UserData
      const normalizedUserData: UserData = {
        ...userData,
        role: String(userData.role || "student").trim().toLowerCase() || "student",
      }

      setUser(normalizedUserData)
      localStorage.setItem("linguaConnectUser", JSON.stringify(normalizedUserData))
    } catch (error) {
      console.error("Error parsing user data:", error)
      window.location.href = USER_LOGIN_ROUTE
    }
  }, [])

  useEffect(() => {
    // Check if user is authenticated
    if (!isAuthenticated()) {
      console.log("User not authenticated, redirecting to login")
      router.push(USER_LOGIN_ROUTE)
    } else {
      console.log("User is authenticated, staying on dashboard")
    }
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem("linguaConnectUser")
    window.location.href = USER_LOGIN_ROUTE
  }

  if (!isMounted) {
    return null
  }

  if (!user) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  const isTeacher = String(user.role || "").trim().toLowerCase() === "teacher"

  const navItems = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: <LayoutDashboard className="h-5 w-5" />,
      show: true,
    },
    {
      title: "Find Teachers",
      href: "/dashboard/find-teachers",
      icon: <Users className="h-5 w-5" />,
      show: !isTeacher,
    },
    {
      title: "Schedule",
      href: "/dashboard/schedule",
      icon: <Calendar className="h-5 w-5" />,
      show: true,
    },
    {
      title: "Messages",
      href: "/dashboard/messages",
      icon: <MessageSquare className="h-5 w-5" />,
      show: true,
    },
    {
      title: "Resources",
      href: "/dashboard/resources",
      icon: <BookOpen className="h-5 w-5" />,
      show: true,
    },
    {
      title: "Earnings",
      href: "/dashboard/earnings",
      icon: <DollarSign className="h-5 w-5" />,
      show: isTeacher,
    },
    {
      title: "Reviews",
      href: isTeacher ? "/dashboard/teacher-reviews" : "/dashboard/reviews",
      icon: <Star className="h-5 w-5" />,
      show: true,
    },
    {
      title: "Profile",
      href: "/dashboard/profile",
      icon: <User className="h-5 w-5" />,
      show: true,
    },
    {
      title: "Support",
      href: "/dashboard/support",
      icon: <HelpCircle className="h-5 w-5" />,
      show: true,
    },
    {
      title: "Settings",
      href: "/dashboard/settings",
      icon: <Settings className="h-5 w-5" />,
      show: true,
    },
  ]

  // Logo fallback component
  const LogoFallback = () => (
    <div className="flex items-center justify-center w-full h-full bg-amber-100 rounded-md">
      <span className="font-bold text-amber-800">TC</span>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar for desktop */}
      <aside className="hidden md:flex flex-col w-64 border-r bg-white dark:bg-gray-800 dark:border-gray-700">
        <div className="p-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10">
              <SafeImage src="/logo.png" alt="TOKI CONNECT Logo" width={40} height={40} fallback={<LogoFallback />} />
            </div>
            <span className="font-bold text-lg">TOKI CONNECT</span>
          </Link>
        </div>
        <nav className="flex-1 px-4 py-2 space-y-1">
          {navItems
            .filter((item) => item.show)
            .map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm ${
                  pathname === item.href
                    ? "bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-gray-100"
                    : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                }`}
              >
                {item.icon}
                {item.title}
              </Link>
            ))}
        </nav>
        <div className="p-4 border-t dark:border-gray-700">
          <Button variant="outline" className="w-full flex items-center gap-2 justify-start" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Log out
          </Button>
        </div>
      </aside>

      {/* Mobile navigation */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-white dark:bg-gray-800 border-b dark:border-gray-700 p-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8">
            <SafeImage src="/logo.png" alt="TOKI CONNECT Logo" width={30} height={30} fallback={<LogoFallback />} />
          </div>
          <span className="font-bold">TOKI CONNECT</span>
        </Link>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <div className="p-6 border-b dark:border-gray-700 flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-8 h-8">
                  <SafeImage
                    src="/logo.png"
                    alt="TOKI CONNECT Logo"
                    width={30}
                    height={30}
                    fallback={<LogoFallback />}
                  />
                </div>
                <span className="font-bold">TOKI CONNECT</span>
              </Link>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <X className="h-5 w-5" />
                  <span className="sr-only">Close menu</span>
                </Button>
              </SheetTrigger>
            </div>
            <nav className="flex-1 px-4 py-2 space-y-1">
              {navItems
                .filter((item) => item.show)
                .map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm ${
                      pathname === item.href
                        ? "bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-gray-100"
                        : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                    }`}
                  >
                    {item.icon}
                    {item.title}
                  </Link>
                ))}
              <Button
                variant="outline"
                className="w-full mt-4 flex items-center gap-2 justify-start"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                Log out
              </Button>
            </nav>
          </SheetContent>
        </Sheet>
      </div>

      {/* Main content */}
      <main className="flex-1 md:ml-0 pt-16 md:pt-0">{children}</main>
    </div>
  )
}
