"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  // Hardcoded credentials
  const VALID_USERNAME = "razielrenz";
  const VALID_PASSWORD = "razielrenz1124";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (email === VALID_USERNAME && password === VALID_PASSWORD) {
      router.push("/dashboard");
    } else {
      setError("ACCESS_DENIED: INVALID_CREDENTIALS");
    }
  };

  return (
    <div className="bg-[#0a0b10] min-h-screen flex flex-col font-display text-[#eca013] overflow-hidden relative">
      {/* Background Grid */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(#1a160f_1px,transparent_1px)] bg-[size:32px_32px]"></div>
      
      {/* Top Navigation */}
      <header className="flex items-center justify-between whitespace-nowrap border-b border-[#eca013]/20 px-6 py-3 bg-[#0a0b10] z-10">
        <div className="flex items-center gap-3 text-[#eca013]">
          <div className="size-6 text-[#eca013]">
            <span className="material-symbols-outlined text-[24px] phosphor-glow">terminal</span>
          </div>
          <h2 className="text-[#eca013] text-lg font-bold leading-tight tracking-[0.1em] phosphor-glow uppercase">
            System: Terminal_Auth
          </h2>
        </div>
        <div className="text-[10px] font-mono text-[#eca013]/50">SECURE_CONNECTION_ESTABLISHED</div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 z-10">
        <div className="w-full max-w-[440px] bg-[#0a0b10]/90 p-8 md:p-10 rounded shadow-[0_0_50px_rgba(236,160,19,0.1)] border border-[#eca013]/30 backdrop-blur-sm relative overflow-hidden">
            {/* Corner Markers */}
            <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#eca013]"></div>
            <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#eca013]"></div>
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#eca013]"></div>
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#eca013]"></div>

          {/* Headline Section */}
          <div className="mb-8 text-center">
            <h1 className="text-[#eca013] tracking-widest text-2xl font-bold leading-tight uppercase phosphor-glow">
              &gt; AUTHENTICATE
            </h1>
            <p className="text-[#eca013]/60 text-xs font-mono leading-normal mt-2 tracking-widest">
              PLEASE INPUT CREDENTIALS TO PROCEED
            </p>
          </div>

          {/* Login Form */}
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-900/10 border border-red-500/50 rounded">
                <p className="text-xs text-red-500 font-mono text-center tracking-widest uppercase flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-sm">warning</span>
                    {error}
                </p>
              </div>
            )}

            {/* Username Field */}
            <div className="flex flex-col w-full group">
              <label className="flex flex-col w-full">
                <p className="text-[#eca013]/80 text-[10px] font-bold tracking-widest uppercase pb-2 pl-1">
                  User_ID
                </p>
                <div className="flex items-center border-b border-[#eca013]/30 focus-within:border-[#eca013] bg-[#eca013]/5 transition-colors">
                    <div className="pl-3 text-[#eca013]/50 font-mono">&gt;</div>
                    <input
                      className="flex w-full min-w-0 resize-none overflow-hidden bg-transparent border-none text-[#eca013] focus:ring-0 h-10 placeholder:text-[#eca013]/20 p-2 text-sm font-mono tracking-wider"
                      placeholder="ENTER_ID"
                      type="text"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                </div>
              </label>
            </div>

            {/* Password Field */}
            <div className="flex flex-col w-full group">
              <label className="flex flex-col w-full">
                <p className="text-[#eca013]/80 text-[10px] font-bold tracking-widest uppercase pb-2 pl-1">
                  Access_Key
                </p>
                <div className="flex items-center border-b border-[#eca013]/30 focus-within:border-[#eca013] bg-[#eca013]/5 transition-colors">
                    <div className="pl-3 text-[#eca013]/50 font-mono">*</div>
                    <input
                      className="flex w-full min-w-0 resize-none overflow-hidden bg-transparent border-none text-[#eca013] focus:ring-0 h-10 placeholder:text-[#eca013]/20 p-2 text-sm font-mono tracking-wider"
                      placeholder="ENTER_KEY"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="px-3 text-[#eca013]/50 hover:text-[#eca013] transition-colors"
                    >
                        <span className="material-symbols-outlined text-[18px]">
                        {showPassword ? "visibility_off" : "visibility"}
                        </span>
                    </button>
                </div>
              </label>
            </div>

            {/* Sign In Button */}
            <button
              className="w-full flex cursor-pointer items-center justify-center rounded h-12 bg-[#eca013] text-[#0a0b10] text-sm font-bold tracking-[0.1em] mt-4 hover:opacity-90 tactile-btn transition-all uppercase"
              type="submit"
            >
              Init_Session
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center z-10">
        <p className="text-[10px] text-[#eca013]/30 font-mono tracking-widest uppercase">
          Sys_Admin: marmalade1124 // Term_v1.0.4
        </p>
      </footer>
    </div>
  );
}
