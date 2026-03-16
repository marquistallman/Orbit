import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, Mail, Lock, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Checkbox } from "../components/ui/checkbox";
import { registerRequest } from "../../api/auth";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreeToTerms: false,
  });
  const [errors, setErrors] = useState<{
    fullName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    terms?: string;
  }>({});
  const [touched, setTouched] = useState<{
    fullName?: boolean;
    email?: boolean;
    password?: boolean;
    confirmPassword?: boolean;
  }>({});

  const validateFullName = (name: string) => {
    if (!name) return "Full name is required";
    if (name.length < 2) return "Name must be at least 2 characters";
    return "";
  };

  const validateEmail = (email: string) => {
    if (!email) return "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Invalid email format";
    return "";
  };

  const validatePassword = (password: string) => {
    if (!password) return "Password is required";
    if (password.length < 8) return "Password must be at least 8 characters";
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password))
      return "Password must contain uppercase, lowercase, and number";
    return "";
  };

  const validateConfirmPassword = (confirmPassword: string) => {
    if (!confirmPassword) return "Please confirm your password";
    if (confirmPassword !== formData.password) return "Passwords do not match";
    return "";
  };

  const handleBlur = (field: keyof typeof touched) => {
    setTouched({ ...touched, [field]: true });
    let error = "";
    if (field === "fullName") error = validateFullName(formData.fullName);
    else if (field === "email") error = validateEmail(formData.email);
    else if (field === "password") error = validatePassword(formData.password);
    else if (field === "confirmPassword")
      error = validateConfirmPassword(formData.confirmPassword);
    setErrors({ ...errors, [field]: error });
  };

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData({ ...formData, [field]: value });
    if (touched[field as keyof typeof touched]) {
      let error = "";
      if (field === "fullName") error = validateFullName(value);
      else if (field === "email") error = validateEmail(value);
      else if (field === "password") error = validatePassword(value);
      else if (field === "confirmPassword") error = validateConfirmPassword(value);
      setErrors({ ...errors, [field]: error });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const fullNameError = validateFullName(formData.fullName);
    const emailError = validateEmail(formData.email);
    const passwordError = validatePassword(formData.password);
    const confirmPasswordError = validateConfirmPassword(formData.confirmPassword);
    const termsError = formData.agreeToTerms ? "" : "You must agree to the terms";

    if (fullNameError || emailError || passwordError || confirmPasswordError || termsError) {
      setErrors({
        fullName: fullNameError,
        email: emailError,
        password: passwordError,
        confirmPassword: confirmPasswordError,
        terms: termsError,
      });
      setTouched({ fullName: true, email: true, password: true, confirmPassword: true });
      return;
    }

    setIsLoading(true);
    
    try {
      const { token, user } = await registerRequest(formData.fullName, formData.email, formData.password);
      // Guardamos el token y usuario para persistir la sesión
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      navigate("/app");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al registrarse";
      setErrors((prev) => ({ ...prev, terms: message }));
    } finally {
      setIsLoading(false);
    }
  };

  const getInputState = (field: keyof typeof touched) => {
    if (!touched[field]) return "default";
    if (errors[field]) return "error";
    return "success";
  };

  return (
    <div className="w-full max-w-md">
      <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl mb-2 bg-gradient-to-r from-[#BC3908] to-[#F6AA1C] bg-clip-text text-transparent">
            Create Account
          </h1>
          <p className="text-gray-400">Join Orbit and automate your digital life</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-gray-300">
              Full Name
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <Input
                id="fullName"
                type="text"
                placeholder="John Doe"
                value={formData.fullName}
                onChange={(e) => handleChange("fullName", e.target.value)}
                onBlur={() => handleBlur("fullName")}
                className={`pl-10 pr-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-[#941B0C] focus:ring-[#941B0C]/20 ${
                  getInputState("fullName") === "error"
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                    : getInputState("fullName") === "success"
                    ? "border-green-500 focus:border-green-500 focus:ring-green-500/20"
                    : ""
                }`}
              />
              {touched.fullName && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {errors.fullName ? (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  )}
                </div>
              )}
            </div>
            {touched.fullName && errors.fullName && (
              <p className="text-sm text-red-400">{errors.fullName}</p>
            )}
          </div>

          {/* Email */}
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

          {/* Password */}
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

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-gray-300">
              Confirm Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={(e) => handleChange("confirmPassword", e.target.value)}
                onBlur={() => handleBlur("confirmPassword")}
                className={`pl-10 pr-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-[#941B0C] focus:ring-[#941B0C]/20 ${
                  getInputState("confirmPassword") === "error"
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                    : getInputState("confirmPassword") === "success"
                    ? "border-green-500 focus:border-green-500 focus:ring-green-500/20"
                    : ""
                }`}
              />
              {touched.confirmPassword && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {errors.confirmPassword ? (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  )}
                </div>
              )}
            </div>
            {touched.confirmPassword && errors.confirmPassword && (
              <p className="text-sm text-red-400">{errors.confirmPassword}</p>
            )}
          </div>

          {/* Terms checkbox */}
          <div className="space-y-2">
            <div className="flex items-start space-x-2">
              <Checkbox
                id="terms"
                checked={formData.agreeToTerms}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, agreeToTerms: checked as boolean })
                }
                className="border-white/20 data-[state=checked]:bg-[#941B0C] data-[state=checked]:border-[#941B0C] mt-1"
              />
              <label htmlFor="terms" className="text-sm text-gray-400 cursor-pointer">
                I agree to the{" "}
                <span className="text-[#F6AA1C] hover:text-[#BC3908]">
                  Terms of Service
                </span>{" "}
                and{" "}
                <span className="text-[#F6AA1C] hover:text-[#BC3908]">
                  Privacy Policy
                </span>
              </label>
            </div>
            {errors.terms && <p className="text-sm text-red-400">{errors.terms}</p>}
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
                Creating account...
              </>
            ) : (
              "Create Account"
            )}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-400">
          Already have an account?{" "}
          <Link
            to="/"
            className="text-[#F6AA1C] hover:text-[#BC3908] transition-colors font-medium"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}