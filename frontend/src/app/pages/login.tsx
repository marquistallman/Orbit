import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Checkbox } from "../components/ui/checkbox";
import { loginRequest } from "../../api/auth";
import { useAuthStore } from "../../store/authStore";

export default function LoginPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {}
  );
  const [touched, setTouched] = useState<{ email?: boolean; password?: boolean }>(
    {}
  );

  const validateEmail = (email: string) => {
    if (!email) return "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Invalid email format";
    return "";
  };

  const validatePassword = (password: string) => {
    if (!password) return "Password is required";
    if (password.length < 8) return "Password must be at least 8 characters";
    return "";
  };

  const handleBlur = (field: "email" | "password") => {
    setTouched({ ...touched, [field]: true });
    if (field === "email") {
      const error = validateEmail(formData.email);
      setErrors({ ...errors, email: error });
    } else if (field === "password") {
      const error = validatePassword(formData.password);
      setErrors({ ...errors, password: error });
    }
  };

  const handleChange = (field: "email" | "password", value: string) => {
    setFormData({ ...formData, [field]: value });
    if (touched[field]) {
      if (field === "email") {
        const error = validateEmail(value);
        setErrors({ ...errors, email: error });
      } else if (field === "password") {
        const error = validatePassword(value);
        setErrors({ ...errors, password: error });
      }
    }
  };


  const setAuth = useAuthStore((state) => state.setAuth);
  const [authError, setAuthError] = useState<string>("");

  const getInputState = (field: "email" | "password") => {
    if (!touched[field]) return "default";
    if (errors[field]) return "error";
    return "success";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailError = validateEmail(formData.email);
    const passwordError = validatePassword(formData.password);

    if (emailError || passwordError) {
      setErrors({ email: emailError, password: passwordError });
      setTouched({ email: true, password: true });
      return;
    }

    setIsLoading(true);
    setAuthError("");

    try {
      const { user, token } = await loginRequest(formData.email, formData.password);
      setAuth(user, token);
      navigate("/app");
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Credenciales inválidas. Intenta de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      {/* Glass card */}
      <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 shadow-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl mb-2 bg-gradient-to-r from-[#BC3908] to-[#F6AA1C] bg-clip-text text-transparent">
            Welcome Back
          </h1>
          <p className="text-gray-400">Sign in to access your AI operator</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email field */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-gray-300">
              Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                onBlur={() => handleBlur("email")}
                className={`pl-10 pr-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-[#941B0C] focus:ring-[#941B0C]/20 ${
                  getInputState("email") === "error"
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                    : getInputState("email") === "success"
                    ? "border-green-500 focus:border-green-500 focus:ring-green-500/20"
                    : ""
                }`}
              />
              {touched.email && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {errors.email ? (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  )}
                </div>
              )}
            </div>
            {touched.email && errors.email && (
              <p className="text-sm text-red-400">{errors.email}</p>
            )}
          </div>

          {/* Password field */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-gray-300">
              Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => handleChange("password", e.target.value)}
                onBlur={() => handleBlur("password")}
                className={`pl-10 pr-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-[#941B0C] focus:ring-[#941B0C]/20 ${
                  getInputState("password") === "error"
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                    : getInputState("password") === "success"
                    ? "border-green-500 focus:border-green-500 focus:ring-green-500/20"
                    : ""
                }`}
              />
              {touched.password && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {errors.password ? (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  )}
                </div>
              )}
            </div>
            {touched.password && errors.password && (
              <p className="text-sm text-red-400">{errors.password}</p>
            )}
          </div>
          {/* Error de autenticación */}
          {authError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-sm text-red-400">{authError}</p>
            </div>
          )}
          {/* Remember me & Forgot password */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember"
                checked={formData.rememberMe}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, rememberMe: checked as boolean })
                }
                className="border-white/20 data-[state=checked]:bg-[#941B0C] data-[state=checked]:border-[#941B0C]"
              />
              <label
                htmlFor="remember"
                className="text-sm text-gray-400 cursor-pointer"
              >
                Remember me
              </label>
            </div>
            <Link
              to="/forgot-password"
              className="text-sm text-[#F6AA1C] hover:text-[#BC3908] transition-colors"
            >
              Forgot password?
            </Link>
          </div>

          {/* Submit button */}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-[#941B0C] to-[#F6AA1C] hover:from-[#621708] hover:to-[#BC3908] text-white border-0 shadow-lg shadow-[#941B0C]/25 transition-all"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </Button>
        </form>

        {/* Register link */}
        <div className="mt-6 text-center text-sm text-gray-400">
          Don't have an account?{" "}
          <Link
            to="/register"
            className="text-[#F6AA1C] hover:text-[#BC3908] transition-colors font-medium"
          >
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
}