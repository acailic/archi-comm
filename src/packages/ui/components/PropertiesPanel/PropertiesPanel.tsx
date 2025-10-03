/**
 * Optimized Properties Panel - Uses lazy loading and smart memoization
 * Implements efficient property validation and editing for selected components
 */

import React, { Suspense, useMemo, useCallback, useState } from 'react';
import { useLazyComponent, usePreloadComponents } from '@/lib/lazy-loading/ComponentLazyLoader';
import { reactProfilerIntegration } from '@/lib/performance/ReactProfilerIntegration';
import { componentOptimizer } from '@/lib/performance/ComponentOptimizer';
import type { DesignComponent } from '@shared/contracts';

export interface PropertiesPanelProps {
  selectedComponent: string | null;
  components: DesignComponent[];
  onLabelChange?: (componentId: string, label: string) => void;
  onTypeChange?: (componentId: string, type: string) => void;
  onDescriptionChange?: (componentId: string, description: string) => void;
  onLayerChange?: (componentId: string, layerId: string) => void;
  onPositionChange?: (componentId: string, x: number, y: number) => void;
  onDelete?: (componentId: string) => void;
  onDuplicate?: (componentId: string) => void;
  onShowLabelToggle?: (componentId: string) => void;
  onStickerToggle?: (componentId: string) => void;
  onStickerEmojiChange?: (componentId: string, emoji: string) => void;
  onBgColorChange?: (componentId: string, color: string) => void;
  onNodeBgChange?: (componentId: string, bg: string) => void;
  challengeTags?: string[];
  className?: string;
}

interface PropertySection {
  id: string;
  label: string;
  icon: string;
  expandable: boolean;
  component: React.ComponentType<any>;
  lazy?: boolean;
}

// Lazy-loaded property editors for better performance
const LazyColorPicker = React.lazy(() =>
  import('@/packages/ui/components/common/ColorPicker')
);

const LazyIconPicker = React.lazy(() =>
  import('@/packages/ui/components/common/IconPicker')
);

const LazyFormValidation = React.lazy(() =>
  import('@/packages/ui/components/common/FormValidation')
);

// Basic property editors that are always loaded
const BasicTextEditor: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  validation?: (value: string) => string | null;
}> = React.memo(({ value, onChange, placeholder, validation }) => {
  const [error, setError] = useState<string | null>(null);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;

    if (validation) {
      const validationError = validation(newValue);
      setError(validationError);
    }

    onChange(newValue);
  }, [onChange, validation]);

  return (
    <div>
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '8px 12px',
          border: `1px solid ${error ? '#ef4444' : '#e5e7eb'}`,
          borderRadius: '6px',
          fontSize: '14px',
          outline: 'none',
          transition: 'border-color 0.2s ease',
        }}
        onFocus={(e) => {
          e.target.style.borderColor = error ? '#ef4444' : '#3b82f6';
        }}
        onBlur={(e) => {
          e.target.style.borderColor = error ? '#ef4444' : '#e5e7eb';
        }}
      />
      {error && (
        <div style={{
          fontSize: '12px',
          color: '#ef4444',
          marginTop: '4px',
        }}>
          {error}
        </div>
      )}
    </div>
  );
});

BasicTextEditor.displayName = 'BasicTextEditor';

const PropertyGroup: React.FC<{
  title: string;
  icon: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}> = React.memo(({ title, icon, expanded, onToggle, children }) => (
  <div style={{
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    marginBottom: '12px',
    overflow: 'hidden',
  }}>
    <button
      onClick={onToggle}
      style={{
        width: '100%',
        padding: '12px 16px',
        border: 'none',
        backgroundColor: '#f8fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500',
        color: '#374151',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>{icon}</span>
        <span>{title}</span>
      </div>
      <span style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}>
        ▼
      </span>
    </button>
    {expanded && (
      <div style={{ padding: '16px' }}>
        {children}
      </div>
    )}
  </div>
));

PropertyGroup.displayName = 'PropertyGroup';

const ComponentTypeSelector: React.FC<{
  currentType: string;
  onTypeChange: (type: string) => void;
  challengeTags?: string[];
}> = React.memo(({ currentType, onTypeChange, challengeTags }) => {
  const componentTypesByCategory = useMemo(() => ({
    'Compute & Infrastructure': [
      { value: 'server', label: 'Server' },
      { value: 'microservice', label: 'Microservice' },
      { value: 'serverless', label: 'Serverless' },
      { value: 'lambda', label: 'Lambda' },
      { value: 'cloud-function', label: 'Cloud Function' },
    ],
    'Containers & Orchestration': [
      { value: 'container', label: 'Container' },
      { value: 'docker', label: 'Docker' },
      { value: 'kubernetes', label: 'Kubernetes' },
    ],
    'Databases & Storage': [
      { value: 'database', label: 'Database' },
      { value: 'postgresql', label: 'PostgreSQL' },
      { value: 'mysql', label: 'MySQL' },
      { value: 'mongodb', label: 'MongoDB' },
      { value: 'redis', label: 'Redis' },
      { value: 'cache', label: 'Cache' },
      { value: 'storage', label: 'Storage' },
      { value: 's3', label: 'S3' },
      { value: 'blob-storage', label: 'Blob Storage' },
      { value: 'file-system', label: 'File System' },
    ],
    'Networking & Traffic': [
      { value: 'load-balancer', label: 'Load Balancer' },
      { value: 'api-gateway', label: 'API Gateway' },
      { value: 'cdn', label: 'CDN' },
      { value: 'firewall', label: 'Firewall' },
    ],
    'Messaging & Communication': [
      { value: 'message-queue', label: 'Message Queue' },
      { value: 'producer', label: 'Producer' },
      { value: 'consumer', label: 'Consumer' },
      { value: 'broker', label: 'Broker' },
      { value: 'dead-letter-queue', label: 'Dead Letter Queue' },
      { value: 'websocket', label: 'WebSocket' },
      { value: 'grpc', label: 'gRPC' },
    ],
    'APIs & Services': [
      { value: 'rest-api', label: 'REST API' },
      { value: 'graphql', label: 'GraphQL' },
      { value: 'webhook', label: 'Webhook' },
    ],
    'Client Applications': [
      { value: 'client', label: 'Client' },
      { value: 'web-app', label: 'Web App' },
      { value: 'mobile-app', label: 'Mobile App' },
      { value: 'desktop-app', label: 'Desktop App' },
      { value: 'iot-device', label: 'IoT Device' },
    ],
    'Security & Auth': [
      { value: 'security', label: 'Security' },
      { value: 'authentication', label: 'Authentication' },
      { value: 'authorization', label: 'Authorization' },
      { value: 'oauth', label: 'OAuth' },
      { value: 'jwt', label: 'JWT' },
    ],
    'Monitoring & Observability': [
      { value: 'monitoring', label: 'Monitoring' },
      { value: 'logging', label: 'Logging' },
      { value: 'metrics', label: 'Metrics' },
      { value: 'alerting', label: 'Alerting' },
      { value: 'elasticsearch', label: 'Elasticsearch' },
      { value: 'kibana', label: 'Kibana' },
    ],
    'Data Processing': [
      { value: 'data-warehouse', label: 'Data Warehouse' },
      { value: 'data-lake', label: 'Data Lake' },
      { value: 'etl', label: 'ETL' },
      { value: 'stream-processing', label: 'Stream Processing' },
    ],
    'Patterns & Architectures': [
      { value: 'event-sourcing', label: 'Event Sourcing' },
      { value: 'cqrs', label: 'CQRS' },
      { value: 'edge-computing', label: 'Edge Computing' },
    ],
    'Emerging Technologies': [
      { value: 'blockchain', label: 'Blockchain' },
      { value: 'ai-ml', label: 'AI/ML' },
    ],
  }), []);

  return (
    <select
      value={currentType}
      onChange={(e) => onTypeChange(e.target.value)}
      style={{
        width: '100%',
        padding: '8px 12px',
        border: '1px solid #e5e7eb',
        borderRadius: '6px',
        fontSize: '14px',
        backgroundColor: 'white',
        outline: 'none',
      }}
    >
      {Object.entries(componentTypesByCategory).map(([category, types]) => (
        <optgroup key={category} label={category}>
          {types.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
});

ComponentTypeSelector.displayName = 'ComponentTypeSelector';

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  selectedComponent,
  components,
  onLabelChange,
  onTypeChange,
  onDescriptionChange,
  onLayerChange,
  onPositionChange,
  onDelete,
  onDuplicate,
  onShowLabelToggle,
  onStickerToggle,
  onStickerEmojiChange,
  onBgColorChange,
  onNodeBgChange,
  challengeTags,
  className,
}) => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    basic: true,
    appearance: false,
    advanced: false,
    actions: false,
  });

  // Preload components that might be used
  usePreloadComponents(['react-hook-form', 'zod']);

  // Find selected component with memoization
  const component = useMemo(() => {
    if (!selectedComponent) return null;
    return components.find(c => c.id === selectedComponent) || null;
  }, [selectedComponent, components]);

  // Stable callbacks
  const stableCallbacks = useMemo(() => ({
    onLabelChange: onLabelChange || (() => {}),
    onTypeChange: onTypeChange || (() => {}),
    onDescriptionChange: onDescriptionChange || (() => {}),
    onLayerChange: onLayerChange || (() => {}),
    onPositionChange: onPositionChange || (() => {}),
    onDelete: onDelete || (() => {}),
    onDuplicate: onDuplicate || (() => {}),
    onShowLabelToggle: onShowLabelToggle || (() => {}),
    onStickerToggle: onStickerToggle || (() => {}),
    onStickerEmojiChange: onStickerEmojiChange || (() => {}),
    onBgColorChange: onBgColorChange || (() => {}),
    onNodeBgChange: onNodeBgChange || (() => {}),
  }), [onLabelChange, onTypeChange, onDescriptionChange, onLayerChange, onPositionChange, onDelete, onDuplicate, onShowLabelToggle, onStickerToggle, onStickerEmojiChange, onBgColorChange, onNodeBgChange]);

  // Validation functions
  const validateLabel = useCallback((value: string): string | null => {
    if (value.trim().length === 0) {
      return 'Label cannot be empty';
    }
    if (value.length > 50) {
      return 'Label too long (max 50 characters)';
    }
    return null;
  }, []);

  // Toggle section expansion
  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  }, []);

  // Handle property changes
  const handleLabelChange = useCallback((newLabel: string) => {
    if (component && stableCallbacks.onLabelChange) {
      stableCallbacks.onLabelChange(component.id, newLabel);
    }
  }, [component, stableCallbacks.onLabelChange]);

  const handleTypeChange = useCallback((newType: string) => {
    if (component && stableCallbacks.onTypeChange) {
      stableCallbacks.onTypeChange(component.id, newType);
    }
  }, [component, stableCallbacks.onTypeChange]);

  const handleDelete = useCallback(() => {
    if (component && stableCallbacks.onDelete) {
      stableCallbacks.onDelete(component.id);
    }
  }, [component, stableCallbacks.onDelete]);

  // Performance tracking
  React.useEffect(() => {
    if (import.meta.env.DEV) {
      componentOptimizer.recordSample({
        componentId: 'PropertiesPanel',
        duration: performance.now(),
        timestamp: Date.now(),
        commitType: 'update',
        propsChanged: ['selectedComponent', 'components'],
      });
    }
  }, [selectedComponent, components]);

  const containerStyle = useMemo(() => ({
    height: '100%',
    overflowY: 'auto' as const,
    padding: '16px',
    backgroundColor: '#ffffff',
  }), []);

  // No selection state
  if (!component) {
    return (
      <div
        className={`properties-panel ${className || ''}`}
        style={containerStyle}
        role="complementary"
        aria-label="Component properties"
      >
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '200px',
          color: '#6b7280',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎯</div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600' }}>
            No Component Selected
          </h3>
          <p style={{ margin: 0, fontSize: '14px' }}>
            Select a component to view and edit its properties
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`properties-panel ${className || ''}`}
      style={containerStyle}
      role="complementary"
      aria-label="Component properties"
    >
      {/* Header */}
      <div style={{
        marginBottom: '24px',
        padding: '16px',
        backgroundColor: '#f8fafc',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
      }}>
        <h2 style={{
          fontSize: '18px',
          fontWeight: '600',
          color: '#1f2937',
          margin: '0 0 8px 0',
        }}>
          Component Properties
        </h2>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '14px',
          color: '#6b7280',
        }}>
          <span>{component.type}</span>
          <span>•</span>
          <span>ID: {component.id.slice(0, 8)}...</span>
        </div>
      </div>

      {/* Basic Properties */}
      <PropertyGroup
        title="Basic Properties"
        icon="📝"
        expanded={expandedSections.basic}
        onToggle={() => toggleSection('basic')}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{
              display: 'block',
              marginBottom: '6px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
            }}>
              Label
            </label>
            <BasicTextEditor
              value={component.label}
              onChange={handleLabelChange}
              placeholder="Enter component label"
              validation={validateLabel}
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              marginBottom: '6px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
            }}>
              Type
            </label>
            <ComponentTypeSelector
              currentType={component.type}
              onTypeChange={handleTypeChange}
              challengeTags={challengeTags}
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              marginBottom: '6px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
            }}>
              Description
            </label>
            <textarea
              value={component.description || ''}
              onChange={(e) => {
                if (stableCallbacks.onDescriptionChange) {
                  stableCallbacks.onDescriptionChange(component.id, e.target.value);
                }
              }}
              placeholder="Enter component description"
              rows={3}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '14px',
                outline: 'none',
                resize: 'vertical',
                minHeight: '80px',
              }}
            />
          </div>
        </div>
      </PropertyGroup>

      {/* Appearance Properties */}
      <PropertyGroup
        title="Appearance"
        icon="🎨"
        expanded={expandedSections.appearance}
        onToggle={() => toggleSection('appearance')}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{
              display: 'block',
              marginBottom: '6px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
            }}>
              Background Color
            </label>
            <Suspense fallback={<div>Loading color picker...</div>}>
              <LazyColorPicker
                value="#ffffff"
                onChange={(color: string) => stableCallbacks.onBgColorChange(component.id, color)}
              />
            </Suspense>
          </div>

          <div>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              cursor: 'pointer',
            }}>
              <input
                type="checkbox"
                checked={component.properties?.showLabel !== false}
                onChange={() => stableCallbacks.onShowLabelToggle(component.id)}
                style={{ cursor: 'pointer' }}
              />
              Show Label
            </label>
          </div>

          <div>
            <label style={{
              display: 'block',
              marginBottom: '6px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
            }}>
              Icon/Emoji
            </label>
            <Suspense fallback={<div>Loading icon picker...</div>}>
              <LazyIconPicker
                value="🔧"
                onChange={(emoji: string) => stableCallbacks.onStickerEmojiChange(component.id, emoji)}
              />
            </Suspense>
          </div>
        </div>
      </PropertyGroup>

      {/* Advanced Properties */}
      <PropertyGroup
        title="Advanced"
        icon="⚙️"
        expanded={expandedSections.advanced}
        onToggle={() => toggleSection('advanced')}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{
              display: 'block',
              marginBottom: '6px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
            }}>
              Layer ID
            </label>
            <BasicTextEditor
              value={component.layerId || 'default'}
              onChange={(value) => {
                if (stableCallbacks.onLayerChange) {
                  stableCallbacks.onLayerChange(component.id, value);
                }
              }}
              placeholder="default"
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              marginBottom: '6px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
            }}>
              Position
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ flex: 1 }}>
                <input
                  type="number"
                  value={Math.round(component.x)}
                  onChange={(e) => {
                    const newX = parseFloat(e.target.value) || 0;
                    if (stableCallbacks.onPositionChange) {
                      stableCallbacks.onPositionChange(component.id, newX, component.y);
                    }
                  }}
                  placeholder="X"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <input
                  type="number"
                  value={Math.round(component.y)}
                  onChange={(e) => {
                    const newY = parseFloat(e.target.value) || 0;
                    if (stableCallbacks.onPositionChange) {
                      stableCallbacks.onPositionChange(component.id, component.x, newY);
                    }
                  }}
                  placeholder="Y"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </PropertyGroup>

      {/* Actions */}
      <PropertyGroup
        title="Actions"
        icon="🎬"
        expanded={expandedSections.actions}
        onToggle={() => toggleSection('actions')}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            onClick={() => {
              if (stableCallbacks.onDuplicate) {
                stableCallbacks.onDuplicate(component.id);
              }
            }}
            style={{
              padding: '10px 16px',
              border: '1px solid #3b82f6',
              backgroundColor: '#ffffff',
              color: '#3b82f6',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#eff6ff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#ffffff';
            }}
          >
            📋 Duplicate Component
          </button>

          <button
            onClick={handleDelete}
            style={{
              padding: '10px 16px',
              border: '1px solid #ef4444',
              backgroundColor: '#ffffff',
              color: '#ef4444',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#fef2f2';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#ffffff';
            }}
          >
            🗑️ Delete Component
          </button>
        </div>
      </PropertyGroup>

      {/* Performance indicator in development */}
      {import.meta.env.DEV && (
        <div style={{
          position: 'fixed',
          bottom: '40px',
          right: '16px',
          background: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '4px 8px',
          fontSize: '10px',
          borderRadius: '4px',
          pointerEvents: 'none',
          zIndex: 1000,
        }}>
          Properties Panel - {component.type}
        </div>
      )}
    </div>
  );
};

// HOC for automatic React Profiler integration
export const ProfiledPropertiesPanel = reactProfilerIntegration.withHotLeafProfiling(
  PropertiesPanel,
  'PropertiesPanel'
);

export default PropertiesPanel;