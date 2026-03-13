import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMidrangeAuth } from "@/context/MidrangeAuthContext";
import { toast } from "sonner";
import { GoogleLogin } from "@react-oauth/google";

// Optional: remember email only (no password)
const REMEMBER_EMAIL_KEY = "midrange_remember_email";

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  const { login, googleLogin } = useMidrangeAuth();
  const navigate = useNavigate();

  const isAnyLoading = isLoading || isGoogleLoading;

  useEffect(() => {
    const savedEmail = localStorage.getItem(REMEMBER_EMAIL_KEY);
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);
    try {
      const ok = await login(email.trim(), password);

      if (ok) {
        if (rememberMe) localStorage.setItem(REMEMBER_EMAIL_KEY, email.trim());
        else localStorage.removeItem(REMEMBER_EMAIL_KEY);

        toast.success("🎉 Welcome back to JS Gallor Mid-range!");
        navigate("/");
      } else {
        toast.error("Invalid credentials. Please try again.");
      }
    } catch (err: any) {
      console.error("Login error:", err);
      toast.error(err?.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (credential?: string) => {
    if (!credential) {
      toast.error("Google sign-in failed (no credential).");
      return;
    }

    setIsGoogleLoading(true);
    try {
      // ✅ Use context (it stores token/user + sets Authorization header)
      const ok = await googleLogin(credential);

      if (ok) {
        toast.success("✅ Logged in with Google!");
        navigate("/");
      } else {
        toast.error("Google authentication failed");
      }
    } catch (err: any) {
      console.error("Google auth error:", err);
      toast.error(err?.message || "Google authentication failed");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#4f622b] via-[#556b2f] to-[#3f4f22] p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 rounded-full bg-[#eef4df]/5 blur-3xl" />
        <div className="absolute -bottom-1/4 -left-1/4 w-1/2 h-1/2 rounded-full bg-[#eef4df]/5 blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3 group">
            <div className="w-14 h-14 rounded-xl bg-[#eef4df] flex items-center justify-center font-bold text-[#3f4f22] text-2xl shadow-lg shadow-black/10 group-hover:scale-105 transition-transform">
              JS
            </div>
          </Link>
          <h1 className="text-2xl font-bold mt-4 text-[#eef4df]">
            JS Gallor Mid-range
          </h1>
        </div>

        {/* Login Card */}
        <div className="bg-[#4b5e29] rounded-xl border border-white/10 p-8 shadow-xl">
          <h2 className="text-2xl font-bold text-[#f4f7ec] mb-2">Welcome Back</h2>
          <p className="text-[#d6dfbd] mb-6">Sign in to your premium account</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-[#d6dfbd] mb-2 block">
                Email Address
              </label>
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/10 border-white/20 text-[#f7faef] placeholder:text-[#d5dfbb] h-12 focus:border-[#eef4df] focus:ring-[#eef4df]"
                disabled={isAnyLoading}
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#d6dfbd] mb-2 block">
                Password
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-white/10 border-white/20 text-[#f7faef] placeholder:text-[#d5dfbb] h-12 pr-12 focus:border-[#eef4df] focus:ring-[#eef4df]"
                  disabled={isAnyLoading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#d6dfbd] hover:text-[#f4f7ec] transition-colors"
                  disabled={isAnyLoading}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-white/20 bg-white/10 accent-[#eef4df]"
                  disabled={isAnyLoading}
                />
                <span className="text-[#d6dfbd]">Remember me</span>
              </label>
              <Link
                to="/forgot-password"
                className="text-[#eef4df] hover:text-[#f4f7ec] hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full bg-[#eef4df] text-[#3f4f22] hover:bg-[#dde8c2] font-semibold shadow-md"
              disabled={isAnyLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Signing In...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-[#4b5e29] px-4 text-[#d6dfbd]">or continue with</span>
            </div>
          </div>

          {/* ✅ Google only */}
          <div className="flex justify-center">
            <div className={`${isGoogleLoading ? "opacity-60 pointer-events-none" : ""}`}>
              <GoogleLogin
                onSuccess={(resp) => handleGoogleSuccess(resp.credential)}
                onError={() => toast.error("Google sign-in failed")}
                useOneTap
              />
            </div>
          </div>

          {isGoogleLoading && (
            <p className="mt-3 text-xs text-[#d6dfbd] text-center">
              Signing in with Google...
            </p>
          )}

          <p className="text-center text-[#d6dfbd] text-sm mt-6">
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="text-[#eef4df] hover:text-[#f4f7ec] hover:underline font-medium"
            >
              Sign Up
            </Link>
          </p>
        </div>

        {/* Back to Home */}
        <p className="text-center mt-6">
          <Link
            to="/"
            className="text-[#d6dfbd] hover:text-[#eef4df] hover:underline text-sm transition-colors flex items-center justify-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;