"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "next-auth/react";

export default function Explore() {
  const router = useRouter();
  const { data: session } = useSession();

  const [step, setStep] = useState(0);
  const steps = [
    "Destination City",
    "Trip Duration (days)",
    "Month to Travel",
    "Type of Vacation",
    "Budget",
  ];

  const [form, setForm] = useState({
    city: "",
    duration: "",
    month: "",
    tripType: "",
    budget: "",
  });

  const update = (key: string, value: string) =>
    setForm((s) => ({ ...s, [key]: value }));

  const validateStep = (s: number) => {
    const value = (() => {
      switch (s) {
        case 0:
          return form.city?.trim();
        case 1:
          return form.duration?.toString();
        case 2:
          return form.month;
        case 3:
          return form.tripType;
        case 4:
          return form.budget;
        default:
          return "";
      }
    })();

    if (!value) return false;
    if (s === 1) {
      const n = Number(form.duration);
      return !Number.isNaN(n) && n > 0;
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep(step)) return;
    setStep((p) => Math.min(p + 1, steps.length - 1));
  };

  const handleBack = () => setStep((p) => Math.max(p - 1, 0));

  // ✅ Send trip info to backend and redirect with sessionId
  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    for (let i = 0; i < steps.length; i++) if (!validateStep(i)) return;

    try {
      const res = await fetch("/api/chat/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: session?.user?.id,
          basic_info: form,
        }),
      });

      if (!res.ok) throw new Error("Failed to initialize chat");

      const data = await res.json();

      router.push(`/dashboard?sessionId=${data.sessionId}`);
    } catch (err) {
      console.error("Error initializing trip:", err);
    }
  };

  const progressPercent = Math.round(((step + 1) / steps.length) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Plan Your Trip</h1>
        <p className="text-sm text-gray-500 mb-6">Answer a few quick questions to get started.</p>

        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
          <div
            className="bg-indigo-600 h-2 rounded-full transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 border">
          <div className="mb-4">
            <label className="block text-lg font-medium text-gray-700 mb-2">
              {steps[step]}
            </label>

            {step === 0 && (
              <Input
                placeholder="e.g. Paris"
                value={form.city}
                onChange={(e) => update("city", e.target.value)}
              />
            )}
            {step === 1 && (
              <Input
                type="number"
                min={1}
                placeholder="e.g. 5"
                value={form.duration}
                onChange={(e) => update("duration", e.target.value)}
              />
            )}
            {step === 2 && (
              <select
                value={form.month}
                onChange={(e) => update("month", e.target.value)}
                className="w-full border rounded-md px-3 py-2"
              >
                <option value="">Select month</option>
                {[
                  "January", "February", "March", "April", "May", "June",
                  "July", "August", "September", "October", "November", "December",
                ].map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            )}
            {step === 3 && (
              <select
                value={form.tripType}
                onChange={(e) => update("tripType", e.target.value)}
                className="w-full border rounded-md px-3 py-2"
              >
                <option value="">Select type</option>
                <option>Family</option>
                <option>Friends</option>
                <option>Couple</option>
                <option>Solo</option>
                <option>Business</option>
              </select>
            )}
            {step === 4 && (
              <select
                value={form.budget}
                onChange={(e) => update("budget", e.target.value)}
                className="w-full border rounded-md px-3 py-2"
              >
                <option value="">Select budget</option>
                <option>Low</option>
                <option>Mid</option>
                <option>High</option>
              </select>
            )}
          </div>

          <div className="flex items-center justify-between mt-6">
            <div className="flex gap-2">
              <Button onClick={handleBack} disabled={step === 0} type="button">
                Back
              </Button>
              {step < steps.length - 1 ? (
                <Button onClick={handleNext} type="button">
                  Next
                </Button>
              ) : (
                <Button type="submit" className="bg-indigo-600 text-white">
                  Start Planning
                </Button>
              )}
            </div>

            <div className="text-sm text-gray-500">{progressPercent}%</div>
          </div>
        </form>
      </div>
    </div>
  );
}
