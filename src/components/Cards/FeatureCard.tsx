import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FeatureCardProps {
  title: string;
  description: string;
  image?: string;
  buttonText?: string;
  onButtonClick?: () => void;
  className?: string;
}

const FeatureCard = ({ 
  title, 
  description, 
  image, 
  buttonText, 
  onButtonClick, 
  className 
}: FeatureCardProps) => {
  return (
    <Card className={cn("group transition-travel hover:shadow-travel", className)}>
      <CardContent className="p-6">
        {image && (
          <div className="mb-4 rounded-lg overflow-hidden">
            <img
              src={image}
              alt={title}
              className="w-full h-48 object-cover transition-travel group-hover:scale-105"
            />
          </div>
        )}
        <CardHeader className="p-0 mb-4">
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription className="text-muted-foreground">
            {description}
          </CardDescription>
        </CardHeader>
        {buttonText && (
          <Button variant="travel-ghost" onClick={onButtonClick}>
            {buttonText}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default FeatureCard;