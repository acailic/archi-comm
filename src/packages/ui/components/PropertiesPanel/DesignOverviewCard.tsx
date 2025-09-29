
import { Info } from 'lucide-react';
import type { DesignComponent } from '@/shared/contracts';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface DesignOverviewCardProps {
  components: DesignComponent[];
}

export function DesignOverviewCard({ components }: DesignOverviewCardProps) {
  return (
    <Card className="bg-card border-border/30">
      <CardHeader className="pb-1 py-2">
        <CardTitle className="text-xs flex items-center gap-2">
          <Info className="w-4 h-4 text-primary" />
          Design Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="text-center p-1.5 bg-muted/30 rounded">
            <div className="font-semibold text-xs">{components.length}</div>
            <div className="text-muted-foreground">Components</div>
          </div>
          <div className="text-center p-1.5 bg-muted/30 rounded">
            <div className="font-semibold text-xs">
              {components.filter(c => c.label !== c.type.charAt(0).toUpperCase() + c.type.slice(1)).length}
            </div>
            <div className="text-muted-foreground">Customized</div>
          </div>
        </div>

        {components.length > 0 && (
          <div>
            <label className="text-[11px] font-medium block mb-1.5 text-muted-foreground">
              Component Types
            </label>
            <div className="flex flex-wrap gap-1">
              {Array.from(new Set(components.map(c => c.type))).map(type => (
                <Badge key={type} variant="outline" className="text-[10px] h-5">
                  {type.replace('-', ' ')}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}