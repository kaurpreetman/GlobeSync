"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Explore() {
  const router = useRouter();
  const [city, setCity] = useState("");
  const [duration, setDuration] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const basic_info = { city, duration };

    // Store only basic_info
    localStorage.setItem("trip_basic_info", JSON.stringify(basic_info));

    // Redirect to dashboard (no session id in URL)
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-indigo-50 to-purple-100 flex flex-col items-center justify-center p-4">
      <div className="text-center mb-6">
        <h1 className="text-4xl font-extrabold text-indigo-700 mb-2">
          🌏 Plan Your Trip with GlobeSync
        </h1>
        <p className="text-gray-600 text-lg">
          Enter your destination and trip duration to get started!
        </p>
      </div>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white shadow-2xl rounded-2xl p-8 flex flex-col gap-6 border"
      >
        <div>
          <label className="block text-lg font-semibold mb-2" htmlFor="city">
            Destination City
          </label>
          <Input
            id="city"
            type="text"
            placeholder="e.g. Paris"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            required
            className="rounded-lg"
          />
        </div>
        <div>
          <label className="block text-lg font-semibold mb-2" htmlFor="duration">
            Trip Duration (days)
          </label>
          <Input
            id="duration"
            type="number"
            min={1}
            placeholder="e.g. 5"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            required
            className="rounded-lg"
          />
        </div>
        <Button type="submit" className="bg-indigo-600 text-white rounded-lg">
          Start Planning
        </Button>
      </form>
    </div>
  );
}
