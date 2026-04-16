import { motion } from "framer-motion";

// Small summary card used across the dashboard metrics grid.
function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  color,
}: {
  icon: any;
  label: string;
  value: string;
  trend: string;
  color: string;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-card border border-border rounded-xl p-5 hover:shadow-lg transition-all"
    >
      <div
        className={`w-12 h-12 ${color} rounded-lg flex items-center justify-center mb-4`}
      >
        <Icon className="w-6 h-6" />
      </div>
      <div className="text-3xl font-bold mb-1">{value}</div>
      <div className="text-sm font-medium mb-1">{label}</div>
      <div className="text-xs text-muted-foreground">
        {trend}
      </div>
    </motion.div>
  );
}

export default StatCard;