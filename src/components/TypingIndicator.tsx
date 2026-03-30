import { motion } from "framer-motion";
import { Bot } from "lucide-react";

const TypingIndicator = () => (
  <div className="flex gap-2.5">
    <div className="w-7 h-7 rounded-full flex items-center justify-center bg-accent/20 flex-shrink-0">
      <Bot className="w-3.5 h-3.5 text-accent" />
    </div>
    <div className="glass rounded-2xl rounded-tl-md px-4 py-3 flex gap-1.5 items-center">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-muted-foreground"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </div>
  </div>
);

export default TypingIndicator;
