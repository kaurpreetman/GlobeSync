"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, ArrowRight, Sparkles } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Planning() {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Please login to access this page.
      </div>
    );
  }

  const [currentStep, setCurrentStep] = useState(1);
  const [destination, setDestination] = useState("");

  const totalSteps = 3;
  const progress = (currentStep / totalSteps) * 100;

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      router.push("/dashboard");
    }
  };

  const handleDestinationSubmit = () => {
    if (destination.trim()) handleNext();
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="text-center">
            <MapPin className="h-16 w-16 text-travel-blue mx-auto mb-4" />
            <h2 className="text-3xl font-bold mb-4">
              Where do you want to go?
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Let our AI help you plan the perfect trip.
            </p>
            <div className="max-w-md mx-auto relative">
              <Input
                placeholder="e.g., Paris, France"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="pr-12 h-14 text-lg border-2 border-travel-gray focus:border-travel-blue"
                onKeyDown={(e) =>
                  e.key === "Enter" && handleDestinationSubmit()
                }
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 transform -translate-y-1/2"
              >
                <Sparkles className="h-5 w-5 text-travel-blue" />
              </Button>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4">When are you traveling?</h2>
            <p className="text-xl text-muted-foreground mb-8">
              Select your travel dates to get the best recommendations.
            </p>
            <div className="max-w-md mx-auto space-y-4">
              <Input type="date" className="h-14 text-lg" />
              <Input type="date" className="h-14 text-lg" />
            </div>
          </div>
        );
      case 3:
        return (
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4">What's your budget?</h2>
            <p className="text-xl text-muted-foreground mb-8">
              Help us suggest the best options for your budget.
            </p>
            <div className="max-w-md mx-auto">
              <Input
                placeholder="$2,000"
                className="h-14 text-lg text-center"
              />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="w-full max-w-2xl mx-auto shadow-travel">
          <CardContent className="p-12">
            <div className="mb-12">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-muted-foreground">
                  Step {currentStep} of {totalSteps}
                </span>
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-travel-blue" />
                  <span className="text-sm font-medium">Destination</span>
                </div>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            <div className="mb-12">{renderStepContent()}</div>

            <div className="flex justify-center">
              <Button
                variant="travel"
                size="lg"
                onClick={
                  currentStep === 1 ? handleDestinationSubmit : handleNext
                }
                disabled={currentStep === 1 && !destination.trim()}
                className="px-8"
              >
                {currentStep === totalSteps ? "Create Trip" : "Next"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
