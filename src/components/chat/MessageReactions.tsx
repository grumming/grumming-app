import { motion } from 'framer-motion';

interface Reaction {
  emoji: string;
  count: number;
  hasReacted: boolean;
}

interface MessageReactionsProps {
  reactions: Reaction[];
  onReact: (emoji: string) => void;
}

const MessageReactions = ({ reactions, onReact }: MessageReactionsProps) => {
  if (reactions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {reactions.map((reaction) => (
        <motion.button
          key={reaction.emoji}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onReact(reaction.emoji)}
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs transition-colors ${
            reaction.hasReacted
              ? 'bg-primary/20 border border-primary/50'
              : 'bg-muted/80 hover:bg-muted'
          }`}
        >
          <span>{reaction.emoji}</span>
          <span className="text-muted-foreground">{reaction.count}</span>
        </motion.button>
      ))}
    </div>
  );
};

export default MessageReactions;
