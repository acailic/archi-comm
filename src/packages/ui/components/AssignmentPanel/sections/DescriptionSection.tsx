import { Target } from 'lucide-react';
import { CollapsibleSection } from '../CollapsibleSection';
import type { Challenge } from '@/shared/contracts';

interface DescriptionSectionProps {
  challenge: Challenge;
  isExpanded: boolean;
  onToggle: () => void;
}

export function DescriptionSection({ challenge, isExpanded, onToggle }: DescriptionSectionProps) {
  return (
    <CollapsibleSection
      title="Description"
      icon={Target}
      isExpanded={isExpanded}
      onToggle={onToggle}
      className="border-l-4 border-l-primary"
    >
      <p className='text-sm leading-relaxed text-foreground/80'>
        {challenge.description}
      </p>
    </CollapsibleSection>
  );
}
