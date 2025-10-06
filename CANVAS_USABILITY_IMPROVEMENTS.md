# Canvas Usability Improvements

## Purpose

This document outlines comprehensive usability enhancements for the ArchiComm canvas system. These features focus on improving productivity, workflow efficiency, and user experience when working with complex system architecture diagrams.

## Overview

The ArchiComm canvas system is feature-rich but was missing several key usability enhancements that would significantly improve the user experience. This implementation adds essential operations, workflow enhancements, and advanced features to make the canvas more productive and easier to use.

### User Benefits

- **Faster component creation**: Quick duplication and template library
- **Easier organization**: Grouping, alignment, and bulk operations
- **Better navigation**: Search, zoom to selection, and smart guides
- **Reduced errors**: Component locking and visual feedback
- **Improved workflows**: Keyboard shortcuts and context menus

### Implementation Phases

**Phase 1: Essential Operations** (Implemented)

- Component duplication (Ctrl/Cmd+D)
- Multi-select with bulk operations
- Alignment tools (align left/right/top/bottom/center, distribute)
- Component search/filter in palette

**Phase 2: Workflow Enhancements** (Implemented)

- Component grouping/ungrouping
- Smart alignment guides (visual snap feedback)
- Zoom to selection/fit selected (shortcut in place; viewport fit pending)
- Enhanced context menu with quick actions
- Component locking/unlocking

**Phase 3: Advanced Features** (Future)

- Component templates library with categories
- Auto-arrange by type/layer
- Connection templates
- Keyboard shortcuts panel improvements
- Component notes/inline documentation

## Feature Categories

### 1. Essential Operations

#### Component Duplication

- **Purpose**: Clone components quickly with keyboard shortcut
- **Usage**: Select components and press Ctrl/Cmd+D
- **Features**:
  - Maintains all properties (type, size, connections)
  - Applies smart offset (20px right and down)
  - Adds "(Copy)" suffix to labels
  - Works with single or multiple components

#### Multi-Select

- **Purpose**: Select multiple components for bulk operations
- **Usage**:
  - Drag selection box around components
  - Shift+Click to toggle individual components
  - Ctrl/Cmd+A to select all components
- **Features**:
  - Visual selection box with dashed border
  - Selected components highlighted
  - Bulk move, delete, align operations

#### Bulk Operations

- **Purpose**: Perform actions on multiple components at once
- **Supported Operations**:
  - Move (drag any selected component)
  - Delete (Del key removes all selected)
  - Alignment (see alignment tools)
  - Grouping (Ctrl/Cmd+G creates group)
  - Locking (Ctrl/Cmd+Alt+L locks all selected)

#### Alignment Tools

- **Purpose**: Precisely align multiple components
- **Alignment Options**:
  - Align Left: Align to leftmost component
  - Align Right: Align to rightmost component
  - Align Top: Align to topmost component
  - Align Bottom: Align to bottommost component
  - Center Horizontally: Align to horizontal center
  - Center Vertically: Align to vertical center
- **Distribution Options**:
  - Distribute Horizontally: Even spacing between components
  - Distribute Vertically: Even spacing between components
- **Requirements**: 2+ components for alignment, 3+ for distribution

#### Component Search

- **Purpose**: Quickly find components in palette
- **Features**:
  - Real-time search as you type
  - Searches component name, type, and description
  - Category filter dropdown
  - Clear button to reset search
  - Component count per category

### 2. Workflow Enhancements

#### Component Grouping

- **Purpose**: Organize related components together
- **Usage**:
  - Select components and press Ctrl/Cmd+G to group
  - Press Ctrl/Cmd+Shift+G to ungroup
- **Features**:
  - Visual boundary around grouped components
  - Group name and component count display
  - Lock/unlock entire groups
  - Ungroup button in group header
  - Purple dashed border (red when locked)

#### Smart Alignment Guides

- **Purpose**: Visual feedback when components align during drag
- **Features**:
  - Blue guide lines appear when components align
  - Shows center-to-center alignment
  - Automatically hides after 1 second
  - Works with zoom/pan transformations
  - Can be toggled on/off
  - Visibility managed centrally in the canvas store for consistent behavior

#### Zoom to Selection

- **Purpose**: Focus view on selected components
- **Usage**: Press Ctrl/Cmd+2 with components selected
- **Features**:
  - Dispatches zoom-to-selection shortcut event
  - Viewport fit handler wiring is in progress; falls back to current zoom until completed
  - Maintains project selection context for future fit implementation

#### Enhanced Context Menu

- **Purpose**: Quick access to common actions
- **Usage**: Right-click on components
- **Implementation Status**: Completed with keyboard navigation, focus management, and accessibility features
- **Actions**:
  - Duplicate (Ctrl/Cmd+D)
  - Lock/Unlock (Ctrl/Cmd+Alt+L)
  - Group (Ctrl/Cmd+G) - when multiple selected
  - Alignment options (left, right, top, bottom) - when 2+ selected
  - Delete (Del)
- **Features**:
  - Keyboard navigation (arrow keys, Enter, Escape)
  - Focus trap and restoration
  - ARIA semantics for screen readers
  - Disabled state for unavailable actions
  - Multi-select awareness

#### Component Locking

- **Purpose**: Prevent accidental moves/edits
- **Usage**:
  - Select components and press Ctrl/Cmd+Alt+L to lock
  - Press Ctrl/Cmd+Alt+Shift+L to unlock
- **Features**:
  - Locked components cannot be moved
  - Visual indication (different border color)
  - Toast notification when attempting to move locked component
  - Lock/unlock individual components or groups

### 3. Advanced Features (Future Implementations)

#### Template Library

- **Purpose**: Organized component presets with search
- **Features**:
  - Categorized templates (Servers, Databases, etc.)
  - Search by name, category, tags
  - Popularity-based sorting
  - Recently used tracking

#### Auto-Arrange

- **Purpose**: Smart layout by type/layer
- **Features**:
  - Group by component type
  - Layered arrangement (UI → Services → Data)
  - Automatic spacing and alignment

#### Connection Templates

- **Purpose**: Quick connection patterns
- **Features**:
  - Common connection types (Request/Response, Pub/Sub)
  - Connection presets with labeling
  - Automatic routing optimization

#### Enhanced Keyboard Shortcuts

- **Purpose**: Improved shortcuts reference
- **Features**:
  - Searchable shortcuts panel
  - Context-sensitive shortcuts
  - Custom shortcut configuration

#### Component Notes

- **Purpose**: Inline documentation
- **Features**:
  - Rich text notes on components
  - Markdown support
  - Export notes with diagrams

## Implementation Status

### ✅ Completed Features

- [x] ComponentGroup interface
- [x] SelectionState interface
- [x] AlignmentGuide interface
- [x] ComponentTemplate interface
- [x] Extended DesignComponent with groupId, locked, notes, tags
- [x] Multi-select state management
- [x] Component duplication action
- [x] Alignment actions (left, right, top, bottom, center-h, center-v)
- [x] Distribution actions (horizontal, vertical)
- [x] Grouping/ungrouping actions
- [x] Component locking actions
- [x] Search/filter actions
- [x] AlignmentToolbar component
- [x] SelectionBox component
- [x] ComponentGroupOverlay component
- [x] AlignmentGuides component
- [x] ComponentPaletteSearch component
- [x] Keyboard shortcuts integration
- [x] Multi-select interaction handling
- [x] Canvas content integration
- [x] Component exports
- [x] Comprehensive test suite
- [x] Context menu with keyboard navigation and accessibility
- [x] Focus management and restoration
- [x] Locked component filtering in interactions

### 🚧 In Progress Features

- [ ] Zoom to selection ReactFlow viewport integration (event handler in place, fitBounds wiring pending)
- [ ] Alignment guide detection optimization (currently O(n), spatial indexing planned)

### 📋 Planned Features

- [ ] Component templates library
- [ ] Auto-arrange algorithms
- [ ] Connection templates
- [ ] Enhanced shortcuts panel
- [ ] Component notes system

## Usage Examples

### Basic Multi-Select Workflow

```typescript
// Select multiple components
canvasActions.setSelectedComponents(["comp-1", "comp-2", "comp-3"]);

// Or use drag selection box
// User drags from (0,0) to (200,200)
canvasActions.setSelectionBox({ x: 0, y: 0, width: 200, height: 200 });

// Align selected components
canvasActions.alignComponents(["comp-1", "comp-2", "comp-3"], "left");
```

### Component Duplication

```typescript
// Duplicate selected components
const selectedIds = useSelectedComponentIds();
canvasActions.duplicateComponents(selectedIds, { x: 30, y: 30 });
```

### Component Grouping

```typescript
// Group components
const group = canvasActions.groupComponents(
  ["comp-1", "comp-2"],
  "Server Group",
);

// Ungroup later
canvasActions.ungroupComponents(group.id);
```

### Search and Filter

```typescript
// Search components
canvasActions.setComponentSearchQuery("server");

// Filter by category
canvasActions.setComponentFilterCategory("database");

// Get filtered results
const filteredComponents = useFilteredComponents();
```

## Testing Checklist

### Unit Tests

- [x] Multi-select state management
- [x] Component duplication logic
- [x] Alignment calculations
- [x] Distribution algorithms
- [x] Grouping operations
- [x] Locking mechanisms
- [x] Search/filter functionality

### Integration Tests

- [x] AlignmentToolbar rendering and interactions
- [x] SelectionBox visual feedback
- [x] ComponentGroupOverlay rendering
- [x] AlignmentGuides display logic
- [x] ComponentPaletteSearch filtering
- [x] Keyboard shortcut handling

### E2E Tests

- [ ] Complete multi-select workflow
- [ ] Drag-to-select with visual feedback
- [ ] Alignment toolbar usage
- [ ] Grouping workflow with visual boundaries
- [ ] Search and filter in component palette
- [ ] Keyboard shortcuts end-to-end

### Accessibility Tests

- [ ] Keyboard navigation for all features
- [ ] Screen reader compatibility
- [ ] Focus management during multi-select
- [ ] ARIA labels for toolbar buttons

## Migration Guide

### Backward Compatibility

All new features are **completely additive** and do not break existing functionality:

- Existing canvas modes remain unchanged
- Current component structure is preserved
- All existing keyboard shortcuts continue to work
- No changes to existing APIs or data formats

### New Optional Properties

New optional properties added to `DesignComponent`:

- `groupId?: string` - Reference to parent group
- `locked?: boolean` - Prevents accidental moves
- `notes?: string` - Inline documentation
- `tags?: string[]` - For search/filter

### State Migration

Store automatically initializes new state properties with sensible defaults:

- `selectedComponentIds: []`
- `componentGroups: []`
- `alignmentGuides: []`
- `lockedComponentIds: new Set()`

### Feature Adoption

Users can adopt new features gradually:

1. Multi-select works immediately with Shift+Click
2. Alignment toolbar appears when components selected
3. Search functionality available in component palette
4. Keyboard shortcuts provide quick access to all features

## Performance Considerations

### Optimizations Implemented

- Memoized component selectors to prevent unnecessary re-renders
- Efficient collision detection for selection box
- Debounced search to reduce computation
- Lazy loading of alignment guides
- Viewport-aware rendering for overlays

### Memory Usage

- Component groups store only IDs, not full component data
- Alignment guides auto-cleanup after display timeout
- Search indexing uses efficient string matching
- Selection state uses Set for O(1) lookup

### Rendering Performance

- Selection box renders only when dragging
- Group overlays only render when groups exist
- Alignment guides use CSS transforms for smooth animation
- Toolbar components conditionally render based on selection

This implementation provides a solid foundation for productive canvas workflows while maintaining the existing ArchiComm architecture and design patterns.
