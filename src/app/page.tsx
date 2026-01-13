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
      setError("Invalid username or password");
    }
  };

  return (
    <div className="bg-[#f6f7f8] dark:bg-[#101c22] min-h-screen flex flex-col font-[family-name:var(--font-inter)]">
      {/* Top Navigation */}
      <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-[#f0f3f4] dark:border-white/10 px-6 py-3 bg-white dark:bg-[#101c22]">
        <div className="flex items-center gap-3 text-[#111618] dark:text-white">
          <div className="size-6 text-[#13a4ec]">
            <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path
                clipRule="evenodd"
                d="M39.475 21.6262C40.358 21.4363 40.6863 21.5589 40.7581 21.5934C40.7876 21.655 40.8547 21.857 40.8082 22.3336C40.7408 23.0255 40.4502 24.0046 39.8572 25.2301C38.6799 27.6631 36.5085 30.6631 33.5858 33.5858C30.6631 36.5085 27.6632 38.6799 25.2301 39.8572C24.0046 40.4502 23.0255 40.7407 22.3336 40.8082C21.8571 40.8547 21.6551 40.7875 21.5934 40.7581C21.5589 40.6863 21.4363 40.358 21.6262 39.475C21.8562 38.4054 22.4689 36.9657 23.5038 35.2817C24.7575 33.2417 26.5497 30.9744 28.7621 28.762C30.9744 26.5497 33.2417 24.7574 35.2817 23.5037C36.9657 22.4689 38.4054 21.8562 39.475 21.6262ZM4.41189 29.2403L18.7597 43.5881C19.8813 44.7097 21.4027 44.9179 22.7217 44.7893C24.0585 44.659 25.5148 44.1631 26.9723 43.4579C29.9052 42.0387 33.2618 39.5667 36.4142 36.4142C39.5667 33.2618 42.0387 29.9052 43.4579 26.9723C44.1631 25.5148 44.659 24.0585 44.7893 22.7217C44.9179 21.4027 44.7097 19.8813 43.5881 18.7597L29.2403 4.41187C27.8527 3.02428 25.8765 3.02573 24.2861 3.36776C22.6081 3.72863 20.7334 4.58419 18.8396 5.74801C16.4978 7.18716 13.9881 9.18353 11.5858 11.5858C9.18354 13.988 7.18717 16.4978 5.74802 18.8396C4.58421 20.7334 3.72865 22.6081 3.36778 24.2861C3.02574 25.8765 3.02429 27.8527 4.41189 29.2403Z"
                fill="currentColor"
                fillRule="evenodd"
              />
            </svg>
          </div>
          <h2 className="text-[#111618] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">
            Canvas Notes
          </h2>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-[440px] bg-white dark:bg-[#1c2a33] p-8 md:p-10 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-gray-100 dark:border-white/5">
          {/* Headline Section */}
          <div className="mb-8">
            <h1 className="text-[#111618] dark:text-white tracking-tight text-[32px] font-bold leading-tight text-center">
              Welcome back
            </h1>
            <p className="text-[#617c89] dark:text-gray-400 text-base font-normal leading-normal text-center mt-2">
              Your ideas, organized visually.
            </p>
          </div>

          {/* Login Form */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>
              </div>
            )}

            {/* Username Field */}
            <div className="flex flex-col w-full">
              <label className="flex flex-col w-full">
                <p className="text-[#111618] dark:text-gray-200 text-sm font-medium leading-normal pb-2">
                  Username
                </p>
                <input
                  className="flex w-full min-w-0 resize-none overflow-hidden rounded-lg text-[#111618] dark:text-white focus:outline-0 focus:ring-2 focus:ring-[#13a4ec]/20 border border-[#dbe2e6] dark:border-gray-700 bg-white dark:bg-[#101c22] focus:border-[#13a4ec] h-12 placeholder:text-[#617c89] dark:placeholder:text-gray-500 p-4 text-base font-normal leading-normal"
                  placeholder="Enter your username"
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
            </div>

            {/* Password Field */}
            <div className="flex flex-col w-full">
              <div className="flex justify-between items-center pb-2">
                <p className="text-[#111618] dark:text-gray-200 text-sm font-medium leading-normal">Password</p>
              </div>
              <label className="flex flex-col w-full">
                <div className="flex w-full items-stretch rounded-lg">
                  <input
                    className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-[#111618] dark:text-white focus:outline-0 focus:ring-2 focus:ring-[#13a4ec]/20 border border-[#dbe2e6] dark:border-gray-700 bg-white dark:bg-[#101c22] focus:border-[#13a4ec] h-12 placeholder:text-[#617c89] dark:placeholder:text-gray-500 px-4 rounded-r-none border-r-0 text-base font-normal leading-normal"
                    placeholder="Enter your password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[#617c89] dark:text-gray-500 flex border border-[#dbe2e6] dark:border-gray-700 bg-white dark:bg-[#101c22] items-center justify-center px-3 rounded-r-lg border-l-0 cursor-pointer hover:text-[#13a4ec] transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {showPassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
              </label>
            </div>

            {/* Sign In Button */}
            <button
              className="w-full flex cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-5 bg-[#13a4ec] text-white text-base font-bold leading-normal tracking-[0.015em] mt-2 transition-opacity hover:opacity-90"
              type="submit"
            >
              <span className="truncate">Sign In</span>
            </button>
          </form>
        </div>

        {/* Canvas Brand Elements */}
        <div className="mt-12 flex items-center gap-8 opacity-40 grayscale pointer-events-none">
          <div className="h-10 w-10 border-2 border-dashed border-gray-400 rounded-lg flex items-center justify-center">
            <span className="material-symbols-outlined text-gray-400">add</span>
          </div>
          <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
          <div className="h-10 w-10 border-2 border-dashed border-gray-400 rounded-full flex items-center justify-center">
            <span className="material-symbols-outlined text-gray-400">draw</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 text-center">
        <p className="text-xs text-[#617c89] dark:text-gray-500">
          © 2024 Canvas Notes. Designed for focused creativity.
        </p>
      </footer>
    </div>
  );
}
