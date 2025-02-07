import Link from "next/link"
import { Button } from "@/components/ui/button"

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="font-bold">AI Actor</span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link href="/practice" className="transition-colors hover:text-foreground/80">
              Practice
            </Link>
            <Link href="/scripts" className="transition-colors hover:text-foreground/80">
              Scripts
            </Link>
            <Link href="/history" className="transition-colors hover:text-foreground/80">
              History
            </Link>
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-2">
          <nav className="flex items-center space-x-2">
            <Button variant="ghost" size="sm">
              Sign In
            </Button>
            <Button size="sm">
              Get Started
            </Button>
          </nav>
        </div>
      </div>
    </header>
  )
} 