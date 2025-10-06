import type { DesignComponent } from '@/shared/contracts';

export interface PaletteComponentMeta {
  type: DesignComponent['type'];
  label: string;
  category: string;
  description: string;
}

export const componentLibrary: PaletteComponentMeta[] = [
  {
    type: 'server',
    label: 'Server',
    category: 'compute',
    description: 'Physical or virtual server instance',
  },
  {
    type: 'microservice',
    label: 'Microservice',
    category: 'compute',
    description: 'Independent deployable service',
  },
  {
    type: 'serverless',
    label: 'Serverless',
    category: 'compute',
    description: 'Function-as-a-Service execution',
  },
  {
    type: 'lambda',
    label: 'AWS Lambda',
    category: 'compute',
    description: 'AWS serverless compute',
  },
  {
    type: 'cloud-function',
    label: 'Cloud Function',
    category: 'compute',
    description: 'Google/Azure serverless function',
  },
  {
    type: 'ec2',
    label: 'AWS EC2',
    category: 'compute',
    description: 'Amazon Elastic Compute Cloud',
  },
  {
    type: 'gce',
    label: 'Google Compute Engine',
    category: 'compute',
    description: 'Google Cloud virtual machines',
  },
  {
    type: 'azure-vm',
    label: 'Azure VM',
    category: 'compute',
    description: 'Azure Virtual Machines',
  },
  {
    type: 'auto-scaling',
    label: 'Auto Scaling',
    category: 'compute',
    description: 'Dynamic instance scaling',
  },
  {
    type: 'container',
    label: 'Container',
    category: 'containers',
    description: 'Containerized application',
  },
  {
    type: 'docker',
    label: 'Docker',
    category: 'containers',
    description: 'Docker container runtime',
  },
  {
    type: 'kubernetes',
    label: 'Kubernetes',
    category: 'containers',
    description: 'Container orchestration platform',
  },
  {
    type: 'database',
    label: 'Database',
    category: 'storage',
    description: 'General database system',
  },
  {
    type: 'postgresql',
    label: 'PostgreSQL',
    category: 'storage',
    description: 'PostgreSQL relational database',
  },
  {
    type: 'mysql',
    label: 'MySQL',
    category: 'storage',
    description: 'MySQL relational database',
  },
  {
    type: 'mongodb',
    label: 'MongoDB',
    category: 'storage',
    description: 'MongoDB document database',
  },
  {
    type: 'redis',
    label: 'Redis',
    category: 'storage',
    description: 'In-memory data structure store',
  },
  {
    type: 'cache',
    label: 'Cache',
    category: 'storage',
    description: 'Caching layer',
  },
  {
    type: 'storage',
    label: 'Storage',
    category: 'storage',
    description: 'Generic storage system',
  },
  {
    type: 's3',
    label: 'AWS S3',
    category: 'storage',
    description: 'AWS object storage',
  },
  {
    type: 'blob-storage',
    label: 'Blob Storage',
    category: 'storage',
    description: 'Azure blob storage',
  },
  {
    type: 'file-system',
    label: 'File System',
    category: 'storage',
    description: 'File system storage',
  },
  {
    type: 'dynamodb',
    label: 'DynamoDB',
    category: 'storage',
    description: 'AWS NoSQL database',
  },
  {
    type: 'cassandra',
    label: 'Cassandra',
    category: 'storage',
    description: 'Wide-column database',
  },
  {
    type: 'influxdb',
    label: 'InfluxDB',
    category: 'storage',
    description: 'Time-series database',
  },
  {
    type: 'neo4j',
    label: 'Neo4j',
    category: 'storage',
    description: 'Graph database',
  },
  {
    type: 'load-balancer',
    label: 'Load Balancer',
    category: 'networking',
    description: 'Traffic distribution system',
  },
  {
    type: 'api-gateway',
    label: 'API Gateway',
    category: 'networking',
    description: 'API request routing and management',
  },
  {
    type: 'cdn',
    label: 'CDN',
    category: 'networking',
    description: 'Content delivery network',
  },
  {
    type: 'firewall',
    label: 'Firewall',
    category: 'networking',
    description: 'Network security barrier',
  },
  {
    type: 'message-queue',
    label: 'Message Queue',
    category: 'messaging',
    description: 'Asynchronous message broker',
  },
  {
    type: 'producer',
    label: 'Producer',
    category: 'messaging',
    description: 'Component that sends messages to queues',
  },
  {
    type: 'consumer',
    label: 'Consumer',
    category: 'messaging',
    description: 'Component that processes messages from queues',
  },
  {
    type: 'broker',
    label: 'Broker',
    category: 'messaging',
    description: 'Middleware that manages queues',
  },
  {
    type: 'dead-letter-queue',
    label: 'Dead Letter Queue',
    category: 'messaging',
    description: 'Queue for failed/unprocessable messages',
  },
  {
    type: 'websocket',
    label: 'WebSocket',
    category: 'messaging',
    description: 'Real-time bidirectional communication',
  },
  {
    type: 'grpc',
    label: 'gRPC',
    category: 'messaging',
    description: 'High-performance RPC framework',
  },
  {
    type: 'ci-cd',
    label: 'CI/CD Pipeline',
    category: 'devops',
    description: 'Continuous Integration/Deployment',
  },
  {
    type: 'docker-registry',
    label: 'Docker Registry',
    category: 'devops',
    description: 'Container image registry',
  },
  {
    type: 'terraform',
    label: 'Terraform',
    category: 'devops',
    description: 'Infrastructure as Code',
  },
  {
    type: 'ansible',
    label: 'Ansible',
    category: 'devops',
    description: 'Configuration management',
  },
  {
    type: 'service-registry',
    label: 'Service Registry',
    category: 'devops',
    description: 'Service discovery registry',
  },
  {
    type: 'rest-api',
    label: 'REST API',
    category: 'apis',
    description: 'RESTful web service',
  },
  {
    type: 'graphql',
    label: 'GraphQL',
    category: 'apis',
    description: 'GraphQL query language API',
  },
  {
    type: 'webhook',
    label: 'Webhook',
    category: 'apis',
    description: 'HTTP callback mechanism',
  },
  {
    type: 'client',
    label: 'Client',
    category: 'clients',
    description: 'Generic client application',
  },
  {
    type: 'web-app',
    label: 'Web App',
    category: 'clients',
    description: 'Web application',
  },
  {
    type: 'mobile-app',
    label: 'Mobile App',
    category: 'clients',
    description: 'Mobile application',
  },
  {
    type: 'desktop-app',
    label: 'Desktop App',
    category: 'clients',
    description: 'Desktop application',
  },
  {
    type: 'iot-device',
    label: 'IoT Device',
    category: 'clients',
    description: 'Internet of Things device',
  },
  {
    type: 'security',
    label: 'Security',
    category: 'security',
    description: 'Security service',
  },
  {
    type: 'authentication',
    label: 'Authentication',
    category: 'security',
    description: 'User authentication service',
  },
  {
    type: 'authorization',
    label: 'Authorization',
    category: 'security',
    description: 'Access control service',
  },
  {
    type: 'oauth',
    label: 'OAuth',
    category: 'security',
    description: 'OAuth authorization framework',
  },
  {
    type: 'jwt',
    label: 'JWT',
    category: 'security',
    description: 'JSON Web Token system',
  },
  {
    type: 'sso',
    label: 'SSO',
    category: 'security',
    description: 'Single Sign-On',
  },
  {
    type: 'secret-manager',
    label: 'Secret Manager',
    category: 'security',
    description: 'Secrets management service',
  },
  {
    type: 'certificate-manager',
    label: 'Certificate Manager',
    category: 'security',
    description: 'SSL/TLS certificate management',
  },
  {
    type: 'identity-provider',
    label: 'Identity Provider',
    category: 'security',
    description: 'Identity management system',
  },
  {
    type: 'monitoring',
    label: 'Monitoring',
    category: 'observability',
    description: 'System monitoring service',
  },
  {
    type: 'logging',
    label: 'Logging',
    category: 'observability',
    description: 'Log aggregation system',
  },
  {
    type: 'metrics',
    label: 'Metrics',
    category: 'observability',
    description: 'Metrics collection and analysis',
  },
  {
    type: 'alerting',
    label: 'Alerting',
    category: 'observability',
    description: 'Alert and notification system',
  },
  {
    type: 'elasticsearch',
    label: 'Elasticsearch',
    category: 'observability',
    description: 'Search and analytics engine',
  },
  {
    type: 'kibana',
    label: 'Kibana',
    category: 'observability',
    description: 'Data visualization platform',
  },
  {
    type: 'data-warehouse',
    label: 'Data Warehouse',
    category: 'data',
    description: 'Centralized data repository',
  },
  {
    type: 'data-lake',
    label: 'Data Lake',
    category: 'data',
    description: 'Raw data storage system',
  },
  {
    type: 'etl',
    label: 'ETL',
    category: 'data',
    description: 'Extract, Transform, Load pipeline',
  },
  {
    type: 'stream-processing',
    label: 'Stream Processing',
    category: 'data',
    description: 'Real-time data processing',
  },
  {
    type: 'apache-spark',
    label: 'Apache Spark',
    category: 'data',
    description: 'Big data processing engine',
  },
  {
    type: 'hadoop',
    label: 'Apache Hadoop',
    category: 'data',
    description: 'Distributed storage and processing',
  },
  {
    type: 'snowflake',
    label: 'Snowflake',
    category: 'data',
    description: 'Cloud data warehouse',
  },
  {
    type: 'airflow',
    label: 'Apache Airflow',
    category: 'data',
    description: 'Workflow orchestration',
  },
  {
    type: 'event-sourcing',
    label: 'Event Sourcing',
    category: 'patterns',
    description: 'Event-driven architecture pattern',
  },
  {
    type: 'cqrs',
    label: 'CQRS',
    category: 'patterns',
    description: 'Command Query Responsibility Segregation',
  },
  {
    type: 'edge-computing',
    label: 'Edge Computing',
    category: 'patterns',
    description: 'Distributed computing at network edge',
  },
  {
    type: 'blockchain',
    label: 'Blockchain',
    category: 'emerging',
    description: 'Distributed ledger technology',
  },
  {
    type: 'ai-ml',
    label: 'AI/ML',
    category: 'emerging',
    description: 'Artificial Intelligence/Machine Learning',
  }
];

export const paletteCategories = [
  { id: 'compute', label: 'Compute' },
  { id: 'containers', label: 'Containers' },
  { id: 'storage', label: 'Storage' },
  { id: 'networking', label: 'Networking' },
  { id: 'messaging', label: 'Messaging' },
  { id: 'devops', label: 'DevOps' },
  { id: 'apis', label: 'APIs' },
  { id: 'clients', label: 'Clients' },
  { id: 'security', label: 'Security' },
  { id: 'observability', label: 'Observability' },
  { id: 'data', label: 'Data' },
  { id: 'patterns', label: 'Patterns' },
  { id: 'emerging', label: 'Emerging' }
];

export const paletteTagMap: Record<string, DesignComponent['type'][]> = {
  // Data + Databases
  database: ["database", "postgresql", "mysql", "mongodb"],
  databases: ["database", "postgresql", "mysql", "mongodb"],
  db: ["database", "postgresql", "mysql", "mongodb"],
  sql: ["postgresql", "mysql"],
  nosql: ["mongodb", "redis"],
  redis: ["redis"],

  // Caching
  cache: ["cache", "redis"],
  caching: ["cache", "redis"],

  // Messaging
  messaging: [
    "message-queue",
    "producer",
    "consumer",
    "broker",
    "dead-letter-queue",
  ],
  queue: [
    "message-queue",
    "producer",
    "consumer",
    "broker",
    "dead-letter-queue",
  ],
  pubsub: [
    "message-queue",
    "producer",
    "consumer",
    "broker",
    "dead-letter-queue",
  ],
  kafka: [
    "message-queue",
    "producer",
    "consumer",
    "broker",
    "dead-letter-queue",
  ],
  rabbitmq: [
    "message-queue",
    "producer",
    "consumer",
    "broker",
    "dead-letter-queue",
  ],

  // Realtime
  realtime: ["websocket", "grpc"],
  "real-time": ["websocket", "grpc"],
  websocket: ["websocket"],
  grpc: ["grpc"],

  // APIs
  api: ["rest-api", "api-gateway", "graphql", "webhook"],
  apis: ["rest-api", "api-gateway", "graphql", "webhook"],
  rest: ["rest-api"],
  graphql: ["graphql"],
  webhook: ["webhook"],
  gateway: ["api-gateway"],

  // Networking
  cdn: ["cdn"],
  "load balancer": ["load-balancer"],
  "load-balancer": ["load-balancer"],
  loadbalancer: ["load-balancer"],

  // Security/Auth
  security: [
    "security",
    "firewall",
    "authentication",
    "authorization",
    "oauth",
    "jwt",
  ],
  auth: ["authentication", "authorization", "oauth", "jwt"],
  authentication: ["authentication"],
  authorization: ["authorization"],
  oauth: ["oauth"],
  jwt: ["jwt"],
  firewall: ["firewall"],

  // Observability/Analytics
  observability: [
    "monitoring",
    "logging",
    "metrics",
    "alerting",
    "elasticsearch",
    "kibana",
  ],
  monitoring: ["monitoring", "logging", "metrics", "alerting"],
  logging: ["logging"],
  metrics: ["metrics"],
  alerting: ["alerting"],
  search: ["elasticsearch"],
  analytics: [
    "elasticsearch",
    "kibana",
    "data-warehouse",
    "data-lake",
    "etl",
    "stream-processing",
  ],

  // Data processing
  etl: ["etl"],
  "data lake": ["data-lake"],
  datalake: ["data-lake"],
  "data warehouse": ["data-warehouse"],
  warehouse: ["data-warehouse"],
  streaming: ["stream-processing", "cdn"],

  // Storage
  storage: ["storage", "s3", "blob-storage", "file-system"],
  s3: ["s3"],
  blob: ["blob-storage"],
  "blob storage": ["blob-storage"],
  filesystem: ["file-system"],
  "file system": ["file-system"],

  // Compute & containers
  compute: ["server", "microservice", "serverless", "lambda", "cloud-function"],
  server: ["server"],
  microservice: ["microservice"],
  serverless: ["serverless", "lambda", "cloud-function"],
  lambda: ["lambda"],
  "cloud function": ["cloud-function"],
  container: ["container", "docker", "kubernetes"],
  containers: ["container", "docker", "kubernetes"],
  docker: ["docker"],
  kubernetes: ["kubernetes"],

  // Edge and emerging
  edge: ["edge-computing", "cdn"],
  "edge computing": ["edge-computing"],
  blockchain: ["blockchain"],
  ai: ["ai-ml"],
  ml: ["ai-ml"],
  "ai/ml": ["ai-ml"],

  // Clients
  client: ["client", "web-app", "mobile-app", "desktop-app", "iot-device"],
  web: ["web-app", "rest-api", "api-gateway", "graphql"],
  mobile: ["mobile-app"],
  desktop: ["desktop-app"],
  iot: ["iot-device"],
};
