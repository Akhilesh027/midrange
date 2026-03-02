import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMidrangeAuth } from "@/context/MidrangeAuthContext";
import { toast } from "sonner";
import { GoogleLogin } from "@react-oauth/google";

const Signup = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
  });

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const { signup, googleLogin } = useMidrangeAuth();
  const navigate = useNavigate();

  const isAnyLoading = isLoading || isGoogleLoading;

  const passwordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  const strength = passwordStrength(formData.password);

  const getPasswordStrengthColor = () => {
    if (strength === 0) return "bg-muted";
    if (strength === 1) return "bg-destructive";
    if (strength === 2) return "bg-yellow-500";
    if (strength >= 3) return "bg-green-500";
    return "bg-muted";
  };

  const getPasswordStrengthText = () => {
    if (strength === 0) return "";
    if (strength === 1) return "Weak";
    if (strength === 2) return "Fair";
    if (strength === 3) return "Good";
    if (strength === 4) return "Strong";
    return "";
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, password: e.target.value });
    if (!passwordTouched) setPasswordTouched(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (!formData.fullName.trim()) {
      toast.error("Please enter your full name");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim() || !emailRegex.test(formData.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (formData.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    if (strength < 2) {
      toast.error("Password is too weak. Use uppercase letters and numbers");
      return;
    }

    if (!termsAccepted) {
      toast.error("Please accept the Terms of Service and Privacy Policy");
      return;
    }

    setIsLoading(true);

    try {
      const ok = await signup(
        formData.fullName.trim(),
        formData.email.trim(),
        formData.phone.trim(),
        formData.password
      );

      if (ok) {
        toast.success("🎉 Account created successfully! Welcome to JS Gallor Mid-range.");
        navigate("/");
      } else {
        toast.error("Failed to create account. Please try again.");
      }
    } catch (err: any) {
      console.error("Signup error:", err);
      toast.error(err?.message || "Signup failed");
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Google signup/login handler
  const handleGoogleSuccess = async (credential?: string) => {
    if (!credential) {
      toast.error("Google sign-in failed (no credential).");
      return;
    }

    setIsGoogleLoading(true);
    try {
      // ✅ Use context (stores token/user + sets Authorization header)
      const ok = await googleLogin(credential);

      if (ok) {
        toast.success("✅ Signed up with Google!");
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-surface-1 to-background p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3 group">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center font-bold text-primary-foreground text-2xl shadow-lg shadow-amber-500/30 group-hover:scale-105 transition-transform">
              JS
            </div>
          </Link>
          <h1 className="text-2xl font-bold mt-4 bg-gradient-to-r from-amber-600 to-amber-400 bg-clip-text text-transparent">
            JS Gallor Mid-range
          </h1>
        </div>

        {/* Signup Card */}
        <div className="glass-card p-8 border border-amber-200/20">
          <h2 className="text-2xl font-bold text-foreground mb-2">Create Account</h2>
          <p className="text-muted-foreground mb-6">Join us for premium furniture collections</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Full Name
              </label>
              <Input
                type="text"
                placeholder="Enter your full name"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="bg-secondary border-border/50 focus:border-amber-500 h-12"
                disabled={isAnyLoading}
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Email Address
              </label>
              <Input
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-secondary border-border/50 focus:border-amber-500 h-12"
                disabled={isAnyLoading}
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Phone Number <span className="text-muted-foreground/70">(Optional)</span>
              </label>
              <Input
                type="tel"
                placeholder="Enter your phone number"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="bg-secondary border-border/50 focus:border-amber-500 h-12"
                disabled={isAnyLoading}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Password
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  value={formData.password}
                  onChange={handlePasswordChange}
                  className="bg-secondary border-border/50 focus:border-amber-500 h-12 pr-12"
                  disabled={isAnyLoading}
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  disabled={isAnyLoading}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {/* Password strength indicator */}
              {passwordTouched && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1 flex-1">
                      {[1, 2, 3, 4].map((level) => (
                        <div
                          key={level}
                          className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                            strength >= level ? getPasswordStrengthColor() : "bg-muted"
                          }`}
                        />
                      ))}
                    </div>
                    {formData.password && (
                      <span
                        className={`ml-2 text-xs font-medium ${
                          strength === 1
                            ? "text-destructive"
                            : strength === 2
                            ? "text-yellow-500"
                            : strength >= 3
                            ? "text-green-500"
                            : "text-muted"
                        }`}
                      >
                        {getPasswordStrengthText()}
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-muted-foreground space-y-1">
                    <div className="flex items-center gap-2">
                      <Check className={`w-3 h-3 ${formData.password.length >= 8 ? "text-green-500" : "text-muted"}`} />
                      <span className={formData.password.length >= 8 ? "text-green-500" : ""}>At least 8 characters</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className={`w-3 h-3 ${/[A-Z]/.test(formData.password) ? "text-green-500" : "text-muted"}`} />
                      <span className={/[A-Z]/.test(formData.password) ? "text-green-500" : ""}>One uppercase letter</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className={`w-3 h-3 ${/[0-9]/.test(formData.password) ? "text-green-500" : "text-muted"}`} />
                      <span className={/[0-9]/.test(formData.password) ? "text-green-500" : ""}>One number</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className={`w-3 h-3 ${/[^A-Za-z0-9]/.test(formData.password) ? "text-green-500" : "text-muted"}`} />
                      <span className={/[^A-Za-z0-9]/.test(formData.password) ? "text-green-500" : ""}>One special character</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-start gap-3 pt-2">
              <input
                type="checkbox"
                id="terms"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-1 rounded border-border bg-secondary accent-amber-500"
                disabled={isAnyLoading}
                required
              />
              <label htmlFor="terms" className="text-sm text-muted-foreground cursor-pointer">
                I agree to the{" "}
                <a href="#" className="text-amber-600 hover:text-amber-700 hover:underline font-medium">
                  Terms of Service
                </a>{" "}
                and{" "}
                <a href="#" className="text-amber-600 hover:text-amber-700 hover:underline font-medium">
                  Privacy Policy
                </a>
              </label>
            </div>

            <Button
              type="submit"
              variant="gold"
              size="lg"
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold shadow-lg shadow-amber-500/20"
              disabled={isAnyLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-card px-4 text-muted-foreground">or continue with</span>
            </div>
          </div>

          {/* ✅ Real Google Button */}
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
            <p className="mt-3 text-xs text-muted-foreground text-center">Signing in with Google...</p>
          )}

          <p className="text-center text-muted-foreground text-sm mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-amber-600 hover:text-amber-700 hover:underline font-medium">
              Sign In
            </Link>
          </p>
        </div>

        {/* Back to Home */}
        <p className="text-center mt-6">
          <Link
            to="/"
            className="text-muted-foreground hover:text-amber-600 hover:underline text-sm transition-colors flex items-center justify-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </Link>
        </p>

        {/* Benefits */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p className="mb-2">✨ Create a Mid-range account to enjoy:</p>
          <div className="flex flex-wrap justify-center gap-4">
            <span className="inline-flex items-center gap-1">
              <Check className="w-4 h-4 text-green-500" />
              Premium furniture collections
            </span>
            <span className="inline-flex items-center gap-1">
              <Check className="w-4 h-4 text-green-500" />
              Loyalty rewards program
            </span>
            <span className="inline-flex items-center gap-1">
              <Check className="w-4 h-4 text-green-500" />
              Priority customer support
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;