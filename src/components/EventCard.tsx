import { motion } from "framer-motion";
import { Clock, MapPin, Check, Pencil } from "lucide-react";

interface EventCardProps {
  title: string;
  time: string;
  location?: string;
  priority?: "high" | "medium" | "low";
  showActions?: boolean;
  onConfirm?: () => void;
  onEdit?: () => void;
}

const priorityColors: Record<string, string> = {
  high: "bg-destructive/20 border-destructive/30",
  medium: "bg-warning/20 border-warning/30",
  low: "bg-success/20 border-success/30",
};

const priorityDots: Record<string, string> = {
  high: "bg-destructive",
  medium: "bg-warning",
  low: "bg-success",
};

const EventCard = ({ title, time, location, priority = "medium", showActions, onConfirm, onEdit }: EventCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    className={`rounded-xl p-3.5 border ${priorityColors[priority]} shadow-soft`}
  >
    <div className="flex items-start justify-between gap-2">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <div className={`w-2 h-2 rounded-full ${priorityDots[priority]}`} />
          <h4 className="text-sm font-semibold text-foreground truncate">{title}</h4>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{time}</span>
          {location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{location}</span>}
        </div>
      </div>
    </div>
    {showActions && (
      <div className="flex gap-2 mt-3">
        <button onClick={onConfirm} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary/20 text-primary text-xs font-medium hover:bg-primary/30 transition-colors">
          <Check className="w-3.5 h-3.5" /> Confirm
        </button>
        <button onClick={onEdit} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-secondary text-secondary-foreground text-xs font-medium hover:bg-secondary/80 transition-colors">
          <Pencil className="w-3.5 h-3.5" /> Edit
        </button>
      </div>
    )}
  </motion.div>
);

export default EventCard;
