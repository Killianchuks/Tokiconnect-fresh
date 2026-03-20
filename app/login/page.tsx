"use client"

import { useEffect, useState, type FormEvent, type ChangeEvent } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SiteHeader } from "@/components/site-header"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"

export default function LoginPage() {
  const [callbackUrl, setCallbackUrl] = useState("/dashboard")
  const [role, setRole] = useState("student")

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setCallbackUrl(params.get("callbackUrl") || "/dashboard")
    setRole(params.get("role") || "student")
  }, [])

  // Basic email validation
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    // Client-side validation
    if (!isValidEmail(email)) {
      setError("Please enter a valid email address")
      setIsLoading(false)
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long")
      setIsLoading(false)
      return
    }

    try {
      console.log("Attempting login for:", email)
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()
      console.log("Login response:", data)

      if (!response.ok) {
        throw new Error(data.message || "Login failed")
      }

      if (data.success && data.user) {
        // Store user and token in localStorage
        localStorage.setItem(
          "linguaConnectUser",
          JSON.stringify({
            ...data.user,
            isLoggedIn: true,
          }),
        )

        if (data.token) {
          localStorage.setItem("auth_token", data.token)
        }

        console.log("User logged in successfully, redirecting to:", callbackUrl)

        // Use a small delay to ensure localStorage is updated before navigation
        setTimeout(() => {
          window.location.href = callbackUrl
        }, 100)

        return // Add this to prevent further execution
      } else {
        throw new Error("Invalid response from server")
      }
    } catch (err) {
      console.error("Login error:", err)
      setError(err instanceof Error ? err.message : "Invalid email or password. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#f5f5f5]">
      <SiteHeader showAuthButtons={false} />
      <main className="flex-1 flex items-center justify-center px-4 py-10 md:py-16">
        <Card className="w-full max-w-md border-[#c9cfda] shadow-sm">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <div className="relative w-20 h-20 bg-[#8B5A2B]">
                <Image
                  src="/logo.png"
                  alt="TOKI CONNECT Logo"
                  fill
                  className="object-contain"
                  onError={(e) => {
                    // Fallback to text if image fails to load
                    e.currentTarget.style.display = "none"
                    e.currentTarget.parentElement?.classList.add(
                      "bg-[#8B5A2B]",
                      "rounded-full",
                      "flex",
                      "items-center",
                      "justify-center",
                    )
                    const textNode = document.createElement("span")
                    textNode.textContent = "TC"
                    textNode.className = "text-white text-2xl font-bold"
                    e.currentTarget.parentElement?.appendChild(textNode)
                  }}
                />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
            <CardDescription>Sign in to your account</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    className="focus:ring-2 focus:ring-[#8B5A2B] focus:border-[#8B5A2B]"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link href="/forgot-password" className="text-sm text-[#8B5A2B] hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="focus:ring-2 focus:ring-[#8B5A2B] focus:border-[#8B5A2B]"
                  />
                </div>
                <Button type="submit" className="w-full bg-[#8B5A2B] hover:bg-[#8B5A2B]/90" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign in"
                  )}
                </Button>
              </div>
            </form>
            <div className="mt-4 text-center text-sm">
              <p>
                Don't have an account?{" "}
                <Link href={`/signup?role=${role}`} className="text-[#8B5A2B] hover:underline">
                  Sign up
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
      <footer className="border-t py-6 md:py-0 bg-[#8B5A2B] text-white">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row px-4 md:px-6">
          <div className="flex items-center gap-2">
            <div className="relative w-8 h-8 bg-[#8B5A2B] rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">TC</span>
              <Image
                src="/logo.png"
                alt="TOKI CONNECT Logo"
                fill
                className="object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = "none"
                }}
              />
            </div>
            <p className="text-sm">© 2025 TOKI CONNECT. All rights reserved.</p>
          </div>
          <nav className="flex gap-4 sm:gap-6">
            <Link href="#" className="text-sm font-medium hover:underline underline-offset-4">
              Terms
            </Link>
            <Link href="#" className="text-sm font-medium hover:underline underline-offset-4">
              Privacy
            </Link>
            <Link
              href="mailto:support@tokiconnect.com"
              className="text-sm font-medium hover:underline underline-offset-4"
            >
              Support
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
