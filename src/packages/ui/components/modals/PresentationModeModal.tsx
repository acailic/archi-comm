/**
 * src/packages/ui/components/modals/PresentationModeModal.tsx
 * Modal for creating and managing presentation slides
 * Allows users to set up guided walkthroughs of their canvas diagrams
 * RELEVANT FILES: usePresentation.ts, presentation-utils.ts, NavigationBreadcrumbs.tsx, canvasStore.ts
 */

import React, { useState } from 'react';
import type { Viewport } from '@xyflow/react';
import type { PresentationSlide } from '@/shared/contracts';
import { usePresentation } from '@/packages/canvas/hooks/usePresentation';

export interface PresentationModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentViewport?: Viewport;
}

export const PresentationModeModal: React.FC<PresentationModeModalProps> = ({
  isOpen,
  onClose,
  currentViewport,
}) => {
  const {
    slides,
    currentSlide,
    isActive,
    createSlide,
    updateSlide,
    deleteSlide,
    reorderSlides,
    startPresentation,
    endPresentation,
  } = usePresentation();

  const [editingSlideId, setEditingSlideId] = useState<string | null>(null);
  const [slideName, setSlideName] = useState('');
  const [slideNotes, setSlideNotes] = useState('');

  if (!isOpen) {
    return null;
  }

  const handleCreateSlide = () => {
    if (!currentViewport) return;

    const name = slideName.trim() || `Slide ${slides.length + 1}`;
    createSlide(name, currentViewport, [], slideNotes);
    setSlideName('');
    setSlideNotes('');
  };

  const handleStartPresentation = () => {
    startPresentation(slides);
    onClose();
  };

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
          maxWidth: '700px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: 600 }}>
            Presentation Mode
          </h2>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
            Create a guided walkthrough of your architecture diagram
          </p>
        </div>

        {/* Slides List */}
        {slides.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>
              Slides ({slides.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {slides.map((slide, index) => (
                <div
                  key={slide.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    backgroundColor: currentSlide?.id === slide.id ? '#eff6ff' : 'white',
                  }}
                >
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#6b7280', minWidth: '24px' }}>
                    {index + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, marginBottom: '2px' }}>{slide.name}</div>
                    {slide.notes && (
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>{slide.notes}</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      onClick={() => {
                        setEditingSlideId(slide.id);
                        setSlideName(slide.name);
                        setSlideNotes(slide.notes || '');
                      }}
                      style={{
                        padding: '4px 8px',
                        border: '1px solid #d1d5db',
                        backgroundColor: 'white',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteSlide(slide.id)}
                      style={{
                        padding: '4px 8px',
                        border: '1px solid #fecaca',
                        backgroundColor: 'white',
                        color: '#dc2626',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Create New Slide */}
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>
            {editingSlideId ? 'Edit Slide' : 'Add New Slide'}
          </h3>
          <div style={{ marginBottom: '12px' }}>
            <label
              htmlFor="slide-name"
              style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}
            >
              Slide Name
            </label>
            <input
              id="slide-name"
              type="text"
              value={slideName}
              onChange={(e) => setSlideName(e.target.value)}
              placeholder="Overview, Architecture Details, etc."
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
              }}
            />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label
              htmlFor="slide-notes"
              style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}
            >
              Notes (optional)
            </label>
            <textarea
              id="slide-notes"
              value={slideNotes}
              onChange={(e) => setSlideNotes(e.target.value)}
              placeholder="Speaker notes for this slide..."
              style={{
                width: '100%',
                height: '80px',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
            />
          </div>
          <button
            onClick={handleCreateSlide}
            disabled={!currentViewport}
            style={{
              width: '100%',
              padding: '10px',
              border: 'none',
              backgroundColor: currentViewport ? '#3b82f6' : '#9ca3af',
              color: 'white',
              borderRadius: '6px',
              cursor: currentViewport ? 'pointer' : 'not-allowed',
              fontWeight: 600,
              fontSize: '14px',
            }}
          >
            {editingSlideId ? 'Update Slide' : 'Capture Current View as Slide'}
          </button>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px', paddingTop: '12px', borderTop: '1px solid #e5e7eb' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '12px',
              border: '1px solid #d1d5db',
              backgroundColor: 'white',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Close
          </button>
          {slides.length > 0 && (
            <button
              onClick={handleStartPresentation}
              style={{
                flex: 1,
                padding: '12px',
                border: 'none',
                backgroundColor: '#10b981',
                color: 'white',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Start Presentation
            </button>
          )}
        </div>

        {/* Help Text */}
        {slides.length === 0 && (
          <div
            style={{
              marginTop: '16px',
              padding: '12px',
              backgroundColor: '#f9fafb',
              borderRadius: '8px',
              fontSize: '13px',
              color: '#6b7280',
            }}
          >
            Tip: Navigate to the canvas view you want to present, then click "Capture Current View as Slide" to add it to your presentation.
          </div>
        )}
      </div>
    </div>
  );
};
