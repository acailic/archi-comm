import React from 'react';
import type { DesignComponent } from '@/shared/contracts';
import { Card, CardContent, CardHeader, CardTitle } from '@ui/components/ui/card';
import { Input } from '@ui/components/ui/input';
import { Slider } from '@ui/components/ui/slider';

interface WhatIfPanelProps {
  component?: DesignComponent | null;
}

function estimateCapacity(comp: DesignComponent, replicas: number, rwSplit: number): { tps: number; latencyMs: number } {
  // Quick heuristic baselines per type
  const baseTps: Record<string, number> = {
    server: 500, 'api-gateway': 1000, microservice: 300, database: 200, postgresql: 200, mongodb: 250,
    cache: 2000, redis: 2500, 'load-balancer': 5000,
  };
  const baseLat: Record<string, number> = {
    server: 80, 'api-gateway': 30, microservice: 60, database: 120, postgresql: 100, mongodb: 90,
    cache: 10, redis: 8, 'load-balancer': 15,
  };
  const tps = Math.round((baseTps[comp.type] || 200) * Math.max(1, replicas) * (comp.type.includes('database') ? (0.6 + (rwSplit / 100) * 0.4) : 1));
  const latencyMs = Math.max(5, Math.round((baseLat[comp.type] || 60) / Math.max(1, replicas) * (comp.type.includes('database') ? (1.0 - (rwSplit / 100) * 0.2) : 1)));
  return { tps, latencyMs };
}

export const WhatIfPanel: React.FC<WhatIfPanelProps> = ({ component }) => {
  const [replicas, setReplicas] = React.useState(1);
  const [rwSplit, setRwSplit] = React.useState(70); // read percentage

  React.useEffect(() => {
    setReplicas(1);
    setRwSplit(70);
  }, [component?.id]);

  if (!component) return null;
  const showRWSplit = ['database', 'postgresql', 'mysql', 'mongodb', 'dynamodb'].includes(component.type as string);
  const { tps, latencyMs } = estimateCapacity(component, replicas, rwSplit);

  return (
    <Card className="bg-card border-border/30">
      <CardHeader className="py-2">
        <CardTitle className="text-xs">What if?</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Replicas</label>
          <Input type="number" value={replicas} onChange={(e) => setReplicas(Math.max(1, Number(e.target.value || 1)))} className="h-7 text-xs" />
        </div>
        {showRWSplit && (
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Read / Write split ({rwSplit}% reads)</label>
            <Slider value={[rwSplit]} onValueChange={v => setRwSplit(v[0])} min={0} max={100} step={5} />
          </div>
        )}
        <div className="text-xs text-muted-foreground">Estimated capacity: <span className="text-foreground font-medium">{tps} tps</span></div>
        <div className="text-xs text-muted-foreground">Estimated latency: <span className="text-foreground font-medium">{latencyMs} ms</span></div>
      </CardContent>
    </Card>
  );
};

export default WhatIfPanel;

