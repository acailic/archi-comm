// src/dev/testData.ts
// Comprehensive mock data for testing ArchiComm components in isolation
// Provides realistic test data for challenges, canvas states, audio recordings, and component configurations
// RELEVANT FILES: ../lib/challenge-config.ts, ../shared/contracts/index.ts, ../components/ChallengeSelection.tsx, ../components/CanvasArea.tsx

import { ExtendedChallenge } from '../lib/challenge-config';
import { DesignComponent, Connection, AudioData } from '../shared/contracts';

// Mock challenges using ExtendedChallenge interface
export const mockChallenges: ExtendedChallenge[] = [
  {
    id: 'url-shortener',
    title: 'Design a URL Shortener',
    description: 'Design a scalable URL shortening service like bit.ly or tinyurl.com',
    difficulty: 'beginner',
    estimatedTime: 30,
    category: 'system-design',
    tags: ['caching', 'databases', 'scaling'],
    requirements: [
      'Design database schema for URL mappings',
      'Handle high read/write ratios',
      'Implement caching strategy',
      'Design URL encoding algorithm'
    ],
    hints: [
      'Consider using a NoSQL database for better scalability',
      'Think about cache-aside pattern for frequently accessed URLs',
      'Base62 encoding is commonly used for short URLs'
    ],
    referenceTranscript: 'For a URL shortener system, we need to handle both shortening and redirecting URLs efficiently. The architecture starts with a load balancer distributing requests to multiple application servers. Each server connects to a database for storing URL mappings and a cache layer for frequently accessed URLs. The database should be optimized for fast lookups and can be either relational or NoSQL. Redis cache helps reduce database load by storing popular URL mappings. We also need to consider URL encoding algorithms like Base62 for generating short URLs and implementing analytics for tracking click counts.',
    keyConcepts: ['database', 'cache', 'load balancer', 'redis', 'url encoding', 'base62', 'application server', 'analytics', 'nosql', 'lookup'],
    template: {
      components: [
        { type: 'api-gateway', position: { x: 200, y: 100 }, label: 'API Gateway' },
        { type: 'database', position: { x: 400, y: 200 }, label: 'URL Database' },
        { type: 'cache', position: { x: 400, y: 100 }, label: 'Redis Cache' }
      ],
      connections: []
    },
    resources: [
      { type: 'article', title: 'Designing a URL Shortener', url: 'https://example.com/url-shortener' },
      { type: 'video', title: 'System Design Interview: URL Shortener', url: 'https://example.com/video' }
    ]
  },
  {
    id: 'chat-system',
    title: 'Real-time Chat System',
    description: 'Design a scalable real-time messaging platform like WhatsApp or Slack',
    difficulty: 'intermediate',
    estimatedTime: 45,
    category: 'system-design',
    tags: ['websockets', 'message-queues', 'real-time'],
    requirements: [
      'Handle real-time message delivery',
      'Design message storage and retrieval',
      'Implement user presence tracking',
      'Handle message ordering and delivery guarantees'
    ],
    hints: [
      'WebSockets are essential for real-time communication',
      'Consider using message queues for reliable delivery',
      'Think about message partitioning strategies'
    ],
    template: {
      components: [
        { type: 'load-balancer', position: { x: 100, y: 150 }, label: 'Load Balancer' },
        { type: 'server', position: { x: 300, y: 100 }, label: 'Chat Server' },
        { type: 'message-queue', position: { x: 500, y: 150 }, label: 'Message Queue' },
        { type: 'database', position: { x: 300, y: 250 }, label: 'Message DB' }
      ],
      connections: []
    },
    resources: []
  },
  {
    id: 'ecommerce-platform',
    title: 'E-commerce Platform',
    description: 'Design a comprehensive e-commerce platform handling millions of products and users',
    difficulty: 'advanced',
    estimatedTime: 60,
    category: 'architecture',
    tags: ['microservices', 'transactions', 'search', 'payments'],
    requirements: [
      'Design microservices architecture',
      'Handle payment processing',
      'Implement product search and recommendations',
      'Manage inventory and order processing'
    ],
    hints: [
      'Consider CQRS pattern for read/write separation',
      'Event sourcing can help with audit trails',
      'Think about eventual consistency in distributed systems'
    ],
    template: {
      components: [
        { type: 'api-gateway', position: { x: 200, y: 100 }, label: 'API Gateway' },
        { type: 'server', position: { x: 100, y: 200 }, label: 'User Service' },
        { type: 'server', position: { x: 200, y: 200 }, label: 'Product Service' },
        { type: 'server', position: { x: 300, y: 200 }, label: 'Order Service' },
        { type: 'server', position: { x: 400, y: 200 }, label: 'Payment Service' },
        { type: 'database', position: { x: 200, y: 300 }, label: 'Primary DB' },
        { type: 'cache', position: { x: 350, y: 100 }, label: 'Redis Cache' },
        { type: 'search-engine', position: { x: 500, y: 300 }, label: 'Elasticsearch' }
      ],
      connections: []
    },
    resources: []
  },
  {
    id: 'notification-system',
    title: 'Push Notification System',
    description: 'Design a system to send push notifications to millions of mobile devices',
    difficulty: 'intermediate',
    estimatedTime: 40,
    category: 'scaling',
    tags: ['mobile', 'queues', 'third-party-apis'],
    requirements: [
      'Handle high throughput notification sending',
      'Manage different notification channels (push, email, SMS)',
      'Implement retry mechanisms and failure handling',
      'Track delivery and engagement metrics'
    ],
    hints: [
      'Consider using message queues for decoupling',
      'Think about rate limiting for third-party APIs',
      'Dead letter queues can handle failed deliveries'
    ],
    template: {
      components: [
        { type: 'api-gateway', position: { x: 150, y: 100 }, label: 'Notification API' },
        { type: 'message-queue', position: { x: 300, y: 150 }, label: 'Queue' },
        { type: 'server', position: { x: 450, y: 100 }, label: 'Push Service' },
        { type: 'external-service', position: { x: 600, y: 100 }, label: 'FCM/APNS' }
      ],
      connections: []
    },
    resources: []
  }
];

// Mock canvas states with different complexity levels
export const mockCanvasStates = {
  empty: {
    components: [] as DesignComponent[],
    connections: [] as Connection[]
  },
  
  basic: {
    components: [
      {
        id: 'comp-1',
        type: 'server',
        position: { x: 200, y: 150 },
        label: 'Web Server',
        properties: { instances: 2, memory: '4GB' }
      },
      {
        id: 'comp-2',
        type: 'database',
        position: { x: 400, y: 150 },
        label: 'PostgreSQL',
        properties: { storage: '100GB', replicas: 1 }
      },
      {
        id: 'comp-3',
        type: 'cache',
        position: { x: 200, y: 50 },
        label: 'Redis Cache',
        properties: { memory: '2GB', ttl: '1h' }
      }
    ] as DesignComponent[],
    connections: [
      {
        id: 'conn-1',
        source: 'comp-1',
        target: 'comp-2',
        type: 'sync',
        label: 'SQL Queries',
        properties: { protocol: 'TCP', port: 5432 }
      },
      {
        id: 'conn-2',
        source: 'comp-1',
        target: 'comp-3',
        type: 'sync',
        label: 'Cache Operations',
        properties: { protocol: 'TCP', port: 6379 }
      }
    ] as Connection[]
  },

  complex: {
    components: [
      {
        id: 'lb-1',
        type: 'load-balancer',
        position: { x: 100, y: 200 },
        label: 'Load Balancer',
        properties: { algorithm: 'round-robin' }
      },
      {
        id: 'api-1',
        type: 'api-gateway',
        position: { x: 250, y: 100 },
        label: 'API Gateway',
        properties: { rateLimit: '1000/min' }
      },
      {
        id: 'auth-1',
        type: 'server',
        position: { x: 400, y: 80 },
        label: 'Auth Service',
        properties: { instances: 3 }
      },
      {
        id: 'user-1',
        type: 'server',
        position: { x: 400, y: 150 },
        label: 'User Service',
        properties: { instances: 5 }
      },
      {
        id: 'order-1',
        type: 'server',
        position: { x: 400, y: 220 },
        label: 'Order Service',
        properties: { instances: 4 }
      },
      {
        id: 'payment-1',
        type: 'server',
        position: { x: 400, y: 290 },
        label: 'Payment Service',
        properties: { instances: 2 }
      },
      {
        id: 'db-1',
        type: 'database',
        position: { x: 600, y: 150 },
        label: 'Primary DB',
        properties: { type: 'PostgreSQL', replicas: 2 }
      },
      {
        id: 'cache-1',
        type: 'cache',
        position: { x: 600, y: 80 },
        label: 'Redis Cluster',
        properties: { nodes: 6, memory: '16GB' }
      },
      {
        id: 'queue-1',
        type: 'message-queue',
        position: { x: 250, y: 350 },
        label: 'Message Queue',
        properties: { type: 'RabbitMQ', partitions: 12 }
      },
      {
        id: 'search-1',
        type: 'search-engine',
        position: { x: 600, y: 290 },
        label: 'Elasticsearch',
        properties: { indices: 5, shards: 15 }
      }
    ] as DesignComponent[],
    connections: [
      { id: 'conn-1', source: 'lb-1', target: 'api-1', type: 'sync', label: 'HTTP Requests' },
      { id: 'conn-2', source: 'api-1', target: 'auth-1', type: 'sync', label: 'Auth Check' },
      { id: 'conn-3', source: 'api-1', target: 'user-1', type: 'sync', label: 'User API' },
      { id: 'conn-4', source: 'api-1', target: 'order-1', type: 'sync', label: 'Order API' },
      { id: 'conn-5', source: 'order-1', target: 'payment-1', type: 'async', label: 'Payment Events' },
      { id: 'conn-6', source: 'user-1', target: 'db-1', type: 'sync', label: 'User Data' },
      { id: 'conn-7', source: 'order-1', target: 'db-1', type: 'sync', label: 'Order Data' },
      { id: 'conn-8', source: 'auth-1', target: 'cache-1', type: 'sync', label: 'Session Cache' },
      { id: 'conn-9', source: 'user-1', target: 'cache-1', type: 'sync', label: 'User Cache' },
      { id: 'conn-10', source: 'order-1', target: 'queue-1', type: 'async', label: 'Order Events' },
      { id: 'conn-11', source: 'payment-1', target: 'queue-1', type: 'async', label: 'Payment Events' },
      { id: 'conn-12', source: 'order-1', target: 'search-1', type: 'sync', label: 'Search Indexing' }
    ] as Connection[]
  },

  urlShortener: {
    components: [
      {
        id: 'client-1',
        type: 'client',
        position: { x: 50, y: 150 },
        label: 'Web Client',
        properties: {}
      },
      {
        id: 'lb-1',
        type: 'load-balancer',
        position: { x: 200, y: 150 },
        label: 'Load Balancer',
        properties: { algorithm: 'least-connections' }
      },
      {
        id: 'app-1',
        type: 'server',
        position: { x: 350, y: 100 },
        label: 'App Server 1',
        properties: { instances: 1 }
      },
      {
        id: 'app-2',
        type: 'server',
        position: { x: 350, y: 200 },
        label: 'App Server 2',
        properties: { instances: 1 }
      },
      {
        id: 'cache-1',
        type: 'cache',
        position: { x: 500, y: 80 },
        label: 'Redis Cache',
        properties: { memory: '4GB', ttl: '24h' }
      },
      {
        id: 'db-1',
        type: 'database',
        position: { x: 500, y: 220 },
        label: 'URL Database',
        properties: { type: 'MongoDB', storage: '500GB' }
      }
    ] as DesignComponent[],
    connections: [
      { id: 'conn-1', source: 'client-1', target: 'lb-1', type: 'sync', label: 'HTTPS' },
      { id: 'conn-2', source: 'lb-1', target: 'app-1', type: 'sync', label: 'HTTP' },
      { id: 'conn-3', source: 'lb-1', target: 'app-2', type: 'sync', label: 'HTTP' },
      { id: 'conn-4', source: 'app-1', target: 'cache-1', type: 'sync', label: 'Cache Check' },
      { id: 'conn-5', source: 'app-2', target: 'cache-1', type: 'sync', label: 'Cache Check' },
      { id: 'conn-6', source: 'app-1', target: 'db-1', type: 'sync', label: 'URL Lookup' },
      { id: 'conn-7', source: 'app-2', target: 'db-1', type: 'sync', label: 'URL Lookup' }
    ] as Connection[]
  },

  chatSystem: {
    components: [
      {
        id: 'client-1',
        type: 'client',
        position: { x: 50, y: 200 },
        label: 'Mobile App',
        properties: {}
      },
      {
        id: 'client-2',
        type: 'client',
        position: { x: 50, y: 150 },
        label: 'Web Client',
        properties: {}
      },
      {
        id: 'ws-1',
        type: 'server',
        position: { x: 250, y: 100 },
        label: 'WebSocket Server',
        properties: { connections: '10K' }
      },
      {
        id: 'chat-1',
        type: 'server',
        position: { x: 250, y: 200 },
        label: 'Chat Service',
        properties: { instances: 3 }
      },
      {
        id: 'presence-1',
        type: 'server',
        position: { x: 250, y: 300 },
        label: 'Presence Service',
        properties: { instances: 2 }
      },
      {
        id: 'queue-1',
        type: 'message-queue',
        position: { x: 450, y: 150 },
        label: 'Message Queue',
        properties: { type: 'Apache Kafka', partitions: 24 }
      },
      {
        id: 'db-1',
        type: 'database',
        position: { x: 450, y: 250 },
        label: 'Message DB',
        properties: { type: 'Cassandra', nodes: 6 }
      },
      {
        id: 'cache-1',
        type: 'cache',
        position: { x: 450, y: 50 },
        label: 'User Cache',
        properties: { memory: '8GB' }
      }
    ] as DesignComponent[],
    connections: [
      { id: 'conn-1', source: 'client-1', target: 'ws-1', type: 'sync', label: 'WebSocket' },
      { id: 'conn-2', source: 'client-2', target: 'ws-1', type: 'sync', label: 'WebSocket' },
      { id: 'conn-3', source: 'ws-1', target: 'chat-1', type: 'sync', label: 'Message API' },
      { id: 'conn-4', source: 'ws-1', target: 'presence-1', type: 'sync', label: 'Presence API' },
      { id: 'conn-5', source: 'chat-1', target: 'queue-1', type: 'async', label: 'Message Events' },
      { id: 'conn-6', source: 'chat-1', target: 'db-1', type: 'sync', label: 'Store Messages' },
      { id: 'conn-7', source: 'presence-1', target: 'cache-1', type: 'sync', label: 'User Status' },
      { id: 'conn-8', source: 'queue-1', target: 'ws-1', type: 'async', label: 'Message Delivery' }
    ] as Connection[]
  }
};

// Mock audio recording states
export const mockAudioStates = {
  idle: {
    isRecording: false,
    isPlaying: false,
    audioBlob: null,
    transcript: '',
    duration: 0,
    error: null
  } as AudioData,

  recording: {
    isRecording: true,
    isPlaying: false,
    audioBlob: null,
    transcript: '',
    duration: 15.5,
    error: null
  } as AudioData,

  playing: {
    isRecording: false,
    isPlaying: true,
    audioBlob: new Blob(['mock audio data'], { type: 'audio/webm' }),
    transcript: 'This is a sample transcript of the recorded audio explanation.',
    duration: 45.2,
    error: null
  } as AudioData,

  error: {
    isRecording: false,
    isPlaying: false,
    audioBlob: null,
    transcript: '',
    duration: 0,
    error: 'Microphone access denied. Please enable microphone permissions.'
  } as AudioData,

  completed: {
    isRecording: false,
    isPlaying: false,
    audioBlob: new Blob(['completed audio recording'], { type: 'audio/webm' }),
    transcript: 'In this architecture, we have a load balancer distributing requests across multiple application servers. The servers connect to a shared database and use Redis for caching frequently accessed data.',
    duration: 87.3,
    error: null
  } as AudioData
};

// Mock component configurations for the component palette
export const mockComponentConfigs = {
  availableComponents: [
    { type: 'server', label: 'Server', icon: '🖥️', category: 'compute' },
    { type: 'database', label: 'Database', icon: '🗄️', category: 'storage' },
    { type: 'cache', label: 'Cache', icon: '⚡', category: 'storage' },
    { type: 'load-balancer', label: 'Load Balancer', icon: '⚖️', category: 'networking' },
    { type: 'api-gateway', label: 'API Gateway', icon: '🚪', category: 'networking' },
    { type: 'message-queue', label: 'Message Queue', icon: '📬', category: 'messaging' },
    { type: 'search-engine', label: 'Search Engine', icon: '🔍', category: 'search' },
    { type: 'cdn', label: 'CDN', icon: '🌐', category: 'networking' },
    { type: 'client', label: 'Client', icon: '📱', category: 'presentation' },
    { type: 'external-service', label: 'External Service', icon: '🔌', category: 'integration' }
  ],
  
  componentProperties: {
    server: {
      instances: { type: 'number', default: 1, label: 'Instances' },
      memory: { type: 'text', default: '2GB', label: 'Memory' },
      cpu: { type: 'text', default: '2 vCPU', label: 'CPU' }
    },
    database: {
      type: { type: 'select', options: ['PostgreSQL', 'MySQL', 'MongoDB', 'Cassandra'], default: 'PostgreSQL', label: 'Database Type' },
      storage: { type: 'text', default: '100GB', label: 'Storage' },
      replicas: { type: 'number', default: 1, label: 'Replicas' }
    },
    cache: {
      type: { type: 'select', options: ['Redis', 'Memcached'], default: 'Redis', label: 'Cache Type' },
      memory: { type: 'text', default: '2GB', label: 'Memory' },
      ttl: { type: 'text', default: '1h', label: 'TTL' }
    },
    'load-balancer': {
      algorithm: { type: 'select', options: ['round-robin', 'least-connections', 'ip-hash'], default: 'round-robin', label: 'Algorithm' },
      healthCheck: { type: 'boolean', default: true, label: 'Health Check' }
    },
    'api-gateway': {
      rateLimit: { type: 'text', default: '1000/min', label: 'Rate Limit' },
      authentication: { type: 'boolean', default: true, label: 'Authentication' },
      cors: { type: 'boolean', default: true, label: 'CORS Enabled' }
    },
    'message-queue': {
      type: { type: 'select', options: ['RabbitMQ', 'Apache Kafka', 'AWS SQS'], default: 'RabbitMQ', label: 'Queue Type' },
      partitions: { type: 'number', default: 3, label: 'Partitions' },
      retention: { type: 'text', default: '7d', label: 'Message Retention' }
    }
  }
};

// Mock design patterns for common system architectures
export const mockDesignPatterns = {
  microservices: {
    name: 'Microservices Architecture',
    description: 'Distributed system with independently deployable services',
    components: [
      { type: 'api-gateway', position: { x: 200, y: 100 }, label: 'API Gateway' },
      { type: 'server', position: { x: 100, y: 200 }, label: 'User Service' },
      { type: 'server', position: { x: 200, y: 200 }, label: 'Product Service' },
      { type: 'server', position: { x: 300, y: 200 }, label: 'Order Service' },
      { type: 'database', position: { x: 100, y: 300 }, label: 'User DB' },
      { type: 'database', position: { x: 200, y: 300 }, label: 'Product DB' },
      { type: 'database', position: { x: 300, y: 300 }, label: 'Order DB' }
    ]
  },
  
  layered: {
    name: 'Layered Architecture',
    description: 'Traditional three-tier architecture with presentation, business, and data layers',
    components: [
      { type: 'client', position: { x: 200, y: 50 }, label: 'Presentation Layer' },
      { type: 'server', position: { x: 200, y: 150 }, label: 'Business Logic' },
      { type: 'database', position: { x: 200, y: 250 }, label: 'Data Layer' }
    ]
  },
  
  eventDriven: {
    name: 'Event-Driven Architecture',
    description: 'Architecture based on event production, detection, and consumption',
    components: [
      { type: 'server', position: { x: 100, y: 100 }, label: 'Event Producer' },
      { type: 'message-queue', position: { x: 300, y: 150 }, label: 'Event Bus' },
      { type: 'server', position: { x: 500, y: 100 }, label: 'Event Consumer 1' },
      { type: 'server', position: { x: 500, y: 200 }, label: 'Event Consumer 2' }
    ]
  }
};

// Mock data for UI component scenarios
export const mockUIComponentData = {
  // Card content data
  cardContent: {
    projects: [
      {
        id: '1',
        title: 'URL Shortener System',
        description: 'Scalable URL shortening service with caching and analytics',
        status: 'In Progress',
        created: '2024-01-15',
        author: 'John Doe'
      },
      {
        id: '2',
        title: 'Chat Application',
        description: 'Real-time messaging platform with WebSocket support',
        status: 'Completed',
        created: '2024-01-10',
        author: 'Jane Smith'
      },
      {
        id: '3',
        title: 'E-commerce Platform',
        description: 'Microservices-based online store with payment integration',
        status: 'Planning',
        created: '2024-01-20',
        author: 'Mike Johnson'
      }
    ],
    users: [
      {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'Senior Architect',
        avatar: '👨‍💻',
        status: 'online'
      },
      {
        id: '2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        role: 'System Designer',
        avatar: '👩‍💻',
        status: 'offline'
      },
      {
        id: '3',
        name: 'Mike Johnson',
        email: 'mike@example.com',
        role: 'DevOps Engineer',
        avatar: '👨‍🔧',
        status: 'busy'
      }
    ]
  },

  // Form validation data
  formValidation: {
    required: {
      field: 'email',
      message: 'Email address is required',
      type: 'error'
    },
    email: {
      field: 'email',
      message: 'Please enter a valid email address',
      type: 'error'
    },
    password: {
      field: 'password',
      message: 'Password must be at least 8 characters long',
      type: 'error'
    },
    success: {
      field: 'email',
      message: 'Email format is valid',
      type: 'success'
    }
  },

  // Table mock data
  tableData: {
    columns: [
      { id: 'name', label: 'Name', type: 'text', sortable: true },
      { id: 'email', label: 'Email', type: 'text', sortable: true },
      { id: 'role', label: 'Role', type: 'text', sortable: false },
      { id: 'status', label: 'Status', type: 'badge', sortable: true },
      { id: 'created', label: 'Created', type: 'date', sortable: true },
      { id: 'actions', label: 'Actions', type: 'actions', sortable: false }
    ],
    rows: [
      {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'Senior Architect',
        status: 'active',
        created: '2024-01-15T09:30:00Z'
      },
      {
        id: '2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        role: 'System Designer',
        status: 'inactive',
        created: '2024-01-10T14:20:00Z'
      },
      {
        id: '3',
        name: 'Mike Johnson',
        email: 'mike@example.com',
        role: 'DevOps Engineer',
        status: 'pending',
        created: '2024-01-20T11:45:00Z'
      }
    ],
    pagination: {
      current: 1,
      total: 3,
      pageSize: 10,
      totalPages: 1
    }
  },

  // Navigation mock data
  navigationData: {
    menuItems: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: '🏠',
        path: '/dashboard',
        active: true
      },
      {
        id: 'projects',
        label: 'Projects',
        icon: '📁',
        path: '/projects',
        active: false,
        children: [
          { id: 'all-projects', label: 'All Projects', path: '/projects' },
          { id: 'templates', label: 'Templates', path: '/projects/templates' },
          { id: 'archived', label: 'Archived', path: '/projects/archived' }
        ]
      },
      {
        id: 'components',
        label: 'Components',
        icon: '🧩',
        path: '/components',
        active: false
      },
      {
        id: 'settings',
        label: 'Settings',
        icon: '⚙️',
        path: '/settings',
        active: false
      }
    ],
    breadcrumbs: [
      { label: 'Dashboard', path: '/dashboard' },
      { label: 'Projects', path: '/projects' },
      { label: 'URL Shortener System', path: '/projects/url-shortener' }
    ]
  },

  // Alert messages data
  alerts: {
    info: {
      title: 'New Feature Available',
      message: 'The latest update includes improved canvas performance and new component templates.',
      variant: 'default'
    },
    warning: {
      title: 'Storage Warning',
      message: 'You are approaching your storage limit. Consider upgrading your plan or removing unused projects.',
      variant: 'warning'
    },
    error: {
      title: 'Connection Error',
      message: 'Unable to save changes. Please check your internet connection and try again.',
      variant: 'destructive'
    },
    success: {
      title: 'Project Saved',
      message: 'Your changes have been saved successfully.',
      variant: 'default'
    }
  },

  // Chart mock data
  chartData: {
    performanceMetrics: [
      { name: 'Jan', value: 85 },
      { name: 'Feb', value: 92 },
      { name: 'Mar', value: 78 },
      { name: 'Apr', value: 96 },
      { name: 'May', value: 89 },
      { name: 'Jun', value: 94 }
    ],
    systemUsage: {
      cpu: 67,
      memory: 84,
      disk: 45,
      network: 32
    },
    userActivity: {
      daily: [
        { date: '2024-01-01', users: 125 },
        { date: '2024-01-02', users: 142 },
        { date: '2024-01-03', users: 118 },
        { date: '2024-01-04', users: 167 },
        { date: '2024-01-05', users: 198 }
      ]
    }
  },

  // Layout mock data
  layoutData: {
    sidebarConfig: {
      collapsed: false,
      width: 280,
      minWidth: 200,
      maxWidth: 400
    },
    panelConfig: {
      left: { width: 300, minWidth: 200, maxWidth: 500 },
      right: { width: 350, minWidth: 250, maxWidth: 600 },
      bottom: { height: 200, minHeight: 150, maxHeight: 400 }
    }
  },

  // Content mock data
  contentData: {
    richText: `
      <h2>System Architecture Overview</h2>
      <p>This document outlines the high-level architecture for our distributed system.</p>
      <h3>Key Components</h3>
      <ul>
        <li>Load Balancer - distributes incoming requests</li>
        <li>API Gateway - handles authentication and routing</li>
        <li>Microservices - independent business logic units</li>
        <li>Database Cluster - persistent data storage</li>
      </ul>
    `,
    images: [
      {
        id: '1',
        url: '/api/placeholder/300/200',
        alt: 'System Architecture Diagram',
        size: { width: 300, height: 200 }
      },
      {
        id: '2',
        url: '/api/placeholder/400/300',
        alt: 'Database Schema',
        size: { width: 400, height: 300 }
      }
    ],
    fileUpload: {
      accepted: ['.png', '.jpg', '.jpeg', '.svg', '.pdf'],
      maxSize: '10MB',
      multiple: true
    }
  }
};