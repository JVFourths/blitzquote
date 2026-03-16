import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <Zap className="mb-4 h-12 w-12 text-amber-500" />
      <h1 className="text-4xl font-bold">404</h1>
      <p className="mt-2 text-lg text-muted-foreground">
        Page not found. This page doesn&apos;t exist or has been moved.
      </p>
      <div className="mt-6 flex gap-3">
        <Link href="/">
          <Button
            variant="outline"
          >
            Go Home
          </Button>
        </Link>
        <Link href="/dashboard">
          <Button className="bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700">
            Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
