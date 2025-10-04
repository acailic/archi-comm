// src/lib/education/educational-content.ts
// Centralized registry of educational content for learning tooltips and "Did You Know?" facts
// Provides contextual education and interesting facts about system design patterns and components
// RELEVANT FILES: src/lib/canvas/component-presets.ts, src/packages/ui/components/SolutionHints.tsx, src/packages/ui/components/ContextualHelpSystem.tsx

export interface EducationalTip {
  id: string;
  title: string;
  content: string;
  category: 'architecture' | 'performance' | 'scalability' | 'security' | 'best-practice';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  relatedComponents: string[];
}

export interface DidYouKnowFact {
  id: string;
  fact: string;
  source?: string;
  learnMoreUrl?: string;
}

export interface ComponentEducation {
  componentType: string;
  description: string;
  useCases: string[];
  bestPractices: string[];
  commonMistakes: string[];
  examples: string[];
}

// Component education registry
export const componentEducationRegistry: Record<string, ComponentEducation> = {
  database: {
    componentType: 'database',
    description: 'Persistent storage for structured data with ACID guarantees',
    useCases: [
      'User data storage and authentication',
      'Transaction records and financial data',
      'Inventory management systems',
      'Content management systems',
      'Analytics and reporting data',
    ],
    bestPractices: [
      'Use connection pooling to manage database connections efficiently',
      'Implement read replicas for scaling read-heavy workloads',
      'Regular backups with point-in-time recovery',
      'Index frequently queried columns for better performance',
      'Use prepared statements to prevent SQL injection',
    ],
    commonMistakes: [
      'No indexing strategy leading to slow queries',
      'Storing large blobs directly in database',
      'Single point of failure without replication',
      'Missing foreign key constraints',
      'Not using transactions for related operations',
    ],
    examples: [
      'Instagram: PostgreSQL for user data',
      'Twitter: MySQL clusters for tweet storage',
      'Netflix: Cassandra for distributed data',
    ],
  },
  cache: {
    componentType: 'cache',
    description: 'High-speed data storage layer for frequently accessed data',
    useCases: [
      'Session storage for user authentication',
      'API response caching to reduce latency',
      'Database query result caching',
      'Rate limiting counters',
      'Real-time leaderboards and counters',
    ],
    bestPractices: [
      'Set appropriate TTL (Time To Live) for cached data',
      'Use cache-aside pattern for read-heavy workloads',
      'Implement cache warming for critical data',
      'Monitor cache hit/miss ratios',
      'Use distributed caching for horizontal scaling',
    ],
    commonMistakes: [
      'Caching data that changes frequently',
      'Not handling cache misses gracefully',
      'Cache stampede during high traffic',
      'Inconsistent data between cache and database',
      'Over-caching leading to memory issues',
    ],
    examples: [
      'Reddit: Redis for voting and session data',
      'Pinterest: Memcached for feed caching',
      'Stack Overflow: Redis for real-time updates',
    ],
  },
  'load-balancer': {
    componentType: 'load-balancer',
    description: 'Distributes incoming traffic across multiple servers for high availability',
    useCases: [
      'Distribute HTTP/HTTPS traffic across web servers',
      'Health checking and automatic failover',
      'SSL/TLS termination',
      'Geographic traffic routing',
      'API gateway load distribution',
    ],
    bestPractices: [
      'Use health checks to detect and remove unhealthy servers',
      'Implement session persistence (sticky sessions) when needed',
      'Configure appropriate timeout values',
      'Use weighted round-robin for gradual rollouts',
      'Enable connection pooling and keep-alive',
    ],
    commonMistakes: [
      'No health checks leading to traffic to dead servers',
      'Single load balancer without redundancy',
      'Incorrect session affinity configuration',
      'Not considering connection limits',
      'Missing SSL certificate renewal automation',
    ],
    examples: [
      'Netflix: ELB for service distribution',
      'Uber: Custom load balancers for geo-routing',
      'Airbnb: HAProxy for traffic management',
    ],
  },
  'message-queue': {
    componentType: 'message-queue',
    description: 'Asynchronous communication channel for decoupled service communication',
    useCases: [
      'Background job processing (email sending, image processing)',
      'Event-driven microservices communication',
      'Order processing and fulfillment workflows',
      'Log aggregation and analytics pipelines',
      'Real-time notification delivery',
    ],
    bestPractices: [
      'Use dead letter queues for failed message handling',
      'Implement idempotent message processing',
      'Set appropriate message TTL and retention',
      'Use message priorities for critical tasks',
      'Monitor queue depth and processing lag',
    ],
    commonMistakes: [
      'Not handling message failures and retries',
      'Processing messages multiple times without idempotency',
      'Queue depth growing unbounded',
      'Missing message ordering guarantees',
      'Not implementing circuit breakers',
    ],
    examples: [
      'Lyft: Kafka for event streaming',
      'Spotify: RabbitMQ for service communication',
      'Amazon: SQS for order processing',
    ],
  },
  'api-gateway': {
    componentType: 'api-gateway',
    description: 'Single entry point for API requests with routing and authentication',
    useCases: [
      'API request routing to microservices',
      'Authentication and authorization',
      'Rate limiting and throttling',
      'Request/response transformation',
      'API versioning and backward compatibility',
    ],
    bestPractices: [
      'Implement rate limiting per client/endpoint',
      'Use API keys and OAuth for authentication',
      'Cache responses when appropriate',
      'Validate and sanitize all inputs',
      'Provide detailed error messages',
    ],
    commonMistakes: [
      'No rate limiting leading to abuse',
      'Exposing internal service URLs',
      'Missing request validation',
      'No API versioning strategy',
      'Tight coupling with backend services',
    ],
    examples: [
      'Netflix: Zuul gateway for API routing',
      'Amazon: API Gateway for serverless APIs',
      'Uber: Custom gateway for ride services',
    ],
  },
  microservice: {
    componentType: 'microservice',
    description: 'Independent, deployable service focused on specific business capability',
    useCases: [
      'User authentication and profile management',
      'Payment processing and billing',
      'Search and recommendation engines',
      'Notification and messaging services',
      'Content delivery and media processing',
    ],
    bestPractices: [
      'Keep services small and focused on single responsibility',
      'Use API contracts and versioning',
      'Implement health checks and monitoring',
      'Use circuit breakers for resilience',
      'Deploy services independently',
    ],
    commonMistakes: [
      'Creating too many microservices too early',
      'Tight coupling between services',
      'Shared databases across services',
      'Not handling distributed transactions properly',
      'Missing service discovery',
    ],
    examples: [
      'Netflix: 700+ microservices architecture',
      'Amazon: Thousands of microservices',
      'Uber: Service mesh for rides',
    ],
  },
};

// "Did You Know?" facts
export const didYouKnowFacts: DidYouKnowFact[] = [
  {
    id: 'netflix-streaming',
    fact: 'Netflix serves over 250 million hours of content daily using a microservices architecture with 700+ services.',
    source: 'Netflix Tech Blog',
  },
  {
    id: 'instagram-scale',
    fact: 'Instagram scaled to 1 million users with just 3 engineers using PostgreSQL and Redis.',
    source: 'Instagram Engineering',
  },
  {
    id: 'cap-theorem',
    fact: 'The CAP theorem states you can only have 2 of: Consistency, Availability, Partition tolerance in distributed systems.',
    learnMoreUrl: 'https://en.wikipedia.org/wiki/CAP_theorem',
  },
  {
    id: 'load-balancer-performance',
    fact: 'Load balancers can reduce response time by 40% through intelligent request routing and connection pooling.',
  },
  {
    id: 'twitter-cache',
    fact: 'Twitter\'s timeline service caches millions of timelines in Redis to serve billions of requests per day.',
    source: 'Twitter Engineering',
  },
  {
    id: 'whatsapp-erlang',
    fact: 'WhatsApp handles 50 billion messages per day with just 50 engineers using Erlang for concurrency.',
  },
  {
    id: 'amazon-soa',
    fact: 'Amazon adopted Service-Oriented Architecture (SOA) in 2002, which evolved into microservices, powering AWS today.',
  },
  {
    id: 'discord-scale',
    fact: 'Discord handles 4 million concurrent voice users using Elixir and a custom real-time infrastructure.',
  },
  {
    id: 'uber-microservices',
    fact: 'Uber started as a monolith and migrated to 2,200+ microservices to scale globally.',
  },
  {
    id: 'google-spanner',
    fact: 'Google Spanner provides global strong consistency using atomic clocks and GPS for time synchronization.',
  },
];

// Helper functions
export function getComponentEducation(type: string): ComponentEducation | null {
  return componentEducationRegistry[type] || null;
}

export function getRandomDidYouKnowFact(): DidYouKnowFact {
  const randomIndex = Math.floor(Math.random() * didYouKnowFacts.length);
  return didYouKnowFacts[randomIndex];
}

export function getRelatedTips(componentType: string): EducationalTip[] {
  // This would be expanded with actual tips
  return [];
}

export function searchEducationalContent(query: string): EducationalTip[] {
  // This would implement actual search logic
  return [];
}
