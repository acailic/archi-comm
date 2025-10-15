import { aiConfigService } from './AIConfigService';
import { isTauri } from '@/lib/platform/tauri';
import { AIProvider } from '@/lib/types/AIConfig';
import type {
  AIAssistantResponse,
  TextToDiagramOptions,
  CanvasAIInstructionRequest,
  CanvasAIInstructionResponse,
  CanvasAIInstructionContext,
  CanvasAIAction,
  CanvasAIComponentDraft,
  CanvasAIConnectionDraft,
  AIGeneratedMetadata,
  DesignComponent,
  Connection,
} from '@/shared/contracts';

interface ProviderCallParams {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

interface CanvasAIProviderAdapter {
  sendInstruction(prompt: string, params: ProviderCallParams): Promise<string>;
}

interface ProviderDetails {
  provider: AIProvider;
  apiKey: string;
  model?: string;
}

interface CanvasAIDiagramRequest {
  prompt: string;
  options?: TextToDiagramOptions;
  context: CanvasAIInstructionContext;
  providerOverride?: string;
}

const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';
const DEFAULT_CLAUDE_MODEL = 'claude-3-haiku-20240307';
const SUPPORTED_PROVIDERS = [AIProvider.OPENAI, AIProvider.CLAUDE] as const;
type SupportedProvider = (typeof SUPPORTED_PROVIDERS)[number];

const SYSTEM_PROMPT = `
You are ArchiComm's architecture canvas copilot. You transform natural language instructions into explicit canvas operations.

Only respond with strict JSON (no markdown code fences) matching this schema:
{
  "summary": "Short explanation of what will happen",
  "reasoning": "Key reasoning steps taken to interpret the instruction",
  "warnings": ["Optional warning strings for ambiguous or risky operations"],
  "actions": [
    {
      "type": "add_component",
      "component": {
        "id": "optional reference id used for subsequent actions",
        "type": "service|database|queue|client|actor|component|gateway|...",
        "label": "Readable label",
        "x": 320,
        "y": 180,
        "width": 160,
        "height": 96,
        "properties": {}
      }
    },
    { "type": "update_component", "componentId": "existing-id", "patch": { "label": "New label", "x": 540 } },
    { "type": "remove_component", "componentId": "existing-id" },
    { "type": "add_connection", "connection": { "id": "optional", "from": "source-id", "to": "target-id", "type": "data", "label": "uses" } },
    { "type": "update_connection", "connectionId": "existing-id", "patch": { "label": "New label" } },
    { "type": "remove_connection", "connectionId": "existing-id" },
    { "type": "annotate", "message": "Short annotation text", "targetComponentId": "optional-target" }
  ]
}

Rules:
- Snap coordinates to integers and favour 80-200 spacing between related components.
- Provide width and height for new components (defaults: width 160, height 96).
- Reuse provided component ids when updating or connecting. When creating new components you may supply temporary ids; the client will remap them.
- Prefer descriptive labels (e.g. "Auth Service", "User Browser").
- Add warnings if you are unsure or if requested operations conflict with existing canvas state.
`.trim();

class OpenAICanvasAdapter implements CanvasAIProviderAdapter {
  constructor(private readonly apiKey: string) {}

  async sendInstruction(prompt: string, params: ProviderCallParams): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: params.model || DEFAULT_OPENAI_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        temperature: params.temperature ?? 0.2,
        max_tokens: params.maxTokens ?? 1600,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      throw new Error(`OpenAI request failed (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('OpenAI response did not contain assistant content.');
    }
    return content;
  }
}

class ClaudeCanvasAdapter implements CanvasAIProviderAdapter {
  constructor(private readonly apiKey: string) {}

  async sendInstruction(prompt: string, params: ProviderCallParams): Promise<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: params.model || DEFAULT_CLAUDE_MODEL,
        max_tokens: params.maxTokens ?? 1600,
        temperature: params.temperature ?? 0.2,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      throw new Error(`Claude request failed (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const firstBlock = Array.isArray(data.content) ? data.content[0] : null;
    const content =
      firstBlock?.text ||
      (Array.isArray(firstBlock?.content) ? firstBlock.content[0]?.text : undefined);
    if (!content) {
      throw new Error('Claude response did not contain assistant content.');
    }
    return content;
  }
}

function normalizeNumber(value: unknown, fallback?: number): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

function coerceProvider(provider?: string): AIProvider | undefined {
  if (!provider) return undefined;
  const normalized = provider.toLowerCase();
  if (normalized.includes('claude')) return AIProvider.CLAUDE;
  if (normalized.includes('gemini')) return AIProvider.GEMINI;
  return AIProvider.OPENAI;
}

function isSupportedProvider(provider?: AIProvider | null): provider is SupportedProvider {
  return !!provider && SUPPORTED_PROVIDERS.includes(provider);
}

function summarizeContext(context: CanvasAIInstructionContext): string {
  const summarizeComponents = context.components.slice(0, 20).map(component => ({
    id: component.id,
    type: component.type,
    label: component.label,
    x: Math.round(component.x),
    y: Math.round(component.y),
    width: Math.round(component.width),
    height: Math.round(component.height),
  }));

  const summarizeConnections = context.connections.slice(0, 30).map(connection => ({
    id: connection.id,
    from: connection.from,
    to: connection.to,
    type: connection.type,
    label: connection.label,
  }));

  return JSON.stringify(
    {
      components: summarizeComponents,
      connections: summarizeConnections,
      selectedComponentIds: context.selectedComponentIds ?? [],
    },
    null,
    2,
  );
}

function extractJsonBlock(input: string): string | null {
  const match = input.match(/\{[\s\S]*\}/);
  return match ? match[0] : null;
}

function normalizeComponentDraft(value: unknown): CanvasAIComponentDraft | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const raw = value as Record<string, unknown>;
  const draft: CanvasAIComponentDraft = {};

  if (typeof raw.id === 'string') draft.id = raw.id;
  if (typeof raw.type === 'string') draft.type = raw.type;
  if (typeof raw.label === 'string') draft.label = raw.label;
  const x = normalizeNumber(raw.x);
  if (typeof x === 'number') draft.x = x;
  const y = normalizeNumber(raw.y);
  if (typeof y === 'number') draft.y = y;
  const width = normalizeNumber(raw.width);
  if (typeof width === 'number') draft.width = width;
  const height = normalizeNumber(raw.height);
  if (typeof height === 'number') draft.height = height;
  if (raw.properties && typeof raw.properties === 'object') {
    draft.properties = raw.properties as Record<string, unknown>;
  }

  return draft;
}

function normalizeConnectionDraft(value: unknown): CanvasAIConnectionDraft | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const raw = value as Record<string, unknown>;
  const draft: CanvasAIConnectionDraft = {};

  if (typeof raw.id === 'string') draft.id = raw.id;
  if (typeof raw.from === 'string') draft.from = raw.from;
  if (typeof raw.to === 'string') draft.to = raw.to;
  if (typeof raw.type === 'string') draft.type = raw.type as Connection['type'];
  if (typeof raw.label === 'string') draft.label = raw.label;

  return draft;
}

function createMockMetadata(prompt: string, model = 'simulation'): AIGeneratedMetadata {
  return {
    prompt,
    generatedAt: Date.now(),
    model,
    confidence: 0.75,
    suggestionsApplied: ['mock-generation'],
    patternsDetected: [],
  };
}

function createAliasFactory() {
  let counter = 0;
  return (base: string) => {
    counter += 1;
    const slug = base.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'item';
    return `ai-${slug}-${counter.toString(36)}`;
  };
}

function generateMockDiagram(prompt: string): {
  components: DesignComponent[];
  connections: Connection[];
  explanation: string;
  metadata: AIGeneratedMetadata;
} {
  const createAlias = createAliasFactory();
  const lower = prompt.toLowerCase();

  const baseComponent = (type: DesignComponent['type'], label: string, x: number, y: number) => ({
    id: createAlias(label),
    type,
    label,
    x,
    y,
    width: 140,
    height: 80,
    properties: {},
  });

  const baseConnection = (
    from: string,
    to: string,
    type: Connection['type'],
    label: string,
  ) => ({
    id: createAlias('conn'),
    from,
    to,
    type,
    label,
  });

  let components: DesignComponent[] = [];
  let connections: Connection[] = [];
  let explanation = `Generated generic architecture for prompt: "${prompt}"`;

  if (lower.includes('user') && lower.includes('login')) {
    const user = baseComponent('actor', 'User', 100, 100);
    const login = baseComponent('component', 'Login Form', 320, 100);
    const auth = baseComponent('service', 'Auth Service', 540, 100);
    components = [user, login, auth];
    connections = [
      baseConnection(user.id, login.id, 'data', 'submits credentials'),
      baseConnection(login.id, auth.id, 'async', 'validate'),
    ];
    explanation = 'Mocked login flow with user, login form, and auth service.';
  } else if (lower.includes('database') || lower.includes('data')) {
    const app = baseComponent('component', 'Web App', 120, 120);
    const api = baseComponent('gateway', 'API Gateway', 340, 120);
    const db = baseComponent('database', 'Primary Database', 560, 120);
    components = [app, api, db];
    connections = [
      baseConnection(app.id, api.id, 'sync', 'requests'),
      baseConnection(api.id, db.id, 'data', 'queries'),
    ];
    explanation = 'Mocked data architecture with web app, API gateway, and database.';
  } else if (lower.includes('microservice') || lower.includes('service')) {
    const gateway = baseComponent('gateway', 'API Gateway', 200, 120);
    const services = Array.from({ length: 3 }).map((_, index) =>
      baseComponent('service', `Service ${index + 1}`, 420, 40 + index * 140),
    );
    const db = baseComponent('database', 'Shared Database', 640, 160);
    components = [gateway, ...services, db];
    connections = [
      ...services.map(service => baseConnection(gateway.id, service.id, 'sync', 'route')),
      ...services.map(service => baseConnection(service.id, db.id, 'data', 'persist')),
    ];
    explanation = 'Mocked microservices layout with gateway and shared database.';
  } else {
    const client = baseComponent('component', 'Client', 120, 160);
    const server = baseComponent('component', 'Application Server', 360, 160);
    const storage = baseComponent('database', 'Storage', 600, 160);
    components = [client, server, storage];
    connections = [
      baseConnection(client.id, server.id, 'sync', 'communicates'),
      baseConnection(server.id, storage.id, 'data', 'persists'),
    ];
  }

  return {
    components,
    connections,
    explanation,
    metadata: createMockMetadata(prompt),
  };
}

function generateMockSuggestions(
  components: DesignComponent[],
  connections: Connection[],
): AIAssistantResponse {
  const suggestions: AIAssistantResponse['suggestions'] = [];

  if (components.length > 0 && connections.length === 0) {
    suggestions.push({
      components: [],
      connections: [
        {
          id: `ai-connection-${Date.now()}`,
          from: components[0].id,
          to: components[1]?.id || components[0].id,
          type: 'data',
          label: 'suggested connection',
        },
      ],
      explanation: 'Consider adding connections between your components to show data flow.',
      confidence: 0.7,
      metadata: createMockMetadata('Design analysis'),
    });
  }

  if (components.length > 5) {
    suggestions.push({
      components: [],
      connections: [],
      explanation: 'Group related services into frames for better readability.',
      confidence: 0.8,
      metadata: createMockMetadata('Design organization'),
    });
  }

  return {
    success: true,
    message: `Found ${suggestions.length} suggestions for your design`,
    suggestions,
  };
}

function generateMockAnalysis(
  components: DesignComponent[],
  connections: Connection[],
): AIAssistantResponse {
  const analysis: string[] = [];

  if (components.length === 0) {
    analysis.push('Start by adding components that represent the core of your architecture.');
  } else if (connections.length === 0) {
    analysis.push(
      'Your design has components but no connections. Consider adding connections to show relationships.',
    );
  } else {
    const avgConnections = connections.length / components.length;
    if (avgConnections < 0.5) {
      analysis.push(
        'Your design appears sparse. Consider adding more connections to show data flow.',
      );
    } else if (avgConnections > 2) {
      analysis.push(
        'Your design has many connections. Consider grouping related components using frames.',
      );
    } else {
      analysis.push('Your design looks well-connected!');
    }
  }

  return {
    success: true,
    message: analysis.join(' '),
  };
}

function mockInstructionResponse(prompt: string): CanvasAIInstructionResponse {
  const mock = generateMockDiagram(prompt);
  const actions: CanvasAIAction[] = [
    ...mock.components.map(component => ({
      type: 'add_component',
      component,
    })),
    ...mock.connections.map(connection => ({
      type: 'add_connection',
      connection,
    })),
  ];

  return {
    actions,
    reasoning: mock.explanation,
    summary: mock.explanation,
    warnings: [],
    provider: 'simulation',
    model: 'mock-canvas-ai',
    rawText: JSON.stringify({ actions }),
    createdAt: Date.now(),
  };
}

export class CanvasAIService {
  private async resolveProvider(
    providerOverride?: string,
    modelOverride?: string,
  ): Promise<ProviderDetails | null> {
    const config = await aiConfigService.loadConfig();
    const explicit = coerceProvider(providerOverride);
    const preferred = config.preferredProvider;

    const candidates = [
      explicit,
      preferred,
      AIProvider.OPENAI,
      AIProvider.CLAUDE,
    ].filter((candidate, index, arr): candidate is SupportedProvider => {
      if (!isSupportedProvider(candidate)) return false;
      return arr.indexOf(candidate) === index;
    });

    for (const provider of candidates) {
      const key = provider === AIProvider.OPENAI ? 'openai' : 'claude';
      const providerConfig = config[key];
      if (providerConfig?.enabled && providerConfig.apiKey.trim()) {
        return {
          provider,
          apiKey: providerConfig.apiKey.trim(),
          model: modelOverride,
        };
      }
    }

    return null;
  }

  private getAdapter(details: ProviderDetails): CanvasAIProviderAdapter {
    switch (details.provider) {
      case AIProvider.OPENAI:
        return new OpenAICanvasAdapter(details.apiKey);
      case AIProvider.CLAUDE:
        return new ClaudeCanvasAdapter(details.apiKey);
      default:
        throw new Error(`Unsupported AI provider: ${details.provider}`);
    }
  }

  private buildInstructionPrompt(request: CanvasAIInstructionRequest): string {
    const mode = request.mode || 'update';
    const contextSummary = summarizeContext(request.context);
    const optionSummary = JSON.stringify(
      {
        mode,
        allowPartial: request.allowPartial ?? false,
      },
      null,
      2,
    );

    const supplemental = request.mode === 'diagram' && request.context.components.length === 0
      ? '\nGenerate a fresh architecture based only on the prompt.'
      : '';

    return [
      `Instruction mode: ${mode}`,
      `Options: ${optionSummary}`,
      `Existing canvas (truncated):\n${contextSummary}`,
      `User instruction:\n${request.prompt}${supplemental}`,
      'Respond with valid JSON matching the schema described in the system prompt.',
    ].join('\n\n');
  }

  private normalizeResponse(rawText: string): CanvasAIInstructionResponse {
    const fallback: CanvasAIInstructionResponse = {
      actions: [],
      reasoning: undefined,
      summary: undefined,
      warnings: ['Unable to parse AI response, no actions applied.'],
      provider: undefined,
      model: undefined,
      rawText,
      createdAt: Date.now(),
    };

    const jsonBlock = extractJsonBlock(rawText);
    if (!jsonBlock) {
      return fallback;
    }

    try {
      const parsed = JSON.parse(jsonBlock);
      const warnings: string[] = Array.isArray(parsed.warnings)
        ? parsed.warnings.filter((warning: unknown) => typeof warning === 'string')
        : [];
      const { actions, extraWarnings } = this.normalizeActions(parsed.actions);

      return {
        actions,
        reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : undefined,
        summary: typeof parsed.summary === 'string' ? parsed.summary : undefined,
        warnings: [...warnings, ...extraWarnings],
        provider: typeof parsed.provider === 'string' ? parsed.provider : undefined,
        model: typeof parsed.model === 'string' ? parsed.model : undefined,
        rawText,
        createdAt: Date.now(),
      };
    } catch (error) {
      return {
        ...fallback,
        warnings: [
          ...fallback.warnings,
          error instanceof Error ? error.message : 'Unknown JSON parse error',
        ],
      };
    }
  }

  private normalizeActions(rawActions: unknown): { actions: CanvasAIAction[]; extraWarnings: string[] } {
    const warnings: string[] = [];
    if (!Array.isArray(rawActions)) {
      return {
        actions: [],
        extraWarnings: ['AI response did not include an "actions" array.'],
      };
    }

    const actions: CanvasAIAction[] = [];
    rawActions.forEach((rawAction, index) => {
      if (!rawAction || typeof rawAction !== 'object') {
        warnings.push(`Action at index ${index} is not an object and was skipped.`);
        return;
      }

      const action = rawAction as Record<string, unknown>;
      const type = typeof action.type === 'string' ? action.type : '';
      switch (type) {
        case 'add_component': {
          const component = normalizeComponentDraft(action.component);
          if (!component) {
            warnings.push(`add_component action at index ${index} is missing "component" details.`);
            break;
          }
          actions.push({
            type: 'add_component',
            component,
          });
          break;
        }
        case 'update_component': {
          if (typeof action.componentId !== 'string') {
            warnings.push(`update_component action at index ${index} missing componentId.`);
            break;
          }
          const patch = normalizeComponentDraft(action.patch) || {};
          actions.push({
            type: 'update_component',
            componentId: action.componentId,
            patch,
          });
          break;
        }
        case 'remove_component': {
          if (typeof action.componentId !== 'string') {
            warnings.push(`remove_component action at index ${index} missing componentId.`);
            break;
          }
          actions.push({
            type: 'remove_component',
            componentId: action.componentId,
          });
          break;
        }
        case 'add_connection': {
          const connection = normalizeConnectionDraft(action.connection);
          if (!connection || !connection.from || !connection.to) {
            warnings.push(`add_connection action at index ${index} missing connection data.`);
            break;
          }
          if (!connection.type) {
            connection.type = 'data';
          }
          actions.push({
            type: 'add_connection',
            connection,
          });
          break;
        }
        case 'update_connection': {
          if (typeof action.connectionId !== 'string') {
            warnings.push(`update_connection action at index ${index} missing connectionId.`);
            break;
          }
          const patch = normalizeConnectionDraft(action.patch) || {};
          actions.push({
            type: 'update_connection',
            connectionId: action.connectionId,
            patch,
          });
          break;
        }
        case 'remove_connection': {
          if (typeof action.connectionId !== 'string') {
            warnings.push(`remove_connection action at index ${index} missing connectionId.`);
            break;
          }
          actions.push({
            type: 'remove_connection',
            connectionId: action.connectionId,
          });
          break;
        }
        case 'annotate': {
          if (typeof action.message !== 'string' || !action.message.trim()) {
            warnings.push(`annotate action at index ${index} missing message.`);
            break;
          }
          actions.push({
            type: 'annotate',
            message: action.message,
            targetComponentId:
              typeof action.targetComponentId === 'string' ? action.targetComponentId : undefined,
          });
          break;
        }
        default: {
          warnings.push(`Unknown action type "${type}" at index ${index} was skipped.`);
          break;
        }
      }
    });

    return { actions, extraWarnings: warnings };
  }

  private createAssistantResponseFromActions(
    instruction: CanvasAIInstructionResponse,
    prompt: string,
  ): AIAssistantResponse {
    const addedComponents = instruction.actions.filter(
      action => action.type === 'add_component',
    ) as Array<{ type: 'add_component'; component: CanvasAIComponentDraft }>;
    const addedConnections = instruction.actions.filter(
      action => action.type === 'add_connection',
    ) as Array<{ type: 'add_connection'; connection: CanvasAIConnectionDraft }>;

    const metadata = createMockMetadata(prompt, instruction.model || instruction.provider);
    metadata.suggestionsApplied = ['canvas-ai-autogen'];

    if (addedComponents.length === 0 && addedConnections.length === 0) {
      return {
        success: instruction.actions.length > 0,
        message:
          instruction.summary ||
          instruction.reasoning ||
          'AI processed instruction but no new components or connections were proposed.',
        suggestions: [],
        error:
          instruction.actions.length === 0
            ? 'No actionable items returned by AI.'
            : undefined,
      };
    }

    const components = addedComponents.map(action => action.component as DesignComponent);
    const connections = addedConnections.map(action => action.connection as Connection);

    return {
      success: true,
      message:
        instruction.summary ||
        `Generated diagram with ${components.length} components and ${connections.length} connections`,
      suggestions: [
        {
          components,
          connections,
          explanation: instruction.reasoning || instruction.summary || 'AI-generated diagram',
          confidence: 0.82,
          metadata,
        },
      ],
    };
  }

  async generateDiagramFromText(request: CanvasAIDiagramRequest): Promise<AIAssistantResponse> {
    if (!isTauri()) {
      const mock = generateMockDiagram(request.prompt);
      return {
        success: true,
        message: mock.explanation,
        suggestions: [
          {
            components: mock.components,
            connections: mock.connections,
            explanation: mock.explanation,
            confidence: 0.6,
            metadata: mock.metadata,
          },
        ],
      };
    }

    const provider = await this.resolveProvider(request.providerOverride, request.options?.model);
    if (!provider) {
      const mock = generateMockDiagram(request.prompt);
      return {
        success: false,
        message: 'No AI provider configured. Showing mock generation instead.',
        suggestions: [
          {
            components: mock.components,
            connections: mock.connections,
            explanation: mock.explanation,
            confidence: 0.5,
            metadata: mock.metadata,
          },
        ],
        error: 'AI provider not configured',
      };
    }

    const adapter = this.getAdapter(provider);
    const prompt = this.buildInstructionPrompt({
      prompt: request.prompt,
      context: request.context,
      provider: provider.provider,
      model: request.options?.model,
      temperature: request.options?.temperature,
      maxTokens: request.options?.maxTokens,
      allowPartial: true,
      mode: 'diagram',
    });

    try {
      const raw = await adapter.sendInstruction(prompt, {
        model: provider.model,
        temperature: request.options?.temperature,
        maxTokens: request.options?.maxTokens,
      });
      const parsed = this.normalizeResponse(raw);
      return this.createAssistantResponseFromActions(parsed, request.prompt);
    } catch (error) {
      const mock = generateMockDiagram(request.prompt);
      return {
        success: false,
        message:
          error instanceof Error ? error.message : 'Failed to generate diagram from AI provider',
        suggestions: [
          {
            components: mock.components,
            connections: mock.connections,
            explanation: mock.explanation,
            confidence: 0.5,
            metadata: mock.metadata,
          },
        ],
        error: 'AI generation failed',
      };
    }
  }

  async executeInstruction(request: CanvasAIInstructionRequest): Promise<CanvasAIInstructionResponse> {
    if (!isTauri()) {
      return mockInstructionResponse(request.prompt);
    }

    const provider = await this.resolveProvider(request.provider, request.model);
    if (!provider) {
      const mock = mockInstructionResponse(request.prompt);
      mock.warnings = [
        ...(mock.warnings ?? []),
        'No AI provider configured; using heuristic simulation.',
      ];
      return mock;
    }

    const adapter = this.getAdapter(provider);
    const prompt = this.buildInstructionPrompt(request);

    try {
      const raw = await adapter.sendInstruction(prompt, {
        model: provider.model,
        temperature: request.temperature,
        maxTokens: request.maxTokens,
      });
      const parsed = this.normalizeResponse(raw);
      if (!parsed.model) {
        parsed.model = provider.model || (provider.provider === AIProvider.OPENAI
          ? DEFAULT_OPENAI_MODEL
          : DEFAULT_CLAUDE_MODEL);
      }
      if (!parsed.provider) {
        parsed.provider = provider.provider;
      }
      return parsed;
    } catch (error) {
      const warning =
        error instanceof Error ? error.message : 'AI provider request failed unexpectedly.';
      const mock = mockInstructionResponse(request.prompt);
      mock.warnings = [...(mock.warnings ?? []), warning];
      return mock;
    }
  }

  async getDesignSuggestions(context: CanvasAIInstructionContext): Promise<AIAssistantResponse> {
    if (!isTauri()) {
      return generateMockSuggestions(context.components, context.connections);
    }

    // For now reuse simulation, but could delegate to provider with dedicated prompt.
    return generateMockSuggestions(context.components, context.connections);
  }

  async analyzeDesign(context: CanvasAIInstructionContext): Promise<AIAssistantResponse> {
    if (!isTauri()) {
      return generateMockAnalysis(context.components, context.connections);
    }

    // Placeholder: real analysis can be powered by provider; keep deterministic fallback for now.
    return generateMockAnalysis(context.components, context.connections);
  }
}

export const canvasAIService = new CanvasAIService();

export type { CanvasAIDiagramRequest };
