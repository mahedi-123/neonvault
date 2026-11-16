import { motion } from 'motion/react';
import { Grid, List } from 'lucide-react';
import { cn } from '../utils/helpers';

const ViewToggle = ({ viewMode, onChange }) => (
  <div className="flex items-center gap-1 bg-surface border border-border/50 rounded-lg p-1">
    <motion.button
      whileTap={{ scale: 0.92 }}
      onClick={() => onChange('grid')}
      className={cn('p-2 rounded-md transition-colors duration-200', viewMode === 'grid' ? 'bg-accent text-bg' : 'text-text-muted hover:text-text')}
      aria-label="Grid view"
      aria-pressed={viewMode === 'grid'}
    >
      <Grid className="w-5 h-5" />
    </motion.button>
    <motion.button
      whileTap={{ scale: 0.92 }}
      onClick={() => onChange('list')}
      className={cn('p-2 rounded-md transition-colors duration-200', viewMode === 'list' ? 'bg-accent text-bg' : 'text-text-muted hover:text-text')}
      aria-label="List view"
      aria-pressed={viewMode === 'list'}
    >
      <List className="w-5 h-5" />
    </motion.button>
  </div>
);

export default ViewToggle;
