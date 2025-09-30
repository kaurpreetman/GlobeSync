import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DestinationCardProps {
  name: string;
  image: string;
  className?: string;
  onClick?: () => void;
}

const DestinationCard = ({ name, image, className, onClick }: DestinationCardProps) => {
  return (
    <Card 
      className={cn(
        "group cursor-pointer overflow-hidden transition-travel hover:shadow-travel hover:scale-105",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-0">
        <div className="relative aspect-square">
          <img
            src={image}
            alt={name}
            className="w-full h-full object-cover transition-travel group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="absolute bottom-4 left-4">
            <h3 className="text-white font-semibold text-lg">{name}</h3>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DestinationCard;