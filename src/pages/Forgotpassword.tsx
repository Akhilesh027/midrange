import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import logo from "../Image/JSGALORE.png";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const navigate = useNavigate();

  // 🔐 Get token from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get("token");

    if (!tokenFromUrl) {
      toast.error("Invalid reset link");
      return;
    }

    setToken(tokenFromUrl);
  }, []);

  // 🔥 Submit
  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      toast.error("Please fill all fields");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("https://api.jsgallor.com/api/midrange/reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success("Password reset successful!");

        setTimeout(() => {
          navigate("/login");
        }, 1500);
      } else {
        toast.error(data.message || "Reset failed");
      }
    } catch {
      toast.error("Server error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#4f622b] via-[#556b2f] to-[#3f4f22] flex flex-col md:flex-row">
      
      {/* LEFT SIDE */}
      <div className="md:w-1/2 bg-[#2e3a1f] flex items-center justify-center p-8">
        <div className="text-center text-white max-w-md">
          <img src={logo} className="w-16 mx-auto mb-4" />
          <h1 className="text-4xl font-bold mb-4">Reset Password</h1>
          <p className="text-[#d6dfbd]">
            Secure your account with a new password
          </p>
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="md:w-1/2 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-[#4b5e29] rounded-xl border border-white/10 p-6 md:p-8 shadow-xl">
            
            <h2 className="text-2xl font-bold text-[#f4f7ec] mb-2">
              Create New Password
            </h2>
            <p className="text-[#d6dfbd] mb-6">
              Enter your new secure password
            </p>

            <form onSubmit={handleReset} className="space-y-4">

              {/* New Password */}
              <div>
                <label className="text-sm text-[#d6dfbd] mb-2 block">
                  New Password
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-white/10 border-white/20 text-[#f7faef] h-12 pr-12"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#d6dfbd]"
                  >
                    {showPassword ? <EyeOff /> : <Eye />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="text-sm text-[#d6dfbd] mb-2 block">
                  Confirm Password
                </label>
                <div className="relative">
                  <Input
                    type={showConfirm ? "text" : "password"}
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-white/10 border-white/20 text-[#f7faef] h-12 pr-12"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#d6dfbd]"
                  >
                    {showConfirm ? <EyeOff /> : <Eye />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                className="w-full bg-[#eef4df] text-[#3f4f22] hover:bg-[#dde8c2]"
                disabled={loading}
              >
                {loading ? "Updating..." : "Reset Password"}
              </Button>
            </form>

          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;