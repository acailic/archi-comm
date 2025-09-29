import {
  Activity,
  AlertTriangle,
  Archive,
  BarChart3,
  Box,
  Boxes,
  Brain,
  Building,
  Cable,
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
  Truck,
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
    type: "docker-registry",
    label: "Docker Registry",
    icon: Container,
    color: "bg-blue-600",
    category: "devops",
    description: "Container image registry",
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

interface DraggableComponentProps extends ComponentType {
  isRecommended?: boolean;
}

const DraggableComponent = React.memo(function DraggableComponent({
  type,
  label,
  icon: Icon,
  color,
  description,
  isRecommended = false,
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
        group px-2 py-1.5 cursor-move transition-all duration-150
        hover:bg-accent/50 border-l-2 border-transparent hover:border-primary/60
        ${isDragging ? "opacity-50 bg-accent/30 border-primary" : ""}
      `}
      title={description}
    >
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded flex items-center justify-center bg-background/50">
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium truncate block leading-tight">
            {label}
          </span>
        </div>
        {isRecommended && (
          <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" title="Recommended" />
        )}
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
  // Performance monitoring removed for simplicity

  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const previousTagSignatureRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    const signature = (defaultTags || []).join("|");
    if (previousTagSignatureRef.current === signature) return;

    previousTagSignatureRef.current = signature;
    setSearchQuery("");
    setActiveCategory("all");
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
        addTypes(["database", "postgresql", "mysql", "mongodb"]);
      if (/sql/.test(tag)) addTypes(["postgresql", "mysql"]);
      if (/nosql/.test(tag)) addTypes(["mongodb", "redis"]);
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
        ]);
      }
      if (/observab|monitor|logg|metric|alert/.test(tag)) {
        addTypes(["monitoring", "logging", "metrics", "alerting"]);
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

      // Exact type name matches (e.g., tag 'redis', 'kubernetes')
      const directType = componentTypes.find((ct) => ct.type === tag);
      if (directType) set.add(directType.type);
    }
    return set;
  }, [defaultTags]);

  const shouldHighlightRecommendations = recommendedTypes.size > 0;

  const componentLabelMap = React.useMemo(() => {
    const map = new Map<ComponentType["type"], string>();
    componentTypes.forEach((component) => {
      map.set(component.type, component.label);
    });
    return map;
  }, []);

  const recommendedHighlights = React.useMemo(() => {
    if (!shouldHighlightRecommendations) return [] as Array<ComponentType["type"]>;
    return Array.from(recommendedTypes).slice(0, 6);
  }, [recommendedTypes, shouldHighlightRecommendations]);

  const filteredComponents = React.useMemo(() => {
    const tokens = searchQuery
      .toLowerCase()
      .split(/\s+/)
      .map((token) => token.trim())
      .filter(Boolean);

    return componentTypes.filter((component) => {
      const matchesCategory =
        activeCategory === "all" || component.category === activeCategory;
      if (!matchesCategory) return false;

      if (tokens.length === 0) return true;

      return tokens.some(
        (token) =>
          component.label.toLowerCase().includes(token) ||
          component.description.toLowerCase().includes(token) ||
          component.type.toLowerCase().includes(token)
      );
    });
  }, [activeCategory, searchQuery]);

  const visibleComponents = React.useMemo(() => {
    const sorted = [...filteredComponents];

    sorted.sort((a, b) => {
      const aRecommended =
        shouldHighlightRecommendations && recommendedTypes.has(a.type);
      const bRecommended =
        shouldHighlightRecommendations && recommendedTypes.has(b.type);

      if (aRecommended !== bRecommended) {
        return aRecommended ? -1 : 1;
      }

      return a.label.localeCompare(b.label);
    });

    return sorted;
  }, [filteredComponents, recommendedTypes, shouldHighlightRecommendations]);

  return (
    <div className="h-full flex flex-col bg-card border-r border-border">
      {/* Compact Header */}
      <div className="px-3 py-2 border-b border-border/50 bg-card/50">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Component Library</h3>
          <Badge variant="secondary" className="text-xs h-5 px-2">
            {visibleComponents.length}
          </Badge>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search components..."
            value={searchQuery}
            onChange={React.useCallback(
              (e: React.ChangeEvent<HTMLInputElement>) => {
                setSearchQuery(e.target.value);
                setActiveCategory("all");
              },
              []
            )}
            className="h-8 text-xs pl-8 bg-background"
          />
        </div>

        {/* Category Filter - Simple Dropdown */}
        {searchQuery === "" && (
          <div className="mt-2 flex flex-wrap gap-1">
            <Button
              variant={activeCategory === "all" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveCategory("all")}
              className="h-6 px-2 text-xs"
            >
              All
            </Button>
            {categories.slice(1, 6).map((category) => (
              <Button
                key={category.id}
                variant={activeCategory === category.id ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveCategory(category.id)}
                className="h-6 px-2 text-xs"
              >
                {category.label}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Component List - Simple, compact scrollable list */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          {visibleComponents.length === 0 ? (
            <div className="flex items-center justify-center p-8">
              <p className="text-xs text-muted-foreground text-center">
                No components found
              </p>
            </div>
          ) : activeCategory === "all" ? (
            <div>
              {categories.slice(1).map((category) => {
                const categoryComponents = visibleComponents.filter(
                  (c) => c.category === category.id
                );
                if (categoryComponents.length === 0) return null;

                return (
                  <div key={category.id}>
                    <div className="sticky top-0 bg-card px-3 py-1.5 border-b border-border/30 z-10">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {category.label}
                        </h4>
                        <span className="text-[10px] text-muted-foreground/60">
                          {categoryComponents.length}
                        </span>
                      </div>
                    </div>
                    <div>
                      {categoryComponents.map((component) => (
                        <DraggableComponent
                          key={component.type}
                          {...component}
                          isRecommended={
                            shouldHighlightRecommendations &&
                            recommendedTypes.has(component.type)
                          }
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div>
              {visibleComponents
                .filter((c) => c.category === activeCategory)
                .map((component) => (
                  <DraggableComponent
                    key={component.type}
                    {...component}
                    isRecommended={
                      shouldHighlightRecommendations &&
                      recommendedTypes.has(component.type)
                    }
                  />
                ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
});
