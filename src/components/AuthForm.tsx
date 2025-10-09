"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { Eye, EyeOff, User, Mail, Lock } from "lucide-react";

interface FormData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  otp?: string;
}

const AuthForm: React.FC<{ onSuccess?: () => void }> = ({ onSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [form, setForm] = useState<FormData>({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    otp: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  // ------------------ Signup ------------------
  const handleSignup = async () => {
    setLoading(true);
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.fullName,
          email: form.email,
          password: form.password,
          confirmPassword: form.confirmPassword,
          action: "signup",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Signup failed");

      setIsOtpStep(true); // move to OTP verification
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // ------------------ Verify OTP ------------------
  const handleVerifyOtp = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          code: form.otp,
          action: "verify-otp",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "OTP verification failed");

      alert("Email verified! You can now login.");
      setIsLogin(true);
      setIsOtpStep(false);
      setForm(prev => ({ ...prev, otp: "", password: "", confirmPassword: "" }));
    } catch (err: any) {
      setError(err.message || "OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  // ------------------ Login ------------------
  const handleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await signIn("credentials", {
        redirect: false,
        email: form.email,
        password: form.password,
      });
      if (res?.error) setError(res.error);
      else onSuccess?.();
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  // ------------------ Google Login ------------------
  const handleGoogle = async () => {
    setLoading(true);
    try {
      await signIn("google", { callbackUrl: "/" });
    } catch (err: any) {
      setError(err.message || "Google authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isOtpStep) handleVerifyOtp();
    else if (isLogin) handleLogin();
    else handleSignup();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-secondary/30 to-background">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 bg-gradient-to-r from-primary to-accent shadow-lg">
            <User className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-gradient mb-2">
            {isLogin ? "Welcome Back" : isOtpStep ? "Verify OTP" : "Join Us Today"}
          </h1>
          <p className="text-muted-foreground">
            {isLogin
              ? "Sign in to continue"
              : isOtpStep
              ? "Enter the OTP sent to your email"
              : "Create your account to get started"}
          </p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl shadow-lg p-8 backdrop-blur-sm">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg p-3 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            {/* Signup fields */}
            {!isLogin && !isOtpStep && (
              <>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    name="fullName"
                    value={form.fullName}
                    onChange={handleChange}
                    placeholder="Full Name"
                    required
                    className="w-full pl-10 pr-4 py-3 border border-input bg-background rounded-lg focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="Email"
                    required
                    className="w-full pl-10 pr-4 py-3 border border-input bg-background rounded-lg focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Password"
                    required
                    minLength={6}
                    className="w-full pl-10 pr-12 py-3 border border-input bg-background rounded-lg focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm Password"
                    required
                    minLength={6}
                    className="w-full pl-10 pr-12 py-3 border border-input bg-background rounded-lg focus:ring-2 focus:ring-ring"
                  />
                </div>
              </>
            )}

            {/* Login fields */}
            {!isOtpStep && isLogin && (
              <>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="Email"
                    required
                    className="w-full pl-10 pr-4 py-3 border border-input bg-background rounded-lg focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Password"
                    required
                    minLength={6}
                    className="w-full pl-10 pr-12 py-3 border border-input bg-background rounded-lg focus:ring-2 focus:ring-ring"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </>
            )}

            {/* OTP input */}
            {isOtpStep && (
              <div className="relative">
                <input
                  type="text"
                  name="otp"
                  value={form.otp}
                  onChange={handleChange}
                  placeholder="Enter OTP"
                  required
                  className="w-full pl-4 pr-4 py-3 border border-input bg-background rounded-lg focus:ring-2 focus:ring-ring"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground py-3 rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Processing..." : isOtpStep ? "Verify OTP" : isLogin ? "Sign In" : "Sign Up"}
            </button>
          </form>

          {/* Google login */}
          {!isOtpStep && (
            <>
              <div className="flex items-center my-6">
                <div className="flex-1 border-t border-border" />
                <span className="px-4 text-muted-foreground text-sm">or</span>
                <div className="flex-1 border-t border-border" />
              </div>

              <button
                type="button"
                onClick={handleGoogle}
                disabled={loading}
                className="w-full border border-border bg-background hover:bg-muted py-3 rounded-lg flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <img src="/google-icon-logo.svg" alt="Google" className="w-5 h-5" />
                <span>{isLogin ? "Sign in with Google" : "Sign up with Google"}</span>
              </button>
            </>
          )}

          {!isOtpStep && (
            <p className="text-center text-sm text-muted-foreground mt-6">
              {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError("");
                  setIsOtpStep(false);
                  setForm({ fullName: "", email: "", password: "", confirmPassword: "", otp: "" });
                }}
                className="text-primary hover:underline font-medium"
              >
                {isLogin ? "Sign up" : "Sign in"}
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthForm;
