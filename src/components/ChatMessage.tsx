import { motion } from "framer-motion";
import { Bot, User } from "lucide-react";
import EventCard from "./EventCard";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  eventCard?: {
    title: string;
    time: string;
    location?: string;
    priority?: "high" | "medium" | "low";
  };
}

const ChatMessage = ({ message }: { message: Message }) => {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
        isUser ? "bg-primary/20" : "bg-accent/20"
      }`}>
        {isUser ? <User className="w-3.5 h-3.5 text-primary" /> : <Bot className="w-3.5 h-3.5 text-accent" />}
      </div>
      <div className={`max-w-[80%] space-y-2`}>
        <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-md"
            : "glass rounded-tl-md text-foreground"
        }`}>
          {message.content}
        </div>
        {message.eventCard && (
          <EventCard
            {...message.eventCard}
            showActions
            onConfirm={() => {}}
            onEdit={() => {}}
          />
        )}
      </div>
    </motion.div>
  );
};

export default ChatMessage;
