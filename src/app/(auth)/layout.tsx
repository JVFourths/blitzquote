import { Zap } from "lucide-react";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <Zap className="h-6 w-6 text-amber-500" />
        <span className="text-xl font-bold">BlitzQuote</span>
      </Link>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
