import { useState } from "react";
import { Link } from "react-router";
import { Mail, ArrowLeft, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [touched, setTouched] = useState(false);

  const validateEmail = (email: string) => {
    if (!email) return "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Invalid email format";
    return "";
  };

  const handleBlur = () => {
    setTouched(true);
    setError(validateEmail(email));
  };

  const handleChange = (value: string) => {
    setEmail(value);
    if (touched) {
      setError(validateEmail(value));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateEmail(email);
    if (validationError) {
      setError(validationError);
      setTouched(true);
      return;
    }

    setIsLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsLoading(false);
    setSubmitted(true);
  };

  const getInputState = () => {
    if (!touched) return "default";
    if (error) return "error";
    return "success";
  };

  if (submitted) {
    return (
      <div className="w-full max-w-md">
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 shadow-2xl">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-500/20 to-[#F6AA1C]/20 border border-green-500/30 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>
            <h1 className="text-2xl mb-3 text-white">Check Your Email</h1>
            <p className="text-gray-400 mb-6">
              We've sent a password reset link to{" "}
              <span className="text-[#F6AA1C] font-medium">{email}</span>
            </p>
            <p className="text-sm text-gray-500 mb-8">
              Didn't receive the email? Check your spam folder or try again.
            </p>
            <Link to="/">
              <Button className="w-full bg-gradient-to-r from-[#941B0C] to-[#F6AA1C] hover:from-[#621708] hover:to-[#BC3908] text-white border-0">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Sign In
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl mb-2 bg-gradient-to-r from-[#BC3908] to-[#F6AA1C] bg-clip-text text-transparent">
            Reset Password
          </h1>
          <p className="text-gray-400">
            Enter your email and we'll send you a reset link
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-gray-300">
              Email Address
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => handleChange(e.target.value)}
                onBlur={handleBlur}
                className={`pl-10 pr-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-[#941B0C] focus:ring-[#941B0C]/20 ${
                  getInputState() === "error"
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                    : getInputState() === "success"
                    ? "border-green-500 focus:border-green-500 focus:ring-green-500/20"
                    : ""
                }`}
              />
              {touched && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {error ? (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  )}
                </div>
              )}
            </div>
            {touched && error && <p className="text-sm text-red-400">{error}</p>}
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-[#941B0C] to-[#F6AA1C] hover:from-[#621708] hover:to-[#BC3908] text-white border-0 shadow-lg shadow-[#941B0C]/25 transition-all"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Sending reset link...
              </>
            ) : (
              "Send Reset Link"
            )}
          </Button>
        </form>

        <div className="mt-6">
          <Link
            to="/"
            className="flex items-center justify-center text-sm text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}