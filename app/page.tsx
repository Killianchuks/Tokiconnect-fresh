import Link from "next/link"
import { ArrowRight, MessageCircle, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SiteHeader } from "@/components/site-header"

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <main className="flex-1">
        <section className="w-full min-h-[calc(100vh-4rem)] bg-background flex items-center">
          <div className="container px-4 py-16 md:px-6 md:py-24 lg:py-32">
            <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-16">
              <div className="flex flex-col justify-center space-y-6">
                <div className="space-y-4">
                  <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-[3.5rem] leading-tight text-foreground">
                    Learn Languages with Native Speakers
                  </h1>
                  <p className="text-muted-foreground text-lg md:text-xl leading-relaxed max-w-lg">
                    Connect with native speakers for personalized language lessons. Improve your conversational skills with real-world practice.
                  </p>
                </div>
                <div className="flex flex-col gap-3 min-[400px]:flex-row pt-2">
                  <Link href="/signup?role=student">
                    <Button className="w-full bg-[#8B5A2B] hover:bg-[#7a4d25] text-white px-6 py-2.5">Find a Teacher</Button>
                  </Link>
                  <Link href="/signup?role=teacher">
                    <Button variant="outline" className="w-full border-[#8B5A2B] text-[#8B5A2B] hover:bg-[#8B5A2B]/10 px-6 py-2.5">
                      Become a Teacher
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="flex items-center justify-center lg:justify-end">
                <div className="rounded-xl bg-[#8B5A2B] p-12 md:p-16 flex flex-col items-center justify-center w-full max-w-[420px] aspect-square">
                  <div className="flex gap-3 mb-6">
                    <div className="w-6 h-6 bg-white rounded-full"></div>
                    <div className="w-6 h-6 bg-white rounded-full"></div>
                    <div className="w-6 h-6 bg-white rounded-full"></div>
                  </div>
                  <span className="text-white text-4xl md:text-5xl font-light tracking-[0.3em] mb-2">TOKI</span>
                  <span className="text-white text-xl md:text-2xl font-light tracking-[0.25em]">CONNECT</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="w-full py-12 md:py-24 lg:py-32 bg-muted scroll-mt-16">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">Platform Features</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Everything you need to learn or teach languages effectively
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3 lg:gap-12 mt-8">
              <div className="flex flex-col items-center space-y-2 rounded-lg border p-6 shadow-sm">
                <Users className="h-12 w-12 text-[#8B5A2B]" />
                <h3 className="text-xl font-bold">Native Teachers</h3>
                <p className="text-center text-muted-foreground">
                  Learn from verified native speakers who understand the cultural nuances of the language
                </p>
              </div>
              <div className="flex flex-col items-center space-y-2 rounded-lg border p-6 shadow-sm">
                <MessageCircle className="h-12 w-12 text-[#8B5A2B]" />
                <h3 className="text-xl font-bold">Live Conversations</h3>
                <p className="text-center text-muted-foreground">
                  Practice through video calls and messaging with real-time feedback
                </p>
              </div>
              <div className="flex flex-col items-center space-y-2 rounded-lg border p-6 shadow-sm">
                <div className="h-12 w-12 bg-[#8B5A2B] rounded-lg flex flex-col items-center justify-center">
                  <div className="flex gap-1 mb-1">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                  <span className="text-white text-[8px] font-light tracking-wider">TOKI</span>
                </div>
                <h3 className="text-xl font-bold">Multiple Languages</h3>
                <p className="text-center text-muted-foreground">
                  Choose from dozens of languages with teachers from around the world
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="w-full py-12 md:py-24 lg:py-32 scroll-mt-16">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">How It Works</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Simple steps to start learning or teaching
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-3 mt-8">
              <div className="flex flex-col items-center space-y-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#8B5A2B] text-white">1</div>
                <h3 className="text-xl font-bold">Create an Account</h3>
                <p className="text-center text-muted-foreground">
                  Sign up as a student looking to learn or a teacher ready to share your language
                </p>
              </div>
              <div className="flex flex-col items-center space-y-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#8B5A2B] text-white">2</div>
                <h3 className="text-xl font-bold">Connect</h3>
                <p className="text-center text-muted-foreground">
                  Browse profiles, check availability, and book sessions that fit your schedule
                </p>
              </div>
              <div className="flex flex-col items-center space-y-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#8B5A2B] text-white">3</div>
                <h3 className="text-xl font-bold">Learn & Earn</h3>
                <p className="text-center text-muted-foreground">
                  Students improve their skills while teachers earn from sharing their native language
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="testimonials" className="w-full py-12 md:py-24 lg:py-32 bg-muted scroll-mt-16">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">What Our Users Say</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Hear from students and teachers using our platform
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2 lg:gap-12 mt-8">
              <div className="flex flex-col space-y-4 rounded-lg border p-6 shadow-sm">
                <div className="flex items-center space-x-4">
                  <div className="h-10 w-10 rounded-full bg-gray-200"></div>
                  <div>
                    <h3 className="text-lg font-bold">Sarah K.</h3>
                    <p className="text-sm text-muted-foreground">Learning Spanish</p>
                  </div>
                </div>
                <p className="text-muted-foreground">
                  "I've tried many language apps, but nothing compares to practicing with a native speaker. My Spanish
                  has improved dramatically in just a few months!"
                </p>
              </div>
              <div className="flex flex-col space-y-4 rounded-lg border p-6 shadow-sm">
                <div className="flex items-center space-x-4">
                  <div className="h-10 w-10 rounded-full bg-gray-200"></div>
                  <div>
                    <h3 className="text-lg font-bold">Miguel R.</h3>
                    <p className="text-sm text-muted-foreground">Teaching Spanish</p>
                  </div>
                </div>
                <p className="text-muted-foreground">
                  "Teaching on this platform has been rewarding both financially and culturally. I've connected with
                  students worldwide while earning a steady income."
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full py-12 md:py-24 lg:py-32 border-t">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">Ready to Get Started?</h2>
                <p className="max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Join our community of language learners and teachers today
                </p>
              </div>
              <div className="flex flex-col gap-2 min-[400px]:flex-row">
                <Link href="/login?role=student">
                  <Button size="lg" className="w-full bg-[#8B5A2B] hover:bg-[#8B5A2B]/90">
                    Find a Teacher
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/login?role=teacher">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full border-[#8B5A2B] text-[#8B5A2B] hover:bg-[#8B5A2B]/10"
                  >
                    Become a Teacher
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t py-6 md:py-0 bg-[#8B5A2B] text-white">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row px-4 md:px-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white/10 rounded-lg flex flex-col items-center justify-center p-1">
              <div className="flex gap-0.5 mb-0.5">
                <div className="w-1 h-1 bg-white rounded-full"></div>
                <div className="w-1 h-1 bg-white rounded-full"></div>
                <div className="w-1 h-1 bg-white rounded-full"></div>
              </div>
              <span className="text-white text-[5px] font-light tracking-wider">TOKI</span>
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
