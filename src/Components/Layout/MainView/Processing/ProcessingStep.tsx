import { CheckCircle2, Loader2 } from "lucide-react";
import * as Progress from "@radix-ui/react-progress";

// One step in the staged processing timeline.
type ProcessingStepData = {
  id: number;
  name: string;
  description: string;
  duration: string;
};

interface ProcessingStepProps {
  step: ProcessingStepData;
  isActive: boolean;
  isComplete: boolean;
  progress: number;
}

function ProcessingStep({ step, isActive, isComplete, progress }: ProcessingStepProps) {
  return (
    <div
      className={`
        p-4 rounded-lg border transition-all
        ${isActive ? "border-primary bg-primary/5" : "border-border"}
      `}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3">
          <div
            className={`
              w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5
              ${
                isComplete
                  ? "bg-primary text-white"
                  : isActive
                  ? "bg-primary/20 text-primary border-2 border-primary"
                  : "bg-secondary text-muted-foreground"
              }
            `}
          >
            {isComplete ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : isActive ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <span className="text-sm">{step.id}</span>
            )}
          </div>
          <div>
            <h3 className="text-sm mb-1">{step.name}</h3>
            <p className="text-xs text-muted-foreground mb-1">{step.description}</p>
            <p className="text-xs text-muted-foreground">{step.duration}</p>
          </div>
        </div>
        {isActive && <span className="text-sm font-semibold text-primary">{progress}%</span>}
      </div>

      {isActive && (
        <Progress.Root className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
          <Progress.Indicator
            className="h-full bg-primary transition-all"
            style={{ transform: `translateX(-${100 - progress}%)` }}
          />
        </Progress.Root>
      )}
    </div>
  );
}

export default ProcessingStep;