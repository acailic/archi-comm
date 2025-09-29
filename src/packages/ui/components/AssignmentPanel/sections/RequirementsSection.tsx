import { CollapsibleSection } from '../CollapsibleSection';
import type { Challenge } from '@/shared/contracts';

interface RequirementsSectionProps {
  challenge: Challenge;
  isExpanded: boolean;
  onToggle: () => void;
}

export function RequirementsSection({ challenge, isExpanded, onToggle }: RequirementsSectionProps) {
  if (!challenge.requirements || challenge.requirements.length === 0) {
    return null;
  }

  return (
    <CollapsibleSection
      title="Requirements"
      isExpanded={isExpanded}
      onToggle={onToggle}
    >
      <ul className='space-y-2 text-sm'>
        {challenge.requirements.map((req, index) => (
          <li key={index} className='flex items-start gap-2'>
            <div className='w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0' />
            <span className='text-foreground/80'>{req}</span>
          </li>
        ))}
      </ul>
    </CollapsibleSection>
  );
}