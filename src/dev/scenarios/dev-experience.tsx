import React, { useEffect } from 'react';
import { LoggingViewer } from '@ui/components/LoggingViewer';
import { ImportExportDropdown } from '@ui/components/ImportExportDropdown';
import { Button } from '@ui/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@ui/components/ui/card';
import { logger } from '@/lib/logging/logger';
import { ReviewScreen } from '@ui/components/pages/ReviewScreen';

const stubDesign = {
  schemaVersion: 1,
  components: [
    { id: 'c1', type: 'api-gateway', label: 'API Gateway', position: { x: 100, y: 100 } },
    { id: 'c2', type: 'database', label: 'Primary DB', position: { x: 320, y: 180 } },
  ],
  connections: [{ id: 'k1', source: 'c1', target: 'c2' }],
  infoCards: [],
  layers: [],
  metadata: { version: '1.0' },
};

const stubChallenge = {
  id: 'sample-challenge',
  title: 'Sample System',
  description: 'Design a simple system for demo purposes.',
  requirements: [
    'Add an API Gateway',
    'Connect to a primary database',
    'Include basic monitoring',
  ],
  difficulty: 'beginner',
  estimatedTime: 15,
  category: 'system-design',
};

const stubAudio = {
  transcript: 'This is a short explanation of the chosen architecture.',
  duration: 45,
  wordCount: 9,
  analysisMetrics: { clarityScore: 72, technicalDepth: 61, businessFocus: 58 },
};

export const devExperienceScenarios = {
  'Developer Experience': {
    id: 'dev-experience',
    name: 'Developer Experience',
    scenarios: [
      {
        id: 'logging-viewer',
        name: 'Logging Viewer (live)',
        description: 'Interactive log viewer with quick emit buttons for different levels.',
        component: () => {
          const log = logger.child('dev:logs');
          useEffect(() => { log.info('Logging viewer mounted'); }, []);
          const emit = (lvl: 'trace'|'debug'|'info'|'warn'|'error'|'fatal') => () => {
            const msg = `Sample ${lvl} log at ${new Date().toLocaleTimeString()}`;
            if (lvl==='trace') return log.trace(msg, { n: Math.random() });
            if (lvl==='debug') return log.debug(msg, { user: 'dev' });
            if (lvl==='info') return log.info(msg, { ok: true });
            if (lvl==='warn') return log.warn(msg, { retries: 1 });
            if (lvl==='error') return log.error('Something went wrong', new Error('Synthetic error'));
            return log.fatal('Fatal condition reached', new Error('Synthetic fatal error'));
          };
          return (
            <div className='space-y-4 p-4'>
              <Card>
                <CardHeader><CardTitle>Emit Sample Logs</CardTitle></CardHeader>
                <CardContent className='flex gap-2 flex-wrap'>
                  <Button size='sm' variant='outline' onClick={emit('trace')}>Trace</Button>
                  <Button size='sm' variant='outline' onClick={emit('debug')}>Debug</Button>
                  <Button size='sm' variant='outline' onClick={emit('info')}>Info</Button>
                  <Button size='sm' variant='outline' onClick={emit('warn')}>Warn</Button>
                  <Button size='sm' variant='outline' onClick={emit('error')}>Error</Button>
                  <Button size='sm' variant='outline' onClick={emit('fatal')}>Fatal</Button>
                </CardContent>
              </Card>
              <LoggingViewer title='Application Logs' />
            </div>
          );
        },
      },
      {
        id: 'import-export',
        name: 'Import/Export Dropdown',
        description: 'Exercise import/export actions with a small demo design.',
        component: () => {
          const [data, setData] = React.useState(stubDesign);
          return (
            <div className='p-4'>
              <div className='flex items-center gap-3 mb-4'>
                <ImportExportDropdown
                  designData={data as any}
                  challenge={stubChallenge as any}
                  onImport={(res: any) => {
                    logger.info('Import result', res);
                    if (res?.success && res.data?.design) setData(res.data.design);
                  }}
                />
                <Button size='sm' variant='outline' onClick={() => setData({ ...data, components: [] })}>
                  Clear design data
                </Button>
              </div>
              <pre className='text-xs bg-muted p-3 rounded max-w-xl overflow-auto'>
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          );
        },
      },
      {
        id: 'review-basic',
        name: 'Review Screen (basic)',
        description: 'Render the review flow with stub challenge/design/audio.',
        component: () => (
          <div className='p-4'>
            <ReviewScreen
              challenge={stubChallenge as any}
              designData={stubDesign as any}
              audioData={stubAudio as any}
              onStartOver={() => logger.info('Start over')}
              onBackToDesign={() => logger.info('Back to design')}
              onBackToAudio={() => logger.info('Back to audio')}
            />
          </div>
        ),
      },
    ],
  },
};

