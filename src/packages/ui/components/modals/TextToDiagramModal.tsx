/**
 * src/packages/ui/components/modals/TextToDiagramModal.tsx
 * Modal for AI-powered text-to-diagram generation
 * Allows users to describe architecture and generate diagram automatically
 * RELEVANT FILES: useCanvasAI.ts, template-library.ts, AIAssistantPanel.tsx, canvasStore.ts
 */

import React, { useState } from 'react';
import { useCanvasAI } from '@/packages/canvas/hooks/useCanvasAI';
import { toast } from 'sonner';
import { getAllTemplates, type DiagramTemplate, applyTemplateToCanvas, generateCustomTemplate } from '@/lib/canvas/template-library';
import { useCanvasActions } from '@/stores/canvasStore';
import { useCanvasStore } from '@/stores/canvasStore';

export interface TextToDiagramModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TextToDiagramModal: React.FC<TextToDiagramModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [prompt, setPrompt] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<DiagramTemplate | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);

  const { generateDiagramFromText, applySuggestion, isGenerating } = useCanvasAI();
  const canvasActions = useCanvasActions();

  if (!isOpen) {
    return null;
  }

  const handleGenerate = async () => {
    if ((!prompt.trim() && !selectedTemplate) || isGenerating) return;

    try {
      if (selectedTemplate) {
        // Apply selected template to canvas
        const currentState = useCanvasStore.getState();
        const result = applyTemplateToCanvas(
          selectedTemplate,
          currentState.components,
          currentState.connections
        );

        canvasActions.updateCanvasData(result);
        toast.success('Template applied!', {
          description: `Applied "${selectedTemplate.name}" template with ${selectedTemplate.components.length} components`,
        });
        setSelectedTemplate(null);
        onClose();
      } else {
        // First try to generate a custom template based on the description
        const customTemplate = generateCustomTemplate(prompt);
        if (customTemplate) {
          const currentState = useCanvasStore.getState();
          const result = applyTemplateToCanvas(
            customTemplate,
            currentState.components,
            currentState.connections
          );

          canvasActions.updateCanvasData(result);
          toast.success('Custom template generated!', {
            description: `Created "${customTemplate.name}" based on your description`,
          });
          setPrompt('');
          onClose();
        } else {
          // Fall back to AI generation
          const result = await generateDiagramFromText(prompt);
          if (result.success && result.suggestions && result.suggestions.length > 0) {
            // Apply the first suggestion
            const applyResult = applySuggestion(result.suggestions[0]);
            if (applyResult.success) {
              toast.success('Diagram generated successfully!', {
                description: result.suggestions[0].explanation,
              });
              if (applyResult.warnings && applyResult.warnings.length > 0) {
                toast.warning('Review AI adjustments', {
                  description: applyResult.warnings.slice(0, 2).join(' '),
                });
              }
              setPrompt('');
              onClose();
            } else {
              toast.error('Failed to apply diagram');
            }
          } else {
            toast.error('Failed to generate diagram', {
              description: result.error || result.message,
            });
          }
        }
      }
    } catch (error) {
      console.error('Failed to generate diagram:', error);
      toast.error('Failed to generate diagram');
    }
  };

  const templates = getAllTemplates();

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '600px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: 600 }}>
            Generate Diagram
          </h2>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
            Describe your architecture or choose a template
          </p>
        </div>

        {/* Toggle between text and templates */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button
            onClick={() => setShowTemplates(false)}
            style={{
              flex: 1,
              padding: '8px',
              border: 'none',
              backgroundColor: !showTemplates ? '#3b82f6' : '#f3f4f6',
              color: !showTemplates ? 'white' : '#374151',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Text Description
          </button>
          <button
            onClick={() => setShowTemplates(true)}
            style={{
              flex: 1,
              padding: '8px',
              border: 'none',
              backgroundColor: showTemplates ? '#3b82f6' : '#f3f4f6',
              color: showTemplates ? 'white' : '#374151',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Templates
          </button>
        </div>

        {/* Content */}
        {!showTemplates ? (
          <div>
            <label
              htmlFor="diagram-prompt"
              style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: 500,
                color: '#374151',
              }}
            >
              Describe your architecture
            </label>
            <textarea
              id="diagram-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="E.g., Create a microservices architecture with an API gateway, user service, order service, payment service, and a message queue..."
              style={{
                width: '100%',
                height: '150px',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
              disabled={isGenerating}
            />
          </div>
        ) : (
          <div>
            <label style={{ display: 'block', marginBottom: '12px', fontSize: '14px', fontWeight: 500 }}>
              Choose a template
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflow: 'auto' }}>
              {templates.map((template) => (
                <div
                  key={template.id}
                  onClick={() => setSelectedTemplate(template)}
                  style={{
                    padding: '12px',
                    border: selectedTemplate?.id === template.id ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    backgroundColor: selectedTemplate?.id === template.id ? '#eff6ff' : 'white',
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: '4px' }}>{template.name}</div>
                  <div style={{ fontSize: '13px', color: '#6b7280' }}>{template.description}</div>
                  <div style={{ marginTop: '4px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {template.tags.map(tag => (
                      <span
                        key={tag}
                        style={{
                          padding: '2px 6px',
                          fontSize: '11px',
                          backgroundColor: '#e5e7eb',
                          borderRadius: '4px',
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
          <button
            onClick={onClose}
            disabled={isGenerating}
            style={{
              flex: 1,
              padding: '12px',
              border: '1px solid #d1d5db',
              backgroundColor: 'white',
              borderRadius: '6px',
              cursor: isGenerating ? 'not-allowed' : 'pointer',
              fontWeight: 600,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={(!prompt.trim() && !selectedTemplate) || isGenerating}
            style={{
              flex: 1,
              padding: '12px',
              border: 'none',
              backgroundColor: isGenerating ? '#9ca3af' : '#3b82f6',
              color: 'white',
              borderRadius: '6px',
              cursor: isGenerating || (!prompt.trim() && !selectedTemplate) ? 'not-allowed' : 'pointer',
              fontWeight: 600,
            }}
          >
            {isGenerating ? 'Generating...' : 'Generate'}
          </button>
        </div>
      </div>
    </div>
  );
};
