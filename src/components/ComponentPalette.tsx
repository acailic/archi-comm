import {
  Activity,
  AlertTriangle,
  Archive,
  BarChart3,
  Box,
  Boxes,
  Brain,
  Cloud,
  CloudCog,
  Code,
  Container,
  Cpu,
  Database,
  Database as DB,
  FileText,
  FolderOpen,
  GitBranch,
  Globe,
  HardDrive,
  Key,
  Layers,
  Lock,
  MessageSquare,
  Monitor,
  Network,
  Radio,
  Search,
  Server,
  Shield,
  Smartphone,
  Timer,
  UserCheck,
  Webhook,
  Wifi,
  Workflow,
  Zap,
} from 'lucide-react';
import React, { useState } from 'react';
import { useDrag } from 'react-dnd';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { CardContent, CardHeader, CardTitle } from './ui/card';
import { EnhancedCard } from './ui/enhanced-card';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Tabs } from './ui/tabs';
import type { DesignComponent } from '@/shared/contracts';

interface ComponentType {
  type: DesignComponent['type'];
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  color: string;
  category: string;
  description: string;
}

const componentTypes: ComponentType[] = [
  // Compute & Infrastructure
  {
    type: 'server',
    label: 'Server',
    icon: Server,
    color: 'bg-blue-500',
    category: 'compute',
    description: 'Physical or virtual server instance',
  },
  {
    type: 'microservice',
    label: 'Microservice',
    icon: Box,
    color: 'bg-blue-400',
    category: 'compute',
    description: 'Independent deployable service',
  },
  {
    type: 'serverless',
    label: 'Serverless',
    icon: CloudCog,
    color: 'bg-sky-500',
    category: 'compute',
    description: 'Function-as-a-Service execution',
  },
  {
    type: 'lambda',
    label: 'AWS Lambda',
    icon: Zap,
    color: 'bg-orange-400',
    category: 'compute',
    description: 'AWS serverless compute',
  },
  {
    type: 'cloud-function',
    label: 'Cloud Function',
    icon: Cloud,
    color: 'bg-blue-600',
    category: 'compute',
    description: 'Google/Azure serverless function',
  },

  // Containers & Orchestration
  {
    type: 'container',
    label: 'Container',
    icon: Container,
    color: 'bg-cyan-500',
    category: 'containers',
    description: 'Containerized application',
  },
  {
    type: 'docker',
    label: 'Docker',
    icon: Container,
    color: 'bg-blue-700',
    category: 'containers',
    description: 'Docker container runtime',
  },
  {
    type: 'kubernetes',
    label: 'Kubernetes',
    icon: Boxes,
    color: 'bg-indigo-600',
    category: 'containers',
    description: 'Container orchestration platform',
  },

  // Databases & Storage
  {
    type: 'database',
    label: 'Database',
    icon: Database,
    color: 'bg-green-500',
    category: 'storage',
    description: 'General database system',
  },
  {
    type: 'postgresql',
    label: 'PostgreSQL',
    icon: DB,
    color: 'bg-blue-800',
    category: 'storage',
    description: 'PostgreSQL relational database',
  },
  {
    type: 'mysql',
    label: 'MySQL',
    icon: DB,
    color: 'bg-orange-600',
    category: 'storage',
    description: 'MySQL relational database',
  },
  {
    type: 'mongodb',
    label: 'MongoDB',
    icon: DB,
    color: 'bg-green-600',
    category: 'storage',
    description: 'MongoDB document database',
  },
  {
    type: 'redis',
    label: 'Redis',
    icon: HardDrive,
    color: 'bg-red-600',
    category: 'storage',
    description: 'In-memory data structure store',
  },
  {
    type: 'cache',
    label: 'Cache',
    icon: HardDrive,
    color: 'bg-orange-500',
    category: 'storage',
    description: 'Caching layer',
  },
  {
    type: 'storage',
    label: 'Storage',
    icon: Archive,
    color: 'bg-gray-600',
    category: 'storage',
    description: 'Generic storage system',
  },
  {
    type: 's3',
    label: 'AWS S3',
    icon: Archive,
    color: 'bg-orange-500',
    category: 'storage',
    description: 'AWS object storage',
  },
  {
    type: 'blob-storage',
    label: 'Blob Storage',
    icon: Archive,
    color: 'bg-blue-500',
    category: 'storage',
    description: 'Azure blob storage',
  },
  {
    type: 'file-system',
    label: 'File System',
    icon: FolderOpen,
    color: 'bg-yellow-600',
    category: 'storage',
    description: 'File system storage',
  },

  // Networking & Traffic
  {
    type: 'load-balancer',
    label: 'Load Balancer',
    icon: Zap,
    color: 'bg-purple-500',
    category: 'networking',
    description: 'Traffic distribution system',
  },
  {
    type: 'api-gateway',
    label: 'API Gateway',
    icon: Globe,
    color: 'bg-red-500',
    category: 'networking',
    description: 'API request routing and management',
  },
  {
    type: 'cdn',
    label: 'CDN',
    icon: Cloud,
    color: 'bg-purple-600',
    category: 'networking',
    description: 'Content delivery network',
  },
  {
    type: 'firewall',
    label: 'Firewall',
    icon: Shield,
    color: 'bg-red-700',
    category: 'networking',
    description: 'Network security barrier',
  },

  // Messaging & Communication
  {
    type: 'message-queue',
    label: 'Message Queue',
    icon: MessageSquare,
    color: 'bg-amber-500',
    category: 'messaging',
    description: 'Asynchronous message broker',
  },
  {
    type: 'websocket',
    label: 'WebSocket',
    icon: Radio,
    color: 'bg-green-400',
    category: 'messaging',
    description: 'Real-time bidirectional communication',
  },
  {
    type: 'grpc',
    label: 'gRPC',
    icon: Network,
    color: 'bg-blue-500',
    category: 'messaging',
    description: 'High-performance RPC framework',
  },

  // APIs & Services
  {
    type: 'rest-api',
    label: 'REST API',
    icon: Code,
    color: 'bg-emerald-500',
    category: 'apis',
    description: 'RESTful web service',
  },
  {
    type: 'graphql',
    label: 'GraphQL',
    icon: GitBranch,
    color: 'bg-pink-500',
    category: 'apis',
    description: 'GraphQL query language API',
  },
  {
    type: 'webhook',
    label: 'Webhook',
    icon: Webhook,
    color: 'bg-violet-500',
    category: 'apis',
    description: 'HTTP callback mechanism',
  },

  // Client Applications
  {
    type: 'client',
    label: 'Client',
    icon: Monitor,
    color: 'bg-gray-500',
    category: 'clients',
    description: 'Generic client application',
  },
  {
    type: 'web-app',
    label: 'Web App',
    icon: Globe,
    color: 'bg-blue-600',
    category: 'clients',
    description: 'Web application',
  },
  {
    type: 'mobile-app',
    label: 'Mobile App',
    icon: Smartphone,
    color: 'bg-green-600',
    category: 'clients',
    description: 'Mobile application',
  },
  {
    type: 'desktop-app',
    label: 'Desktop App',
    icon: Monitor,
    color: 'bg-purple-600',
    category: 'clients',
    description: 'Desktop application',
  },
  {
    type: 'iot-device',
    label: 'IoT Device',
    icon: Wifi,
    color: 'bg-teal-500',
    category: 'clients',
    description: 'Internet of Things device',
  },

  // Security & Auth
  {
    type: 'security',
    label: 'Security',
    icon: Shield,
    color: 'bg-red-600',
    category: 'security',
    description: 'Security service',
  },
  {
    type: 'authentication',
    label: 'Authentication',
    icon: Key,
    color: 'bg-yellow-600',
    category: 'security',
    description: 'User authentication service',
  },
  {
    type: 'authorization',
    label: 'Authorization',
    icon: Lock,
    color: 'bg-orange-600',
    category: 'security',
    description: 'Access control service',
  },
  {
    type: 'oauth',
    label: 'OAuth',
    icon: UserCheck,
    color: 'bg-blue-700',
    category: 'security',
    description: 'OAuth authorization framework',
  },
  {
    type: 'jwt',
    label: 'JWT',
    icon: Key,
    color: 'bg-green-700',
    category: 'security',
    description: 'JSON Web Token system',
  },

  // Monitoring & Observability
  {
    type: 'monitoring',
    label: 'Monitoring',
    icon: Activity,
    color: 'bg-blue-500',
    category: 'observability',
    description: 'System monitoring service',
  },
  {
    type: 'logging',
    label: 'Logging',
    icon: FileText,
    color: 'bg-gray-600',
    category: 'observability',
    description: 'Log aggregation system',
  },
  {
    type: 'metrics',
    label: 'Metrics',
    icon: BarChart3,
    color: 'bg-green-500',
    category: 'observability',
    description: 'Metrics collection and analysis',
  },
  {
    type: 'alerting',
    label: 'Alerting',
    icon: AlertTriangle,
    color: 'bg-red-500',
    category: 'observability',
    description: 'Alert and notification system',
  },
  {
    type: 'elasticsearch',
    label: 'Elasticsearch',
    icon: Search,
    color: 'bg-yellow-500',
    category: 'observability',
    description: 'Search and analytics engine',
  },
  {
    type: 'kibana',
    label: 'Kibana',
    icon: BarChart3,
    color: 'bg-cyan-600',
    category: 'observability',
    description: 'Data visualization platform',
  },

  // Data Processing
  {
    type: 'data-warehouse',
    label: 'Data Warehouse',
    icon: Database,
    color: 'bg-indigo-600',
    category: 'data',
    description: 'Centralized data repository',
  },
  {
    type: 'data-lake',
    label: 'Data Lake',
    icon: Database,
    color: 'bg-blue-600',
    category: 'data',
    description: 'Raw data storage system',
  },
  {
    type: 'etl',
    label: 'ETL',
    icon: Workflow,
    color: 'bg-purple-500',
    category: 'data',
    description: 'Extract, Transform, Load pipeline',
  },
  {
    type: 'stream-processing',
    label: 'Stream Processing',
    icon: Activity,
    color: 'bg-orange-500',
    category: 'data',
    description: 'Real-time data processing',
  },

  // Patterns & Architectures
  {
    type: 'event-sourcing',
    label: 'Event Sourcing',
    icon: Timer,
    color: 'bg-emerald-600',
    category: 'patterns',
    description: 'Event-driven architecture pattern',
  },
  {
    type: 'cqrs',
    label: 'CQRS',
    icon: GitBranch,
    color: 'bg-violet-600',
    category: 'patterns',
    description: 'Command Query Responsibility Segregation',
  },
  {
    type: 'edge-computing',
    label: 'Edge Computing',
    icon: Cpu,
    color: 'bg-gray-700',
    category: 'patterns',
    description: 'Distributed computing at network edge',
  },

  // Emerging Technologies
  {
    type: 'blockchain',
    label: 'Blockchain',
    icon: Layers,
    color: 'bg-yellow-700',
    category: 'emerging',
    description: 'Distributed ledger technology',
  },
  {
    type: 'ai-ml',
    label: 'AI/ML',
    icon: Brain,
    color: 'bg-pink-600',
    category: 'emerging',
    description: 'Artificial Intelligence/Machine Learning',
  },
];

const categories = [
  { id: 'all', label: 'All Components', count: componentTypes.length },
  {
    id: 'compute',
    label: 'Compute',
    count: componentTypes.filter(c => c.category === 'compute').length,
  },
  {
    id: 'containers',
    label: 'Containers',
    count: componentTypes.filter(c => c.category === 'containers').length,
  },
  {
    id: 'storage',
    label: 'Storage',
    count: componentTypes.filter(c => c.category === 'storage').length,
  },
  {
    id: 'networking',
    label: 'Networking',
    count: componentTypes.filter(c => c.category === 'networking').length,
  },
  {
    id: 'messaging',
    label: 'Messaging',
    count: componentTypes.filter(c => c.category === 'messaging').length,
  },
  { id: 'apis', label: 'APIs', count: componentTypes.filter(c => c.category === 'apis').length },
  {
    id: 'clients',
    label: 'Clients',
    count: componentTypes.filter(c => c.category === 'clients').length,
  },
  {
    id: 'security',
    label: 'Security',
    count: componentTypes.filter(c => c.category === 'security').length,
  },
  {
    id: 'observability',
    label: 'Observability',
    count: componentTypes.filter(c => c.category === 'observability').length,
  },
  { id: 'data', label: 'Data', count: componentTypes.filter(c => c.category === 'data').length },
  {
    id: 'patterns',
    label: 'Patterns',
    count: componentTypes.filter(c => c.category === 'patterns').length,
  },
  {
    id: 'emerging',
    label: 'Emerging',
    count: componentTypes.filter(c => c.category === 'emerging').length,
  },
];

interface DraggableComponentProps extends ComponentType {}

function DraggableComponent({
  type,
  label,
  icon: Icon,
  color,
  description,
}: DraggableComponentProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'component',
    item: { type },
    collect: monitor => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  return (
    <div
      ref={drag}
      data-testid={`palette-item-${type}`}
      className={`
        group p-2 rounded-lg border border-border/50 cursor-move transition-all duration-200
        hover:border-primary/50 hover:bg-accent/30 hover:shadow-sm hover:scale-[1.02]
        active:scale-95 bg-card/30 backdrop-blur-sm
        ${isDragging ? 'opacity-50 rotate-1 scale-105 border-primary shadow-lg' : ''}
      `}
      title={description}
    >
      <div className='flex items-center space-x-2.5'>
        <div
          className={`w-6 h-6 rounded-md ${color} flex items-center justify-center transition-all duration-200 group-hover:scale-110 shadow-sm`}
        >
          <Icon className='w-3 h-3 text-white' />
        </div>
        <div className='flex-1 min-w-0'>
          <span className='text-sm font-medium truncate block leading-tight'>{label}</span>
          <span className='text-xs text-muted-foreground truncate block leading-tight mt-0.5'>
            {description}
          </span>
        </div>
      </div>
    </div>
  );
}

export function ComponentPalette() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const filteredComponents = componentTypes.filter(component => {
    const matchesSearch =
      component.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      component.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'all' || component.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <EnhancedCard elevation={2} glass className='h-full flex flex-col' gradientBorder>
      <CardHeader className='pb-3 bg-gradient-to-r from-muted/30 via-card to-muted/20 border-b border-border/20'>
        <CardTitle className='flex items-center justify-between text-sm'>
          <span className='bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent' />
        </CardTitle>
        <div className='space-y-2'>
          <div className='relative'>
            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground' />
            <Input
              placeholder='Search...'
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className='text-sm bg-background/60 backdrop-blur border-border/30 focus:bg-background/80 transition-all duration-200 pl-10 rounded-lg'
            />
          </div>
          <Badge
            variant='secondary'
            className='text-xs bg-primary/10 text-primary border-primary/20'
          >
            {filteredComponents.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className='flex-1 flex flex-col p-0'>
        <Tabs
          value={activeCategory}
          onValueChange={setActiveCategory}
          className='flex-1 flex flex-col'
        >
          <div className='px-3 py-2 border-b border-border/20 bg-[var(--glass-bg)] backdrop-blur-sm'>
            <ScrollArea className='w-full'>
              <div className='flex flex-wrap gap-1'>
                {categories.slice(0, 4).map(category => (
                  <Button
                    key={category.id}
                    variant={activeCategory === category.id ? 'default' : 'ghost'}
                    size='sm'
                    onClick={() => setActiveCategory(category.id)}
                    className='text-xs h-7 px-2 flex items-center gap-1 rounded-full'
                  >
                    {category.label}
                    <Badge
                      variant={activeCategory === category.id ? 'secondary' : 'outline'}
                      className='text-[10px] h-4 px-1 ml-1'
                    >
                      {category.count}
                    </Badge>
                  </Button>
                ))}
              </div>
              {categories.length > 4 && (
                <div className='flex flex-wrap gap-1 mt-1'>
                  {categories.slice(4).map(category => (
                    <Button
                      key={category.id}
                      variant={activeCategory === category.id ? 'default' : 'ghost'}
                      size='sm'
                      onClick={() => setActiveCategory(category.id)}
                      className='text-xs h-7 px-2 flex items-center gap-1 rounded-full'
                    >
                      {category.label}
                      <Badge
                        variant={activeCategory === category.id ? 'secondary' : 'outline'}
                        className='text-[10px] h-4 px-1 ml-1'
                      >
                        {category.count}
                      </Badge>
                    </Button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          <div className='flex-1 px-3 pb-3 mt-0'>
            <ScrollArea className='h-full'>
              {activeCategory === 'all' ? (
                <div className='space-y-4'>
                  {categories.slice(1).map(category => {
                    const categoryComponents = filteredComponents.filter(
                      c => c.category === category.id
                    );
                    if (categoryComponents.length === 0) return null;

                    return (
                      <div key={category.id}>
                        <div className='flex items-center space-x-2 mb-2 sticky top-0 bg-card/90 backdrop-blur-sm py-1 z-10'>
                          <h4 className='text-sm font-medium capitalize text-foreground/90'>
                            {category.label}
                          </h4>
                          <Badge variant='outline' className='text-xs h-4 px-1'>
                            {categoryComponents.length}
                          </Badge>
                        </div>
                        <div className='space-y-1'>
                          {categoryComponents.map(component => (
                            <DraggableComponent key={component.type} {...component} />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className='space-y-1'>
                  {filteredComponents
                    .filter(c => c.category === activeCategory)
                    .map(component => (
                      <DraggableComponent key={component.type} {...component} />
                    ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </Tabs>

        <div className='px-3 py-2 border-t bg-gradient-to-r from-muted/20 via-card to-muted/10 backdrop-blur-sm'>
          <p className='text-xs text-muted-foreground'>
            💡 Drag components to the canvas to build your system architecture
          </p>
        </div>
      </CardContent>
    </EnhancedCard>
  );
}
