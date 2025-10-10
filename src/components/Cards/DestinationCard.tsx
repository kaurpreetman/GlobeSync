import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MapPin, Clock, Star } from "lucide-react";

interface DestinationCardProps {
  name: string;
  image: string;
  description?: string;
  highlights?: string[];
  culture?: string;
  bestTime?: string;
  famousFor?: string;
  className?: string;
  onClick?: () => void;
}

const DestinationCard = ({ 
  name, 
  image, 
  description, 
  highlights = [], 
  culture, 
  bestTime, 
  famousFor, 
  className, 
  onClick 
}: DestinationCardProps) => {
  return (
    <Card 
      className={cn(
        "group cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] bg-white",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-0">
        {/* Image Section */}
        <div className="relative aspect-[4/3] overflow-hidden">
          <img
            src={image}
            alt={name}
            className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          
          {/* Best Time Badge */}
          {/* {bestTime && (
            <div className="absolute top-3 right-3">
              <Badge variant="secondary" className="bg-white/20 text-white backdrop-blur-sm border-white/30">
                <Clock className="w-3 h-3 mr-1" />
                {bestTime}
              </Badge>
            </div>
          )} */}
          
          {/* Title and Description Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="text-white font-bold text-xl mb-1">{name}</h3>
            {description && (
              <p className="text-white/90 text-sm mb-2">{description}</p>
            )}
          </div>
        </div>
        
        {/* Content Section */}
        {/* <div className="p-4 space-y-3">
          {/* Famous For */}
          {/* {famousFor && (
            <div className="flex items-start space-x-2">
              <Star className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-700 leading-relaxed line-clamp-2">{famousFor}</p>
            </div>
          )}
          
          {/* Top Highlights Only */}
          {/* {highlights.length > 0 && (
            <div className="flex items-start space-x-2">
              <MapPin className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="flex flex-wrap gap-1">
                {highlights.slice(0, 2).map((highlight, index) => (
                  <Badge 
                    key={index} 
                    variant="outline" 
                    className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 border-blue-200"
                  >
                    {highlight}
                  </Badge>
                ))}
                {highlights.length > 2 && (
                  <Badge variant="outline" className="text-xs px-2 py-0.5 bg-gray-50 text-gray-600">
                    +{highlights.length - 2} more
                  </Badge>
                )}
              </div>
            </div>
          )} */} 
          
          {/* Click to explore hint */}
          {/* <div className="pt-2">
            <p className="text-xs p-4 text-blue-600 font-medium opacity-75 group-hover:opacity-100 transition-opacity">
              Click to explore → 
            </p>
          </div> */}
        
      </CardContent>
    </Card>
  );
};

export default DestinationCard;