# ArchiComm Scenario System Documentation

## Overview

The ArchiComm Scenario System is a powerful development tool that allows developers to preview, test, and debug UI components in isolation. It provides a comprehensive environment for testing different component states, props, and configurations without the need to navigate through the entire application.

## Getting Started

### Accessing the Scenario Viewer

The scenario viewer is only available in development mode and can be accessed in two ways:

1. **URL Navigation**: Navigate directly to `/dev/scenarios` in your browser
2. **Keyboard Shortcut**: Press `Ctrl+Shift+S` (or `Cmd+Shift+S` on Mac) from anywhere in the application

### First Time Setup

1. Ensure you're running the application in development mode (`npm run dev`)
2. Open your browser and navigate to `http://localhost:5173/dev/scenarios`
3. You should see the Scenario Viewer interface with available component categories

## Keyboard Shortcuts Reference

### Global Development Shortcuts
- `Ctrl+Shift+S` - Open/toggle scenario viewer
- `Ctrl+Shift+D` - Toggle demo mode (auto-cycles through scenarios)
- `Ctrl+Shift+R` - Reset scenario viewer to initial state
- `Ctrl+Shift+I` - Toggle state inspector panel
- `Ctrl+Shift+P` - Toggle props viewer panel

### Scenario Navigation Shortcuts
- `Arrow Keys` - Navigate between scenarios (Up/Down or Left/Right)
- `Escape` - Clear current scenario selection
- `Number Keys (1-9)` - Quick select category by index
- `Ctrl+F` - Focus search input for filtering scenarios

### Utility Shortcuts
- `Demo Mode` - Automatically cycles through all scenarios every 3 seconds
- `Search` - Filter scenarios by name, description, or category

## Features

### 1. Component Preview
- **Live Rendering**: See components render in real-time with different props and states
- **Error Boundaries**: Safe rendering with error handling for broken scenarios
- **Responsive Preview**: Test components across different viewport sizes

### 2. Search and Filter
- **Text Search**: Find scenarios by name, description, or category
- **Category Filtering**: Browse scenarios organized by component categories
- **Real-time Results**: Instant filtering as you type

### 3. Demo Mode
- **Auto-cycling**: Automatically cycles through all scenarios
- **3-second Intervals**: Each scenario displays for 3 seconds
- **Visual Indicator**: Demo mode badge shows when active
- **Easy Toggle**: Start/stop demo mode with button or shortcut

### 4. Development Utilities

#### State Inspector (`Ctrl+Shift+I`)
- **Real-time State**: View current component state in JSON format
- **Collapsible Tree**: Expandable object/array visualization
- **Search & Filter**: Find specific state properties
- **Export Data**: Download state as JSON file
- **Copy to Clipboard**: Quick copy functionality

#### Props Viewer (`Ctrl+Shift+P`)
- **Component Props**: View all props passed to components
- **Type Information**: See prop types and values
- **Default Values**: Identify default vs custom prop values
- **Validation**: Required prop indicators

#### Performance Metrics
- **Render Time**: Component rendering performance
- **Update Count**: Number of re-renders
- **Memory Usage**: JavaScript heap usage tracking
- **Last Render**: Timestamp of most recent render

### 5. Scenario Management
- **Category Organization**: Group scenarios by component type
- **Metadata Display**: Show/hide scenario information
- **Quick Navigation**: Keyboard shortcuts for rapid browsing
- **Scenario Count**: Badge indicators showing available scenarios

## Interactive Controls and Prop Playground

- Live prop editing with validation via Zod schemas
- Real-time prop adjustment across variants and states
- Theme switching and responsive testing
- Error surfacing for invalid inputs with inline messages
- Keyboard shortcuts in viewer:
  - `T` — toggle theme (light/dark)
  - `C` — toggle controls panel
  - `R` — reset controls to defaults

### Using the Prop Playground
- Open any scenario with `controls` defined to enable the playground
- Adjust props via typed controls (text, select, boolean, range, etc.)
- Validation runs on change; errors show next to the control
- Save a snapshot by copying rendered code from the examples section

Example controls block:

```ts
controls: {
  variant: { type: 'select', defaultValue: 'default', options: [{ value: 'default', label: 'Default' }] },
  disabled: { type: 'boolean', defaultValue: false },
}
```

## Automated Documentation Generation

ArchiComm includes a generator that aggregates API information and examples from scenarios.

- Component API extraction (props and variants)
- Usage example collection from scenarios
- Cross-referencing of related scenarios
- Export formats: Markdown, JSON, HTML

Key functions (src/dev/utils/documentationGenerator.ts):
- `generateComponentDocumentation(componentName)`
- `extractComponentAPI(componentPath)`
- `generateUsageExamples(scenarios)`
- `generateMarkdownDocumentation(componentDoc)`
- `generateAccessibilityGuide(scenarios)`

## Enhanced Scenario Metadata

Add rich metadata to every scenario for better discoverability and documentation:
- `documentation.summary` and `documentation.usageExamples`
- `documentation.bestPractices`, `documentation.accessibility`, `documentation.performance`
- `relatedScenarios` to cross-reference similar states
- `responsive` and `themes` to express variation by context

## Creating New Scenarios (Enhanced)

- Provide `controls` with sensible defaults
- Supply a `validation` schema (Zod) where helpful
- Add a `documentation` block with:
  - `summary`
  - `usageExamples` (title, description, snippet)
  - `bestPractices`
  - `accessibility` (ARIA, keyboard, screen reader)
  - `performance` tips when applicable

Example:

```ts
{
  id: 'button-playground',
  name: 'Button Playground',
  component: Button,
  controls: { variant: { type: 'select', defaultValue: 'default', options: [...] } },
  validation: buttonPropsSchema,
  documentation: {
    summary: 'Explore all props and states of Button.',
    usageExamples: [
      { title: 'Primary', description: 'Default action', snippet: { language: 'tsx', code: '<Button>Save</Button>' } }
    ],
    bestPractices: ['Prefer one primary action per view']
  }
}
```

## Documentation Best Practices

- Write concise summaries focused on when/why to use
- Include at least one usage example per scenario
- Document accessibility needs (labels, ARIA, keyboard)
- Note performance caveats for complex UIs
- Link related scenarios to aid discovery

## Performance Considerations (Updated)

- Keep control handlers lightweight (debounce expensive work)
- Avoid unnecessary re-renders in interactive scenarios
- Cache generated documentation where possible
- Use lazy-loading for large documentation sets

## Advanced Scenario Patterns

- Compose multiple controls to demonstrate dependent props
- Theme-aware scenarios to verify contrast and spacing
- Responsive checks across common breakpoints
- Accessibility-focused patterns (error announcements, focus order)

## Component Documentation Patterns

- Automated API reference from component source and CVA definitions
- Example extraction directly from scenario declarations
- Cross-component relationship mapping via `relatedScenarios`
- Optional migration notes for versioned changes

## Updated API Reference (Additions)

Types extended in `src/dev/types.ts`:
- `ScenarioDocumentation`, `ComponentDocumentation`, `APIDocumentation`, `UsageExample`, `CodeExample`
- `DocumentationConfig`, `ComponentAnalysis`, `ScenarioAnalysis`
- `EnhancedScenario.documentation`, `EnhancedScenario.examples`, `EnhancedScenario.relatedScenarios`

## Integrating with Development Workflow

- Generate docs in CI as a validation artifact
- Fail CI if documentation validation fails (missing summaries/examples)
- Version documentation alongside component changes
- Keep scenario and documentation updates in the same PR

## Migrating Existing Scenarios

- Add `documentation` with a short `summary` and one example
- Backfill `controls` and `validation` where appropriate
- Add `metadata` tags for categories and search
- Cross-reference related scenarios with `relatedScenarios`

## Troubleshooting Documentation Generation

- Empty props table: ensure component exports props interface or annotate props
- No variants found: verify CVA usage includes `variants` key
- Missing examples: ensure scenarios specify `documentation.usageExamples`

## Creating New Scenarios

### Basic Scenario Structure

```typescript
// src/dev/scenarios.ts
export const buttonScenarios: ScenarioCategory = {
  id: 'button',
  name: 'Button',
  scenarios: [
    {
      id: 'default',
      name: 'Default Button',
      description: 'Basic button with default styling',
      component: () => <Button>Click me</Button>,
    },
    {
      id: 'primary',
      name: 'Primary Button', 
      description: 'Button with primary variant',
      component: () => <Button variant="primary">Primary</Button>,
    }
  ]
};
```

### Advanced Scenario with Props

```typescript
{
  id: 'complex-button',
  name: 'Complex Button',
  description: 'Button with multiple props and state',
  component: () => {
    const [loading, setLoading] = useState(false);
    return (
      <Button 
        variant="primary"
        size="large"
        loading={loading}
        onClick={() => setLoading(!loading)}
      >
        {loading ? 'Loading...' : 'Click me'}
      </Button>
    );
  },
}
```

### Adding Mock Data

```typescript
// src/dev/testData.ts
export const mockUser = {
  id: '1',
  name: 'John Doe',
  email: 'john@example.com',
  avatar: 'https://example.com/avatar.jpg'
};

// Use in scenario
{
  id: 'user-card',
  name: 'User Card',
  description: 'User card with mock data',
  component: () => <UserCard user={mockUser} />,
}
```

## Best Practices

### Naming Conventions
- **Categories**: Use PascalCase (e.g., `Button`, `UserCard`, `NavigationMenu`)
- **Scenario IDs**: Use kebab-case (e.g., `default`, `primary-large`, `loading-state`)
- **Scenario Names**: Use descriptive titles (e.g., `Loading State`, `Error State`)

### Organization
- Group related scenarios in the same category
- Use descriptive scenario names and descriptions
- Include edge cases and error states
- Test different prop combinations

### Performance Considerations
- Keep scenarios lightweight and focused
- Avoid heavy computations in component functions
- Use React.memo() for expensive components
- Mock external dependencies and API calls

### Error Handling
- Include scenarios for error states
- Test component behavior with invalid props
- Use Error Boundaries for graceful failure handling
- Document known issues or limitations

## Troubleshooting

### Common Issues

#### Scenario Viewer Not Loading
- **Check Development Mode**: Ensure `isDevelopment()` returns `true`
- **URL Path**: Verify you're accessing `/dev/scenarios`
- **Browser Console**: Check for JavaScript errors
- **Solution**: Refresh page and check console logs

#### Keyboard Shortcuts Not Working
- **Focus Issues**: Click in an empty area to ensure proper focus
- **Input Fields**: Some shortcuts may not work when typing in inputs
- **Browser Conflicts**: Check for conflicting browser shortcuts
- **Solution**: Try clicking outside input fields first

#### Scenarios Not Rendering
- **Component Errors**: Check browser console for React errors
- **Import Issues**: Verify all component imports are correct
- **Props Missing**: Ensure required props are provided
- **Solution**: Use Error Boundary information to debug

#### Performance Issues
- **Too Many Scenarios**: Large scenario lists can slow down navigation
- **Heavy Components**: Complex components may impact performance
- **Memory Leaks**: Check for uncleared timers or subscriptions
- **Solution**: Use performance panel to identify bottlenecks

### Debug Tools

#### Console Logging
```javascript
// Add debug logging to scenarios
component: () => {
  console.log('Rendering scenario:', scenarioName);
  return <YourComponent />;
}
```

#### State Inspection
- Use `Ctrl+Shift+I` to inspect component state
- Check props with `Ctrl+Shift+P`
- Monitor performance with metrics panel
- Export debug data for analysis

#### Error Reporting
- Error boundaries capture and display errors
- Check browser DevTools for detailed stack traces
- Use React Developer Tools for component inspection
- Export scenario state for bug reports

## Advanced Usage

### Custom Scenario Categories
Create custom categories for specific use cases:

```typescript
export const iconScenarios: ScenarioCategory = {
  id: 'icons',
  name: 'Icons & Graphics',
  scenarios: [
    // Icon scenarios...
  ]
};
```

### Scenario with Hooks
Test components that use React hooks:

```typescript
{
  id: 'hook-example',
  name: 'Component with Hooks',
  description: 'Testing component with custom hooks',
  component: () => {
    const { data, loading } = useCustomHook();
    return <DataComponent data={data} loading={loading} />;
  }
}
```

### Responsive Scenarios
Test components at different screen sizes:

```typescript
{
  id: 'responsive-card',
  name: 'Responsive Card',
  description: 'Card component responsive behavior',
  component: () => (
    <div style={{ width: '100%', maxWidth: '400px' }}>
      <ResponsiveCard />
    </div>
  )
}
```

### Animation Testing
Test animated components:

```typescript
{
  id: 'animated-button',
  name: 'Animated Button',
  description: 'Button with hover animations',
  component: () => (
    <Button className="animate-bounce hover:animate-pulse">
      Animated Button
    </Button>
  )
}
```

## API Reference

### Scenario Interface
```typescript
interface Scenario {
  id: string;           // Unique identifier
  name: string;         // Display name
  description: string;  // Brief description
  component: () => JSX.Element; // React component function
}
```

### ScenarioCategory Interface
```typescript
interface ScenarioCategory {
  id: string;           // Unique category identifier
  name: string;         // Category display name  
  scenarios: Scenario[]; // Array of scenarios
}
```

### DevUtilities Props
```typescript
interface DevUtilitiesProps {
  isStateInspectorOpen: boolean;
  isPropsViewerOpen: boolean;
  currentScenario?: Scenario;
  scenarioState?: any;
  onClose: () => void;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}
```

## Contributing

### Adding New Scenarios
1. Edit `src/dev/scenarios.ts`
2. Add your scenario to appropriate category
3. Test in scenario viewer
4. Update documentation if needed

### Modifying the Viewer
1. Core component: `src/dev/ScenarioViewer.tsx`
2. Shortcuts: `src/dev/DevShortcuts.tsx`
3. Utilities: `src/dev/DevUtilities.tsx`
4. Types: `src/dev/types.ts`

### Best Practices for Contributors
- Follow existing code style and patterns
- Add comprehensive scenarios for new components
- Include error states and edge cases
- Update documentation for new features
- Test keyboard shortcuts and utilities

## Support

For issues, questions, or feature requests:
1. Check this documentation first
2. Search existing issues in the project repository
3. Create a new issue with detailed description
4. Include browser console logs if applicable

---

*This documentation is part of the ArchiComm development system. For more information about the project architecture and development workflow, see the main project documentation.*
