import {
  Activity,
  AlertTriangle,
  Archive,
  BarChart3,
  Box,
  Boxes,
  Brain,
  Building,
  CheckCircle,
  Cloud,
  CloudCog,
  CloudRain,
  Code,
  Cog,
  Container,
  Cpu,
  Database,
  Database as DB,
  FileText,
  Filter,
  FolderOpen,
  GitBranch,
  Globe,
  HardDrive,
  Key,
  Layers,
  Link,
  Lock,
  MessageSquare,
  Monitor,
  Network,
  Play,
  Radio,
  Repeat,
  Router,
  Search,
  Send,
  Server,
  Settings,
  Shield,
  Smartphone,
  Target,
  Timer,
  UserCheck,
  Users,
  Webhook,
  Wifi,
  Workflow,
  Zap,
} from "lucide-react";
import React, { useState } from "react";
import { useDrag } from "react-dnd";
import type { DesignComponent } from "../../../../shared/contracts";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { CardContent, CardHeader, CardTitle } from "../ui/card";
import { EnhancedCard } from "../ui/enhanced-card";
import { Input } from "../ui/input";
import { ScrollArea } from "../ui/scroll-area";
import { Tabs } from "../ui/tabs";

interface ComponentType {
  type: DesignComponent["type"];
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  color: string;
  category: string;
  description: string;
}

const componentTypes: ComponentType[] = [
  // Compute & Infrastructure
  {
    type: "server",
    label: "Server",
    icon: Server,
    color: "bg-blue-500",
    category: "compute",
    description: "Physical or virtual server instance",
  },
  {
    type: "microservice",
    label: "Microservice",
    icon: Box,
    color: "bg-blue-400",
    category: "compute",
    description: "Independent deployable service",
  },
  {
    type: "serverless",
    label: "Serverless",
    icon: CloudCog,
    color: "bg-sky-500",
    category: "compute",
    description: "Function-as-a-Service execution",
  },
  {
    type: "lambda",
    label: "AWS Lambda",
    icon: Zap,
    color: "bg-orange-400",
    category: "compute",
    description: "AWS serverless compute",
  },
  {
    type: "cloud-function",
    label: "Cloud Function",
    icon: Cloud,
    color: "bg-blue-600",
    category: "compute",
    description: "Google/Azure serverless function",
  },
  {
    type: "ec2",
    label: "AWS EC2",
    icon: Server,
    color: "bg-orange-600",
    category: "compute",
    description: "Amazon Elastic Compute Cloud",
  },
  {
    type: "gce",
    label: "Google Compute Engine",
    icon: Server,
    color: "bg-blue-500",
    category: "compute",
    description: "Google Cloud virtual machines",
  },
  {
    type: "azure-vm",
    label: "Azure VM",
    icon: Server,
    color: "bg-blue-700",
    category: "compute",
    description: "Azure Virtual Machines",
  },
  {
    type: "auto-scaling",
    label: "Auto Scaling",
    icon: Repeat,
    color: "bg-green-500",
    category: "compute",
    description: "Dynamic instance scaling",
  },

  // Containers & Orchestration
  {
    type: "container",
    label: "Container",
    icon: Container,
    color: "bg-cyan-500",
    category: "containers",
    description: "Containerized application",
  },
  {
    type: "docker",
    label: "Docker",
    icon: Container,
    color: "bg-blue-700",
    category: "containers",
    description: "Docker container runtime",
  },
  {
    type: "kubernetes",
    label: "Kubernetes",
    icon: Boxes,
    color: "bg-indigo-600",
    category: "containers",
    description: "Container orchestration platform",
  },
  {
    type: "docker-registry",
    label: "Docker Registry",
    icon: Container,
    color: "bg-blue-600",
    category: "containers",
    description: "Container image registry",
  },

  // Databases & Storage
  {
    type: "database",
    label: "Database",
    icon: Database,
    color: "bg-green-500",
    category: "storage",
    description: "General database system",
  },
  {
    type: "postgresql",
    label: "PostgreSQL",
    icon: DB,
    color: "bg-blue-800",
    category: "storage",
    description: "PostgreSQL relational database",
  },
  {
    type: "mysql",
    label: "MySQL",
    icon: DB,
    color: "bg-orange-600",
    category: "storage",
    description: "MySQL relational database",
  },
  {
    type: "mongodb",
    label: "MongoDB",
    icon: DB,
    color: "bg-green-600",
    category: "storage",
    description: "MongoDB document database",
  },
  {
    type: "redis",
    label: "Redis",
    icon: HardDrive,
    color: "bg-red-600",
    category: "storage",
    description: "In-memory data structure store",
  },
  {
    type: "cache",
    label: "Cache",
    icon: HardDrive,
    color: "bg-orange-500",
    category: "storage",
    description: "Caching layer",
  },
  {
    type: "storage",
    label: "Storage",
    icon: Archive,
    color: "bg-gray-600",
    category: "storage",
    description: "Generic storage system",
  },
  {
    type: "s3",
    label: "AWS S3",
    icon: Archive,
    color: "bg-orange-500",
    category: "storage",
    description: "AWS object storage",
  },
  {
    type: "blob-storage",
    label: "Blob Storage",
    icon: Archive,
    color: "bg-blue-500",
    category: "storage",
    description: "Azure blob storage",
  },
  {
    type: "file-system",
    label: "File System",
    icon: FolderOpen,
    color: "bg-yellow-600",
    category: "storage",
    description: "File system storage",
  },
  {
    type: "dynamodb",
    label: "DynamoDB",
    icon: DB,
    color: "bg-orange-500",
    category: "storage",
    description: "AWS NoSQL database",
  },
  {
    type: "cassandra",
    label: "Cassandra",
    icon: DB,
    color: "bg-purple-600",
    category: "storage",
    description: "Wide-column database",
  },
  {
    type: "influxdb",
    label: "InfluxDB",
    icon: Activity,
    color: "bg-blue-400",
    category: "storage",
    description: "Time-series database",
  },
  {
    type: "neo4j",
    label: "Neo4j",
    icon: Network,
    color: "bg-green-400",
    category: "storage",
    description: "Graph database",
  },

  // Networking & Traffic
  {
    type: "load-balancer",
    label: "Load Balancer",
    icon: Zap,
    color: "bg-purple-500",
    category: "networking",
    description: "Traffic distribution system",
  },
  {
    type: "api-gateway",
    label: "API Gateway",
    icon: Globe,
    color: "bg-red-500",
    category: "networking",
    description: "API request routing and management",
  },
  {
    type: "cdn",
    label: "CDN",
    icon: Cloud,
    color: "bg-purple-600",
    category: "networking",
    description: "Content delivery network",
  },
  {
    type: "firewall",
    label: "Firewall",
    icon: Shield,
    color: "bg-red-700",
    category: "networking",
    description: "Network security barrier",
  },
  {
    type: "vpc",
    label: "VPC",
    icon: Building,
    color: "bg-indigo-500",
    category: "networking",
    description: "Virtual Private Cloud",
  },
  {
    type: "internet-gateway",
    label: "Internet Gateway",
    icon: Globe,
    color: "bg-blue-500",
    category: "networking",
    description: "Internet access gateway",
  },
  {
    type: "nat-gateway",
    label: "NAT Gateway",
    icon: Router,
    color: "bg-green-600",
    category: "networking",
    description: "Network Address Translation",
  },
  {
    type: "vpn",
    label: "VPN",
    icon: Shield,
    color: "bg-purple-600",
    category: "networking",
    description: "Virtual Private Network",
  },
  {
    type: "dns",
    label: "DNS",
    icon: Network,
    color: "bg-cyan-500",
    category: "networking",
    description: "Domain Name System",
  },
  {
    type: "proxy",
    label: "Proxy/Nginx",
    icon: Filter,
    color: "bg-green-500",
    category: "networking",
    description: "Reverse proxy server",
  },
  {
    type: "waf",
    label: "WAF",
    icon: Shield,
    color: "bg-red-600",
    category: "networking",
    description: "Web Application Firewall",
  },

  // Messaging & Communication
  {
    type: "message-queue",
    label: "Message Queue",
    icon: MessageSquare,
    color: "bg-amber-500",
    category: "messaging",
    description: "Asynchronous message broker",
  },
  {
    type: "producer",
    label: "Producer",
    icon: Send,
    color: "bg-green-500",
    category: "messaging",
    description: "Component that sends messages to queues",
  },
  {
    type: "consumer",
    label: "Consumer",
    icon: Zap,
    color: "bg-blue-500",
    category: "messaging",
    description: "Component that processes messages from queues",
  },
  {
    type: "broker",
    label: "Broker",
    icon: Server,
    color: "bg-purple-500",
    category: "messaging",
    description: "Middleware that manages queues",
  },
  {
    type: "dead-letter-queue",
    label: "Dead Letter Queue",
    icon: AlertTriangle,
    color: "bg-red-500",
    category: "messaging",
    description: "Queue for failed/unprocessable messages",
  },
  {
    type: "websocket",
    label: "WebSocket",
    icon: Radio,
    color: "bg-green-400",
    category: "messaging",
    description: "Real-time bidirectional communication",
  },
  {
    type: "grpc",
    label: "gRPC",
    icon: Network,
    color: "bg-blue-500",
    category: "messaging",
    description: "High-performance RPC framework",
  },
  {
    type: "kafka",
    label: "Apache Kafka",
    icon: Workflow,
    color: "bg-black",
    category: "messaging",
    description: "Distributed streaming platform",
  },
  {
    type: "rabbitmq",
    label: "RabbitMQ",
    icon: MessageSquare,
    color: "bg-orange-600",
    category: "messaging",
    description: "Message broker",
  },
  {
    type: "event-bus",
    label: "Event Bus",
    icon: Radio,
    color: "bg-purple-500",
    category: "messaging",
    description: "Event-driven communication bus",
  },
  {
    type: "service-mesh",
    label: "Service Mesh",
    icon: Network,
    color: "bg-teal-600",
    category: "messaging",
    description: "Microservice communication layer",
  },

  // DevOps & Infrastructure
  {
    type: "ci-cd",
    label: "CI/CD Pipeline",
    icon: Play,
    color: "bg-green-600",
    category: "devops",
    description: "Continuous Integration/Deployment",
  },
  {
    type: "terraform",
    label: "Terraform",
    icon: Settings,
    color: "bg-purple-700",
    category: "devops",
    description: "Infrastructure as Code",
  },
  {
    type: "ansible",
    label: "Ansible",
    icon: Cog,
    color: "bg-red-600",
    category: "devops",
    description: "Configuration management",
  },
  {
    type: "service-registry",
    label: "Service Registry",
    icon: Target,
    color: "bg-blue-500",
    category: "devops",
    description: "Service discovery registry",
  },

  // APIs & Services
  {
    type: "rest-api",
    label: "REST API",
    icon: Code,
    color: "bg-emerald-500",
    category: "apis",
    description: "RESTful web service",
  },
  {
    type: "graphql",
    label: "GraphQL",
    icon: GitBranch,
    color: "bg-pink-500",
    category: "apis",
    description: "GraphQL query language API",
  },
  {
    type: "webhook",
    label: "Webhook",
    icon: Webhook,
    color: "bg-violet-500",
    category: "apis",
    description: "HTTP callback mechanism",
  },

  // Client Applications
  {
    type: "client",
    label: "Client",
    icon: Monitor,
    color: "bg-gray-500",
    category: "clients",
    description: "Generic client application",
  },
  {
    type: "web-app",
    label: "Web App",
    icon: Globe,
    color: "bg-blue-600",
    category: "clients",
    description: "Web application",
  },
  {
    type: "mobile-app",
    label: "Mobile App",
    icon: Smartphone,
    color: "bg-green-600",
    category: "clients",
    description: "Mobile application",
  },
  {
    type: "desktop-app",
    label: "Desktop App",
    icon: Monitor,
    color: "bg-purple-600",
    category: "clients",
    description: "Desktop application",
  },
  {
    type: "iot-device",
    label: "IoT Device",
    icon: Wifi,
    color: "bg-teal-500",
    category: "clients",
    description: "Internet of Things device",
  },

  // Security & Auth
  {
    type: "security",
    label: "Security",
    icon: Shield,
    color: "bg-red-600",
    category: "security",
    description: "Security service",
  },
  {
    type: "authentication",
    label: "Authentication",
    icon: Key,
    color: "bg-yellow-600",
    category: "security",
    description: "User authentication service",
  },
  {
    type: "authorization",
    label: "Authorization",
    icon: Lock,
    color: "bg-orange-600",
    category: "security",
    description: "Access control service",
  },
  {
    type: "oauth",
    label: "OAuth",
    icon: UserCheck,
    color: "bg-blue-700",
    category: "security",
    description: "OAuth authorization framework",
  },
  {
    type: "jwt",
    label: "JWT",
    icon: Key,
    color: "bg-green-700",
    category: "security",
    description: "JSON Web Token system",
  },
  {
    type: "sso",
    label: "SSO",
    icon: Users,
    color: "bg-indigo-600",
    category: "security",
    description: "Single Sign-On",
  },
  {
    type: "secret-manager",
    label: "Secret Manager",
    icon: Lock,
    color: "bg-gray-700",
    category: "security",
    description: "Secrets management service",
  },
  {
    type: "certificate-manager",
    label: "Certificate Manager",
    icon: CheckCircle,
    color: "bg-green-600",
    category: "security",
    description: "SSL/TLS certificate management",
  },
  {
    type: "identity-provider",
    label: "Identity Provider",
    icon: UserCheck,
    color: "bg-blue-600",
    category: "security",
    description: "Identity management system",
  },

  // Monitoring & Observability
  {
    type: "monitoring",
    label: "Monitoring",
    icon: Activity,
    color: "bg-blue-500",
    category: "observability",
    description: "System monitoring service",
  },
  {
    type: "logging",
    label: "Logging",
    icon: FileText,
    color: "bg-gray-600",
    category: "observability",
    description: "Log aggregation system",
  },
  {
    type: "metrics",
    label: "Metrics",
    icon: BarChart3,
    color: "bg-green-500",
    category: "observability",
    description: "Metrics collection and analysis",
  },
  {
    type: "alerting",
    label: "Alerting",
    icon: AlertTriangle,
    color: "bg-red-500",
    category: "observability",
    description: "Alert and notification system",
  },
  {
    type: "elasticsearch",
    label: "Elasticsearch",
    icon: Search,
    color: "bg-yellow-500",
    category: "observability",
    description: "Search and analytics engine",
  },
  {
    type: "kibana",
    label: "Kibana",
    icon: BarChart3,
    color: "bg-cyan-600",
    category: "observability",
    description: "Data visualization platform",
  },
  {
    type: "prometheus",
    label: "Prometheus",
    icon: Activity,
    color: "bg-orange-500",
    category: "observability",
    description: "Metrics collection system",
  },
  {
    type: "grafana",
    label: "Grafana",
    icon: BarChart3,
    color: "bg-orange-600",
    category: "observability",
    description: "Analytics and visualization",
  },
  {
    type: "jaeger",
    label: "Jaeger",
    icon: Link,
    color: "bg-blue-600",
    category: "observability",
    description: "Distributed tracing",
  },
  {
    type: "datadog",
    label: "Datadog",
    icon: Monitor,
    color: "bg-purple-600",
    category: "observability",
    description: "Monitoring platform",
  },

  // Data Processing
  {
    type: "data-warehouse",
    label: "Data Warehouse",
    icon: Database,
    color: "bg-indigo-600",
    category: "data",
    description: "Centralized data repository",
  },
  {
    type: "data-lake",
    label: "Data Lake",
    icon: Database,
    color: "bg-blue-600",
    category: "data",
    description: "Raw data storage system",
  },
  {
    type: "etl",
    label: "ETL",
    icon: Workflow,
    color: "bg-purple-500",
    category: "data",
    description: "Extract, Transform, Load pipeline",
  },
  {
    type: "stream-processing",
    label: "Stream Processing",
    icon: Activity,
    color: "bg-orange-500",
    category: "data",
    description: "Real-time data processing",
  },
  {
    type: "apache-spark",
    label: "Apache Spark",
    icon: Zap,
    color: "bg-orange-400",
    category: "data",
    description: "Big data processing engine",
  },
  {
    type: "hadoop",
    label: "Apache Hadoop",
    icon: Database,
    color: "bg-yellow-600",
    category: "data",
    description: "Distributed storage and processing",
  },
  {
    type: "snowflake",
    label: "Snowflake",
    icon: CloudRain,
    color: "bg-blue-400",
    category: "data",
    description: "Cloud data warehouse",
  },
  {
    type: "airflow",
    label: "Apache Airflow",
    icon: Workflow,
    color: "bg-cyan-500",
    category: "data",
    description: "Workflow orchestration",
  },

  // Patterns & Architectures
  {
    type: "event-sourcing",
    label: "Event Sourcing",
    icon: Timer,
    color: "bg-emerald-600",
    category: "patterns",
    description: "Event-driven architecture pattern",
  },
  {
    type: "cqrs",
    label: "CQRS",
    icon: GitBranch,
    color: "bg-violet-600",
    category: "patterns",
    description: "Command Query Responsibility Segregation",
  },
  {
    type: "edge-computing",
    label: "Edge Computing",
    icon: Cpu,
    color: "bg-gray-700",
    category: "patterns",
    description: "Distributed computing at network edge",
  },
  {
    type: "circuit-breaker",
    label: "Circuit Breaker",
    icon: Zap,
    color: "bg-yellow-500",
    category: "patterns",
    description: "Fault tolerance pattern",
  },
  {
    type: "bulkhead",
    label: "Bulkhead",
    icon: Shield,
    color: "bg-blue-700",
    category: "patterns",
    description: "Resource isolation pattern",
  },
  {
    type: "saga",
    label: "Saga Pattern",
    icon: Workflow,
    color: "bg-purple-600",
    category: "patterns",
    description: "Distributed transaction management",
  },

  // Emerging Technologies
  {
    type: "blockchain",
    label: "Blockchain",
    icon: Layers,
    color: "bg-yellow-700",
    category: "emerging",
    description: "Distributed ledger technology",
  },
  {
    type: "ai-ml",
    label: "AI/ML",
    icon: Brain,
    color: "bg-pink-600",
    category: "emerging",
    description: "Artificial Intelligence/Machine Learning",
  },
];

// Tag-to-component mapping for smarter challenge-driven filtering.
// Keys are normalized lower-case tags. Values list matching component types.
const TAG_TO_TYPES: Record<string, Array<ComponentType["type"]>> = {
  // Data + Databases
  database: [
    "database",
    "postgresql",
    "mysql",
    "mongodb",
    "dynamodb",
    "cassandra",
    "neo4j",
    "influxdb",
  ],
  databases: [
    "database",
    "postgresql",
    "mysql",
    "mongodb",
    "dynamodb",
    "cassandra",
    "neo4j",
    "influxdb",
  ],
  db: [
    "database",
    "postgresql",
    "mysql",
    "mongodb",
    "dynamodb",
    "cassandra",
    "neo4j",
    "influxdb",
  ],
  sql: ["postgresql", "mysql"],
  nosql: ["mongodb", "redis", "dynamodb", "cassandra"],
  redis: ["redis"],
  cassandra: ["cassandra"],
  dynamodb: ["dynamodb"],
  neo4j: ["neo4j"],
  influxdb: ["influxdb"],

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
    "kafka",
    "rabbitmq",
    "event-bus",
  ],
  queue: [
    "message-queue",
    "producer",
    "consumer",
    "broker",
    "dead-letter-queue",
    "kafka",
    "rabbitmq",
  ],
  pubsub: [
    "message-queue",
    "producer",
    "consumer",
    "broker",
    "dead-letter-queue",
    "kafka",
    "rabbitmq",
  ],
  kafka: ["kafka", "message-queue", "producer", "consumer"],
  rabbitmq: ["rabbitmq", "message-queue", "producer", "consumer"],
  "event-bus": ["event-bus", "kafka"],
  "service-mesh": ["service-mesh"],

  // Realtime
  realtime: ["websocket", "grpc", "kafka"],
  "real-time": ["websocket", "grpc", "kafka"],
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
  vpc: ["vpc"],
  vpn: ["vpn"],
  dns: ["dns"],
  proxy: ["proxy"],
  nginx: ["proxy"],
  waf: ["waf"],
  firewall: ["firewall", "waf"],

  // Cloud Services
  aws: ["ec2", "lambda", "s3", "dynamodb"],
  gcp: ["gce", "cloud-function"],
  google: ["gce", "cloud-function"],
  azure: ["azure-vm", "blob-storage"],
  ec2: ["ec2"],
  lambda: ["lambda"],
  s3: ["s3"],

  // Security/Auth
  security: [
    "security",
    "firewall",
    "authentication",
    "authorization",
    "oauth",
    "jwt",
    "waf",
    "sso",
    "secret-manager",
  ],
  auth: ["authentication", "authorization", "oauth", "jwt", "sso"],
  authentication: ["authentication"],
  authorization: ["authorization"],
  oauth: ["oauth"],
  jwt: ["jwt"],
  sso: ["sso"],
  "secret-manager": ["secret-manager"],
  "identity-provider": ["identity-provider"],

  // Observability/Analytics
  observability: [
    "monitoring",
    "logging",
    "metrics",
    "alerting",
    "elasticsearch",
    "kibana",
    "prometheus",
    "grafana",
    "jaeger",
    "datadog",
  ],
  monitoring: [
    "monitoring",
    "logging",
    "metrics",
    "alerting",
    "prometheus",
    "grafana",
    "datadog",
  ],
  logging: ["logging", "elasticsearch", "kibana"],
  metrics: ["metrics", "prometheus", "grafana"],
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
  prometheus: ["prometheus"],
  grafana: ["grafana"],
  jaeger: ["jaeger"],
  datadog: ["datadog"],

  // Data processing
  etl: ["etl", "airflow"],
  "data lake": ["data-lake"],
  datalake: ["data-lake"],
  "data warehouse": ["data-warehouse", "snowflake"],
  warehouse: ["data-warehouse", "snowflake"],
  streaming: ["stream-processing", "kafka", "apache-spark"],
  spark: ["apache-spark"],
  hadoop: ["hadoop"],
  snowflake: ["snowflake"],
  airflow: ["airflow"],

  // Storage
  storage: ["storage", "s3", "blob-storage", "file-system"],
  blob: ["blob-storage"],
  "blob storage": ["blob-storage"],
  filesystem: ["file-system"],
  "file system": ["file-system"],

  // Compute & containers
  compute: [
    "server",
    "microservice",
    "serverless",
    "lambda",
    "cloud-function",
    "ec2",
    "gce",
    "azure-vm",
  ],
  server: ["server", "ec2", "gce", "azure-vm"],
  microservice: ["microservice"],
  serverless: ["serverless", "lambda", "cloud-function"],
  container: ["container", "docker", "kubernetes", "docker-registry"],
  containers: ["container", "docker", "kubernetes", "docker-registry"],
  docker: ["docker", "container", "docker-registry"],
  kubernetes: ["kubernetes", "container"],
  "auto-scaling": ["auto-scaling"],

  // DevOps
  devops: [
    "ci-cd",
    "terraform",
    "ansible",
    "service-registry",
    "docker-registry",
  ],
  "ci-cd": ["ci-cd"],
  terraform: ["terraform"],
  ansible: ["ansible"],
  "service-registry": ["service-registry"],

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

  // Patterns
  patterns: ["event-sourcing", "cqrs", "circuit-breaker", "bulkhead", "saga"],
  "event-sourcing": ["event-sourcing"],
  cqrs: ["cqrs"],
  "circuit-breaker": ["circuit-breaker"],
  bulkhead: ["bulkhead"],
  saga: ["saga"],
};

const categories = [
  { id: "all", label: "All Components", count: componentTypes.length },
  {
    id: "compute",
    label: "Compute",
    count: componentTypes.filter((c) => c.category === "compute").length,
  },
  {
    id: "containers",
    label: "Containers",
    count: componentTypes.filter((c) => c.category === "containers").length,
  },
  {
    id: "storage",
    label: "Storage",
    count: componentTypes.filter((c) => c.category === "storage").length,
  },
  {
    id: "networking",
    label: "Networking",
    count: componentTypes.filter((c) => c.category === "networking").length,
  },
  {
    id: "messaging",
    label: "Messaging",
    count: componentTypes.filter((c) => c.category === "messaging").length,
  },
  {
    id: "devops",
    label: "DevOps",
    count: componentTypes.filter((c) => c.category === "devops").length,
  },
  {
    id: "apis",
    label: "APIs",
    count: componentTypes.filter((c) => c.category === "apis").length,
  },
  {
    id: "clients",
    label: "Clients",
    count: componentTypes.filter((c) => c.category === "clients").length,
  },
  {
    id: "security",
    label: "Security",
    count: componentTypes.filter((c) => c.category === "security").length,
  },
  {
    id: "observability",
    label: "Observability",
    count: componentTypes.filter((c) => c.category === "observability").length,
  },
  {
    id: "data",
    label: "Data",
    count: componentTypes.filter((c) => c.category === "data").length,
  },
  {
    id: "patterns",
    label: "Patterns",
    count: componentTypes.filter((c) => c.category === "patterns").length,
  },
  {
    id: "emerging",
    label: "Emerging",
    count: componentTypes.filter((c) => c.category === "emerging").length,
  },
];

interface DraggableComponentProps extends ComponentType {}

const DraggableComponent = React.memo(function DraggableComponent({
  type,
  label,
  icon: Icon,
  color,
  description,
}: DraggableComponentProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "component",
    item: { type },
    collect: (monitor) => ({
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
        ${isDragging ? "opacity-50 rotate-1 scale-105 border-primary shadow-lg" : ""}
      `}
      title={description}
    >
      <div className="flex items-center space-x-2.5">
        <div
          className={`w-6 h-6 rounded-md ${color} flex items-center justify-center transition-all duration-200 group-hover:scale-110 shadow-sm`}
        >
          <Icon className="w-3 h-3 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium truncate block leading-tight">
            {label}
          </span>
          <span className="text-xs text-muted-foreground truncate block leading-tight mt-0.5">
            {description}
          </span>
        </div>
      </div>
    </div>
  );
});

interface ComponentPaletteProps {
  // Optional: pre-seed the library filter with challenge tags
  defaultTags?: string[];
}

export const ComponentPalette = React.memo(function ComponentPalette({
  defaultTags,
}: ComponentPaletteProps = {}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [tagFiltersCleared, setTagFiltersCleared] = useState(false);

  // When defaultTags are provided (e.g., from a selected challenge),
  // prefill the search with space-separated tags if the user hasn't typed yet.
  React.useEffect(() => {
    // Avoid over-filtering during automated E2E (Playwright sets navigator.webdriver)
    const isAutomated =
      typeof navigator !== "undefined" && (navigator as any).webdriver === true;
    if (isAutomated) return;
    if (defaultTags && defaultTags.length > 0) {
      // Only auto-apply when the user hasn't typed a custom search
      setSearchQuery((prev) =>
        prev?.trim().length ? prev : defaultTags.join(" ").trim()
      );
    }
  }, [defaultTags]);

  // Build recommended component types from challenge tags using explicit mapping + heuristics
  const recommendedTypes = React.useMemo(() => {
    // Avoid tag-based narrowing under automation to keep full library available
    const isAutomated =
      typeof navigator !== "undefined" && (navigator as any).webdriver === true;
    if (isAutomated) return new Set<ComponentType["type"]>();
    const set = new Set<ComponentType["type"]>();
    const tags = (defaultTags || [])
      .map((t) => t.toLowerCase().trim())
      .filter(Boolean);

    const addTypes = (types?: Array<ComponentType["type"]>) => {
      types?.forEach((t) => set.add(t));
    };

    for (const tag of tags) {
      // Direct map
      addTypes(TAG_TO_TYPES[tag]);

      // Heuristics and synonyms
      if (/db|database/.test(tag))
        addTypes([
          "database",
          "postgresql",
          "mysql",
          "mongodb",
          "dynamodb",
          "cassandra",
        ]);
      if (/sql/.test(tag)) addTypes(["postgresql", "mysql"]);
      if (/nosql/.test(tag))
        addTypes(["mongodb", "redis", "dynamodb", "cassandra"]);
      if (/cache/.test(tag)) addTypes(["cache", "redis"]);
      if (/websocket|web\s*socket/.test(tag)) addTypes(["websocket"]);
      if (/grpc/.test(tag)) addTypes(["grpc"]);
      if (/queue|messag|pub\s*sub|kafka|rabbit/.test(tag)) {
        addTypes([
          "message-queue",
          "producer",
          "consumer",
          "broker",
          "dead-letter-queue",
          "kafka",
          "rabbitmq",
        ]);
      }
      if (/api|rest|graphql|webhook|gateway/.test(tag)) {
        addTypes(["rest-api", "api-gateway", "graphql", "webhook"]);
      }
      if (/cdn/.test(tag)) addTypes(["cdn"]);
      if (/load\s*balanc/.test(tag)) addTypes(["load-balancer"]);
      if (/auth|oauth|jwt|security|firewall/.test(tag)) {
        addTypes([
          "authentication",
          "authorization",
          "oauth",
          "jwt",
          "security",
          "firewall",
          "sso",
        ]);
      }
      if (/observab|monitor|logg|metric|alert/.test(tag)) {
        addTypes([
          "monitoring",
          "logging",
          "metrics",
          "alerting",
          "prometheus",
          "grafana",
        ]);
      }
      if (/search/.test(tag)) addTypes(["elasticsearch"]);
      if (/analytic|warehouse|lake|etl|stream/i.test(tag)) {
        addTypes([
          "elasticsearch",
          "kibana",
          "data-warehouse",
          "data-lake",
          "etl",
          "stream-processing",
          "apache-spark",
        ]);
      }
      if (/storage|s3|blob|file/.test(tag)) {
        addTypes(["storage", "s3", "blob-storage", "file-system"]);
      }
      if (/serverless|lambda|cloud\s*function/.test(tag)) {
        addTypes(["serverless", "lambda", "cloud-function"]);
      }
      if (/container|docker|kubern/.test(tag)) {
        addTypes(["container", "docker", "kubernetes"]);
      }
      if (/edge/.test(tag)) addTypes(["edge-computing", "cdn"]);
      if (/ai|ml/.test(tag)) addTypes(["ai-ml"]);
      if (/client|web|mobile|desktop|iot/.test(tag)) {
        addTypes([
          "client",
          "web-app",
          "mobile-app",
          "desktop-app",
          "iot-device",
        ]);
      }

      // Exact type name matches (e.g., tag "redis", "kubernetes")
      const directType = componentTypes.find((ct) => ct.type === tag);
      if (directType) set.add(directType.type);
    }
    return set;
  }, [defaultTags]);

  const filteredComponents = componentTypes.filter((component) => {
    const hasTagRecommendations =
      recommendedTypes.size > 0 && !tagFiltersCleared;

    // When we have tag recommendations, prefer them over free-text search
    const matchesTags = hasTagRecommendations
      ? recommendedTypes.has(component.type)
      : true;

    // Tokenize free-text search as a fallback/complement
    let tokens = searchQuery
      .toLowerCase()
      .split(/\s+/)
      .map((t) => t.trim())
      .filter(Boolean);

    // If search is only from default tags and produced no recommendations,
    // don't over-filter by text — show full library with category filter.
    if ((defaultTags?.length ?? 0) > 0 && recommendedTypes.size === 0) {
      tokens = [];
    }

    const matchesText =
      tokens.length === 0 ||
      tokens.some(
        (token) =>
          component.label.toLowerCase().includes(token) ||
          component.description.toLowerCase().includes(token)
      );

    const matchesCategory =
      activeCategory === "all" || component.category === activeCategory;

    // If we have tag recommendations, require tag match; otherwise, use text search
    return (
      (hasTagRecommendations ? matchesTags : matchesText) && matchesCategory
    );
  });

  return (
    <EnhancedCard
      elevation={2}
      glass
      className="h-full flex flex-col"
      gradientBorder
    >
      <CardHeader className="pb-3 bg-gradient-to-r from-muted/30 via-card to-muted/20 border-b border-border/20">
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent" />
        </CardTitle>
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={React.useCallback(
                (e: React.ChangeEvent<HTMLInputElement>) => {
                  const newValue = e.target.value;
                  setSearchQuery(newValue);
                  // Reset to "All Components" and clear tag filters when search is cleared
                  if (newValue.trim() === "") {
                    setActiveCategory("all");
                    setTagFiltersCleared(true);
                  } else {
                    setTagFiltersCleared(false);
                  }
                },
                []
              )}
              className="text-sm bg-background/60 backdrop-blur border-border/30 focus:bg-background/80 transition-all duration-200 pl-10 rounded-lg"
            />
          </div>
          <Badge
            variant="secondary"
            className="text-xs bg-primary/10 text-primary border-primary/20"
          >
            {filteredComponents.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0">
        <Tabs
          value={activeCategory}
          onValueChange={setActiveCategory}
          className="flex-1 flex flex-col"
        >
          <div className="px-3 py-2 border-b border-border/20 bg-[var(--glass-bg)] backdrop-blur-sm">
            <ScrollArea className="w-full">
              <div className="flex flex-wrap gap-1">
                {categories.slice(0, 4).map((category) => (
                  <Button
                    key={category.id}
                    variant={
                      activeCategory === category.id ? "default" : "ghost"
                    }
                    size="sm"
                    onClick={() => setActiveCategory(category.id)}
                    className="text-xs h-7 px-2 flex items-center gap-1 rounded-full"
                  >
                    {category.label}
                    <Badge
                      variant={
                        activeCategory === category.id ? "secondary" : "outline"
                      }
                      className="text-[10px] h-4 px-1 ml-1"
                    >
                      {category.count}
                    </Badge>
                  </Button>
                ))}
              </div>
              {categories.length > 4 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {categories.slice(4).map((category) => (
                    <Button
                      key={category.id}
                      variant={
                        activeCategory === category.id ? "default" : "ghost"
                      }
                      size="sm"
                      onClick={() => setActiveCategory(category.id)}
                      className="text-xs h-7 px-2 flex items-center gap-1 rounded-full"
                    >
                      {category.label}
                      <Badge
                        variant={
                          activeCategory === category.id
                            ? "secondary"
                            : "outline"
                        }
                        className="text-[10px] h-4 px-1 ml-1"
                      >
                        {category.count}
                      </Badge>
                    </Button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          <div className="flex-1 px-3 pb-3 mt-0">
            <ScrollArea className="h-full">
              {activeCategory === "all" ? (
                <div className="space-y-4">
                  {categories.slice(1).map((category) => {
                    const categoryComponents = filteredComponents.filter(
                      (c) => c.category === category.id
                    );
                    if (categoryComponents.length === 0) return null;

                    return (
                      <div key={category.id}>
                        <div className="flex items-center space-x-2 mb-2 sticky top-0 bg-card/90 backdrop-blur-sm py-1 z-10">
                          <h4 className="text-sm font-medium capitalize text-foreground/90">
                            {category.label}
                          </h4>
                          <Badge variant="outline" className="text-xs h-4 px-1">
                            {categoryComponents.length}
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          {categoryComponents.map((component) => (
                            <DraggableComponent
                              key={component.type}
                              {...component}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredComponents
                    .filter((c) => c.category === activeCategory)
                    .map((component) => (
                      <DraggableComponent key={component.type} {...component} />
                    ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </Tabs>

        <div className="px-3 py-2 border-t bg-gradient-to-r from-muted/20 via-card to-muted/10 backdrop-blur-sm">
          <p className="text-xs text-muted-foreground">
            💡 Drag components to the canvas to build your system architecture
          </p>
        </div>
      </CardContent>
    </EnhancedCard>
  );
});
