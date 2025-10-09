"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Explore() {
  const router = useRouter();
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

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    // final validation
    for (let i = 0; i < steps.length; i++) {
      if (!validateStep(i)) return;
    }

    // store the gathered trip info and redirect
    localStorage.setItem("trip_basic_info", JSON.stringify(form));
    router.push("/dashboard");
  };

  const progressPercent = Math.round(((step + 1) / steps.length) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Plan Your Trip</h1>
        <p className="text-sm text-gray-500 mb-6">Answer a few quick questions to get started.</p>

        {/* progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
          <div
            className="bg-indigo-600 h-2 rounded-full transition-all"
            style={{ width: `${progressPercent}%` }}
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white shadow rounded-lg p-6 border"
          aria-labelledby="explore-form"
        >
          <div className="mb-4">
            <label className="block text-lg font-medium text-gray-700 mb-2">
              {steps[step]}
            </label>

            {/* Step inputs */}
            {step === 0 && (
              <Input
                id="city"
                type="text"
                placeholder="e.g. Paris"
                value={form.city}
                onChange={(e) => update("city", e.target.value)}
                className="rounded-md"
                aria-required
              />
            )}

            {step === 1 && (
              <Input
                id="duration"
                type="number"
                min={1}
                placeholder="e.g. 5"
                value={form.duration}
                onChange={(e) => update("duration", e.target.value)}
                className="rounded-md"
                aria-required
              />
            )}

            {step === 2 && (
              <select
                id="month"
                value={form.month}
                onChange={(e) => update("month", e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-gray-700"
                aria-required
              >
                <option value="">Select month</option>
                <option>January</option>
                <option>February</option>
                <option>March</option>
                <option>April</option>
                <option>May</option>
                <option>June</option>
                <option>July</option>
                <option>August</option>
                <option>September</option>
                <option>October</option>
                <option>November</option>
                <option>December</option>
              </select>
            )}

            {step === 3 && (
              <select
                id="tripType"
                value={form.tripType}
                onChange={(e) => update("tripType", e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-gray-700"
                aria-required
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
                id="budget"
                value={form.budget}
                onChange={(e) => update("budget", e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-gray-700"
                aria-required
              >
                <option value="">Select budget</option>
                <option>Low</option>
                <option>Mid</option>
                <option>High</option>
              </select>
            )}
          </div>

          <div className="flex items-center justify-between mt-6">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={handleBack}
                disabled={step === 0}
                className="bg-gray-100 text-gray-700 rounded-md"
              >
                Back
              </Button>
              {step < steps.length - 1 ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  className="bg-indigo-600 text-white rounded-md"
                >
                  Next
                </Button>
              ) : (
                <Button type="submit" className="bg-indigo-600 text-white rounded-md">
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
