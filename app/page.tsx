import Link from "next/link"
import Image from "next/image"
import { ArrowRight, CheckCircle2, MessageCircle, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SiteHeader } from "@/components/site-header"

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <main className="flex-1">
        <section className="w-full min-h-[calc(100vh-4rem)] bg-[#f3f3f3] flex items-center">
          <div className="container max-w-6xl px-4 py-12 md:px-6 md:py-20">
            <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
              <div className="space-y-7">
                <div className="space-y-4">
                  <h1 className="max-w-[560px] text-4xl font-bold leading-[1.05] tracking-tight text-[#0a1326] sm:text-5xl lg:text-[56px]">
                    Learn Languages with Native Speakers
                  </h1>
                  <p className="max-w-[620px] text-lg leading-relaxed text-[#6b7280] md:text-xl">
                    Connect with native speakers for personalized language lessons. Improve your conversational skills
                    with real-world practice.
                  </p>
                </div>
                <div className="flex flex-col gap-3 min-[400px]:flex-row">
                  <Link href="/signup?role=student">
                    <Button className="w-full bg-[#8B5A2B] px-6 hover:bg-[#8B5A2B]/90">Find a Teacher</Button>
                  </Link>
                  <Link href="/signup?role=teacher">
                    <Button
                      variant="outline"
                      className="w-full border-[#8B5A2B] bg-transparent px-6 text-[#8B5A2B] hover:bg-[#8B5A2B]/10"
                    >
                      Become a Teacher
                    </Button>
                  </Link>
                </div>
                <div className="grid gap-2 text-sm text-[#5b6270] sm:grid-cols-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#8B5A2B]" />
                    Verified native teachers
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#8B5A2B]" />
                    Flexible schedule booking
                  </div>
                </div>
              </div>
              <div className="mx-auto lg:mx-0 relative flex items-center justify-center lg:justify-end">
                <div className="w-full max-w-[500px] rounded-lg bg-[#8B5A2B] p-8 md:p-10">
                  <Image
                    src="/logo.png"
                    alt="TOKI CONNECT Logo"
                    width={560}
                    height={560}
                    className="mx-auto w-full max-w-[420px] rounded-md object-contain"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="w-full scroll-mt-16 bg-white py-16 md:py-20">
          <div className="container max-w-6xl px-4 md:px-6">
            <div className="mb-10 text-center">
              <h2 className="text-3xl font-bold tracking-tight text-[#0a1326] sm:text-4xl">Simple, Clean, Effective</h2>
              <p className="mx-auto mt-3 max-w-2xl text-[#6b7280]">
                Everything is designed to keep the learning experience focused and distraction-free.
              </p>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              <div className="rounded-xl border border-[#ececec] bg-[#fafafa] p-6">
                <Users className="h-8 w-8 text-[#8B5A2B]" />
                <h3 className="mt-4 text-lg font-semibold text-[#0a1326]">Native Teachers</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#667085]">
                  Learn with teachers who speak naturally and guide you through real-world conversations.
                </p>
              </div>
              <div className="rounded-xl border border-[#ececec] bg-[#fafafa] p-6">
                <MessageCircle className="h-8 w-8 text-[#8B5A2B]" />
                <h3 className="mt-4 text-lg font-semibold text-[#0a1326]">Live Practice</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#667085]">
                  Build confidence with practical speaking sessions, feedback, and repeated exposure.
                </p>
              </div>
              <div className="rounded-xl border border-[#ececec] bg-[#fafafa] p-6">
                <CheckCircle2 className="h-8 w-8 text-[#8B5A2B]" />
                <h3 className="mt-4 text-lg font-semibold text-[#0a1326]">Clear Progress</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#667085]">
                  Track your consistency and improve naturally through routine and conversation quality.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="w-full scroll-mt-16 bg-[#f7f7f7] py-16 md:py-20">
          <div className="container max-w-6xl px-4 md:px-6">
            <div className="mb-10 text-center">
              <h2 className="text-3xl font-bold tracking-tight text-[#0a1326] sm:text-4xl">How It Works</h2>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-xl bg-white p-6">
                <p className="text-sm font-semibold text-[#8B5A2B]">Step 1</p>
                <h3 className="mt-2 text-xl font-semibold text-[#0a1326]">Create Your Account</h3>
                <p className="mt-2 text-sm text-[#667085]">Choose whether you are learning or teaching and set your profile in minutes.</p>
              </div>
              <div className="rounded-xl bg-white p-6">
                <p className="text-sm font-semibold text-[#8B5A2B]">Step 2</p>
                <h3 className="mt-2 text-xl font-semibold text-[#0a1326]">Book a Session</h3>
                <p className="mt-2 text-sm text-[#667085]">Find the right teacher, match time zones, and reserve your preferred slots.</p>
              </div>
              <div className="rounded-xl bg-white p-6">
                <p className="text-sm font-semibold text-[#8B5A2B]">Step 3</p>
                <h3 className="mt-2 text-xl font-semibold text-[#0a1326]">Practice and Improve</h3>
                <p className="mt-2 text-sm text-[#667085]">Learn consistently, get feedback, and build fluency through meaningful conversation.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="testimonials" className="w-full scroll-mt-16 bg-white py-16 md:py-20">
          <div className="container max-w-6xl px-4 md:px-6">
            <div className="mb-10 text-center">
              <h2 className="text-3xl font-bold tracking-tight text-[#0a1326] sm:text-4xl">What Users Say</h2>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <blockquote className="rounded-xl border border-[#ececec] p-6 text-[#4b5563]">
                "I improved my Spanish speaking confidence faster here than with apps alone. The sessions feel natural and
                focused."
                <footer className="mt-4 text-sm font-semibold text-[#0a1326]">Sarah K. · Student</footer>
              </blockquote>
              <blockquote className="rounded-xl border border-[#ececec] p-6 text-[#4b5563]">
                "The platform is simple to use and helps me teach effectively. Scheduling and communication are very clear."
                <footer className="mt-4 text-sm font-semibold text-[#0a1326]">Miguel R. · Teacher</footer>
              </blockquote>
            </div>
          </div>
        </section>

        <section className="w-full border-t bg-[#f9f9f9] py-14">
          <div className="container max-w-6xl px-4 text-center md:px-6">
            <h2 className="text-3xl font-bold tracking-tight text-[#0a1326] sm:text-4xl">Ready to Get Started?</h2>
            <p className="mx-auto mt-3 max-w-2xl text-[#6b7280]">Join learners and teachers building language confidence every day.</p>
            <div className="mt-6 flex flex-col justify-center gap-3 min-[400px]:flex-row">
              <Link href="/login?role=student">
                <Button size="lg" className="w-full bg-[#8B5A2B] hover:bg-[#8B5A2B]/90">
                  Find a Teacher
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login?role=teacher">
                <Button variant="outline" size="lg" className="w-full border-[#8B5A2B] text-[#8B5A2B] hover:bg-[#8B5A2B]/10">
                  Become a Teacher
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t py-6 md:py-0 bg-[#8B5A2B] text-white">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row px-4 md:px-6">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="TOKI CONNECT Logo" width={30} height={30} />
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
