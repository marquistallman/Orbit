import { Outlet } from "react-router";
import { Sparkles } from "lucide-react";

export default function AuthLayout() {
  return (
    <div className="min-h-screen dark bg-[#220901] relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#941B0C]/20 via-transparent to-[#F6AA1C]/20" />
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#941B0C]/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#F6AA1C]/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Logo/Brand */}
        <div className="p-6 md:p-8">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#941B0C] to-[#F6AA1C] flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-semibold bg-gradient-to-r from-[#BC3908] to-[#F6AA1C] bg-clip-text text-transparent">
              Orbit
            </span>
          </div>
        </div>

        {/* Page content */}
        <div className="flex-1 flex items-center justify-center p-4">
          <Outlet />
        </div>

        {/* Footer */}
        <div className="p-6 text-center text-sm text-muted-foreground">
          © 2026 Orbit. Your AI Personal Operator.
        </div>
      </div>
    </div>
  );
}