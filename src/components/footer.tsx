import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto border-t py-6">
      <div className="container flex flex-col items-center justify-between gap-4 md:h-14 md:flex-row">
        <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
          Built with{" "}
          <Link
            href="https://elevenlabs.io"
            target="_blank"
            rel="noreferrer"
            className="font-medium underline underline-offset-4"
          >
            ElevenLabs
          </Link>
          ,{" "}
          <Link
            href="https://deepseek.ai"
            target="_blank"
            rel="noreferrer"
            className="font-medium underline underline-offset-4"
          >
            DeepSeek
          </Link>
          , and{" "}
          <Link
            href="https://openai.com/research/whisper"
            target="_blank"
            rel="noreferrer"
            className="font-medium underline underline-offset-4"
          >
            Whisper
          </Link>
        </p>
        <nav className="flex items-center space-x-4 text-sm">
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/help">Help</Link>
        </nav>
      </div>
    </footer>
  );
}
