/**
 * src/packages/ui/components/canvas/AIAssistantPanel.tsx
 * AI assistant panel for canvas operations and diagram generation
 * Provides text-to-diagram and intelligent suggestions
 * RELEVANT FILES: useCanvasAI.ts, canvasStore.ts, shared/contracts/index.ts
 */

import React, { useState } from 'react';
import { useCanvasAI } from '@/packages/canvas/hooks/useCanvasAI';
import { toast } from 'sonner';

export interface AIAssistantPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AIAssistantPanel: React.FC<AIAssistantPanelProps> = ({
  isOpen,
  onClose,
}) => {
  const [prompt, setPrompt] = useState('');
  const {
    getDesignSuggestions,
    analyzeDesign,
    runInstruction,
    applyInstruction,
    isGenerating,
  } = useCanvasAI();

  if (!isOpen) {
    return null;
  }

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) {
      return;
    }

    try {
      const instruction = await runInstruction(prompt);
      const result = applyInstruction(instruction);

      if (result.success) {
        toast.success('Canvas updated with AI', {
          description: result.message,
        });
        setPrompt('');
        if (result.warnings.length > 0) {
          toast.warning('Review AI notes', {
            description: result.warnings.slice(0, 2).join(' '),
          });
        }
      } else {
        toast.warning('No changes applied', {
          description:
            result.warnings[0] ||
            'The AI did not produce actionable changes for this instruction.',
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error('Failed to process AI instruction', {
        description: message,
      });
    }
  };

  const handleGetSuggestions = async () => {
    try {
      const result = await getDesignSuggestions();
      if (result.success) {
        toast.success('AI Suggestions', {
          description: result.message,
        });
      } else {
        toast.error('Failed to get suggestions', {
          description: result.error || result.message,
        });
      }
    } catch (error) {
      console.error('Failed to get suggestions:', error);
      toast.error('Failed to get suggestions');
    }
  };

  const handleAnalyzeDesign = async () => {
    try {
      const result = await analyzeDesign();
      if (result.success) {
        toast.success('Design Analysis', {
          description: result.message,
        });
      } else {
        toast.error('Failed to analyze design', {
          description: result.error || result.message,
        });
      }
    } catch (error) {
      console.error('Failed to analyze design:', error);
      toast.error('Failed to analyze design');
    }
  };

  return (
    <div
      className="ai-assistant-panel"
      style={{
        position: 'absolute',
        bottom: 20,
        right: 20,
        width: 360,
        maxHeight: '50vh',
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px' }}>🤖</span>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
            AI Assistant
          </h3>
        </div>
        <button
          onClick={onClose}
          style={{
            padding: '4px 8px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontSize: '20px',
          }}
        >
          ×
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>
        <div style={{ marginBottom: '12px' }}>
          <label
            htmlFor="ai-prompt"
            style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: 500,
              color: '#374151',
            }}
          >
            Describe your diagram
          </label>
          <textarea
            id="ai-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="E.g., Create a microservices architecture with an API gateway, 3 services, and a database..."
            style={{
              width: '100%',
              height: '120px',
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

        <button
          onClick={handleGenerate}
          disabled={!prompt.trim() || isGenerating}
          style={{
            width: '100%',
            padding: '12px',
            border: 'none',
            backgroundColor: isGenerating ? '#9ca3af' : '#3b82f6',
            color: 'white',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: isGenerating ? 'not-allowed' : 'pointer',
            marginBottom: '12px',
          }}
        >
          {isGenerating ? 'Generating...' : 'Generate Diagram'}
        </button>

        {/* Additional AI Actions */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <button
            onClick={handleGetSuggestions}
            disabled={isGenerating}
            style={{
              flex: 1,
              padding: '8px',
              border: '1px solid #d1d5db',
              backgroundColor: 'white',
              borderRadius: '6px',
              fontSize: '12px',
              cursor: isGenerating ? 'not-allowed' : 'pointer',
            }}
          >
            Get Suggestions
          </button>
          <button
            onClick={handleAnalyzeDesign}
            disabled={isGenerating}
            style={{
              flex: 1,
              padding: '8px',
              border: '1px solid #d1d5db',
              backgroundColor: 'white',
              borderRadius: '6px',
              fontSize: '12px',
              cursor: isGenerating ? 'not-allowed' : 'pointer',
            }}
          >
            Analyze Design
          </button>
        </div>

        {/* TODO: Add features:
          - Suggestion cards
          - Pattern detection
          - Optimization recommendations
          - Recent generations history
        */}
      </div>
    </div>
  );
};
