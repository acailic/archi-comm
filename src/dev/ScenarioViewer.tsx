// src/dev/ScenarioViewer.tsx
// Comprehensive development interface for viewing component scenarios in isolation
// Provides live preview functionality with error boundaries and scenario navigation
// RELEVANT FILES: ./types.ts, ./scenarios.ts, ../components/ui/sidebar.tsx, ../components/ui/card.tsx

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Search, AlertCircle, Play, Code2, Layers, Eye, EyeOff, Settings, Palette } from 'lucide-react';
import { scenarios } from './scenarios';
import type { Scenario, ScenarioCategory, DynamicPropsState, PropChangeEvent, EnhancedScenario, ControlsConfig } from './types';
import { useDevShortcuts } from './DevShortcuts';
import { DevUtilities } from './DevUtilities';
import { ThemeProvider } from './components/ThemeProvider';
import { ThemeToggle } from './components/ThemeToggle';
import { PropControls } from './components/PropControls';
import { mergePropsWithDefaults } from './utils/propValidation';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarProvider,
  SidebarInset,
} from '../components/ui/sidebar';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';

// Error boundary component for safe scenario rendering
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ScenarioErrorBoundary extends React.Component<
  { children: React.ReactNode; scenarioName: string },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; scenarioName: string }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Scenario rendering error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-4 w-4" />
              Scenario Error
            </CardTitle>
            <CardDescription className="text-red-600">
              Failed to render scenario: {this.props.scenarioName}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-600">
              {this.state.error?.message || 'Unknown error occurred'}
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-4"
              onClick={() => this.setState({ hasError: false })}
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

// Scenario metadata display component
function ScenarioMetadata({ scenario }: { scenario: Scenario }) {
  const enhancedScenario = scenario as EnhancedScenario;
  
  return (
    <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border">
      <h3 className="font-semibold text-sm mb-2">Scenario Information</h3>
      <div className="space-y-1 text-xs">
        <div><strong>ID:</strong> {scenario.id}</div>
        <div><strong>Name:</strong> {scenario.name}</div>
        <div><strong>Description:</strong> {scenario.description}</div>
        {enhancedScenario.controls && (
          <div><strong>Interactive Controls:</strong> {Object.keys(enhancedScenario.controls).length} props</div>
        )}
        {enhancedScenario.defaultProps && (
          <div><strong>Default Props:</strong> {Object.keys(enhancedScenario.defaultProps).length} props</div>
        )}
        {enhancedScenario.validation && (
          <div><strong>Validation:</strong> Enabled</div>
        )}
      </div>
    </div>
  );
}

// Main ScenarioViewer component
export function ScenarioViewer() {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showMetadata, setShowMetadata] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [scenarioState, setScenarioState] = useState<any>({});
  const [dynamicProps, setDynamicProps] = useState<DynamicPropsState>({});
  const [searchInputRef, setSearchInputRef] = useState<HTMLInputElement | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [hideUI, setHideUI] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark' | 'system'>('system');

  // URL parameter handling for deep linking
  useEffect(() => {
    const handleURLParameters = () => {
      const urlParams = new URLSearchParams(window.location.search);
      
      // Handle scenario parameter (format: categoryName:scenarioId)
      const scenarioParam = urlParams.get('scenario');
      if (scenarioParam) {
        const [categoryName, scenarioId] = scenarioParam.split(':');
        if (categoryName && scenarioId && scenarios[categoryName]) {
          const scenario = scenarios[categoryName].scenarios.find(s => s.id === scenarioId);
          if (scenario) {
            setSelectedCategory(categoryName);
            setSelectedScenario(scenarioId);
          } else {
            console.warn(`Scenario not found: ${scenarioParam}`);
          }
        } else {
          console.warn(`Invalid scenario parameter format: ${scenarioParam}`);
        }
      }
      
      // Handle theme parameter
      const themeParam = urlParams.get('theme');
      if (themeParam && ['light', 'dark', 'system'].includes(themeParam)) {
        setCurrentTheme(themeParam as 'light' | 'dark' | 'system');
      }
      
      // Handle hideUI parameter for clean screenshots
      const hideUIParam = urlParams.get('hideUI');
      if (hideUIParam === 'true') {
        setHideUI(true);
        setShowMetadata(false);
        setShowControls(false);
      }
    };

    // Handle initial URL parameters
    handleURLParameters();

    // Listen for browser back/forward navigation
    const handlePopState = () => {
      handleURLParameters();
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Update URL when scenario selection changes
  useEffect(() => {
    if (selectedCategory && selectedScenario) {
      const params = new URLSearchParams();
      params.set('scenario', `${selectedCategory}:${selectedScenario}`);
      
      if (currentTheme !== 'system') {
        params.set('theme', currentTheme);
      }
      
      if (hideUI) {
        params.set('hideUI', 'true');
      }
      
      const newURL = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState(null, '', newURL);
    }
  }, [selectedCategory, selectedScenario, currentTheme, hideUI]);

  // Get all categories and scenarios
  const categories = useMemo(() => {
    return Object.values(scenarios);
  }, []);

  // Filter scenarios based on search query
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;

    return categories.map(category => ({
      ...category,
      scenarios: category.scenarios.filter(scenario =>
        scenario.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        scenario.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        category.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    })).filter(category => category.scenarios.length > 0);
  }, [categories, searchQuery]);

  // Get currently selected scenario
  const currentScenario = useMemo(() => {
    if (!selectedCategory || !selectedScenario) return null;
    
    const category = scenarios[selectedCategory];
    if (!category) return null;
    
    return category.scenarios.find(s => s.id === selectedScenario) || null;
  }, [selectedCategory, selectedScenario]);

  // Get current scenario as enhanced scenario for controls
  const enhancedScenario = currentScenario as EnhancedScenario | null;

  // Get merged props for current scenario
  const mergedProps = useMemo(() => {
    if (!currentScenario) return {};
    const scenarioProps = dynamicProps[currentScenario.id] || {};
    const defaultProps = enhancedScenario?.defaultProps || {};
    return mergePropsWithDefaults(scenarioProps, defaultProps);
  }, [currentScenario, dynamicProps, enhancedScenario]);

  // Handle scenario selection
  const handleScenarioSelect = (categoryName: string, scenarioId: string) => {
    setSelectedCategory(categoryName);
    setSelectedScenario(scenarioId);
    setScenarioState({}); // Reset state when switching scenarios
  };

  // Handle prop changes from controls
  const handlePropChange = useCallback((event: PropChangeEvent) => {
    if (!event.isValid) {
      console.warn('Invalid prop change:', event.validationErrors);
    }
    
    setDynamicProps(prev => ({
      ...prev,
      [event.scenarioId]: {
        ...prev[event.scenarioId],
        [event.propName]: event.newValue,
      },
    }));
  }, []);

  // Reset props for current scenario
  const handleResetProps = useCallback(() => {
    if (!currentScenario) return;
    setDynamicProps(prev => {
      const next = { ...prev };
      delete next[currentScenario.id];
      return next;
    });
  }, [currentScenario]);

  // Copy props to clipboard
  const handleCopyProps = useCallback((props: Record<string, any>) => {
    navigator.clipboard.writeText(JSON.stringify(props, null, 2))
      .then(() => console.log('Props copied to clipboard'))
      .catch((err) => console.error('Failed to copy props:', err));
  }, []);

  // Keyboard navigation helpers
  const getScenarioList = useCallback(() => {
    const list: { category: string; scenario: string }[] = [];
    categories.forEach(category => {
      category.scenarios.forEach(scenario => {
        list.push({ category: category.name, scenario: scenario.id });
      });
    });
    return list;
  }, [categories]);

  const getCurrentIndex = useCallback(() => {
    if (!selectedCategory || !selectedScenario) return -1;
    const list = getScenarioList();
    return list.findIndex(item => 
      item.category === selectedCategory && item.scenario === selectedScenario
    );
  }, [selectedCategory, selectedScenario, getScenarioList]);

  const navigateToScenario = useCallback((direction: 'next' | 'previous') => {
    const list = getScenarioList();
    if (list.length === 0) return;
    
    const currentIndex = getCurrentIndex();
    let newIndex;
    
    if (currentIndex === -1) {
      newIndex = 0;
    } else if (direction === 'next') {
      newIndex = (currentIndex + 1) % list.length;
    } else {
      newIndex = currentIndex === 0 ? list.length - 1 : currentIndex - 1;
    }
    
    const target = list[newIndex];
    handleScenarioSelect(target.category, target.scenario);
  }, [getScenarioList, getCurrentIndex, handleScenarioSelect]);

  const selectCategoryByIndex = useCallback((index: number) => {
    if (index < 0 || index >= categories.length) return;
    const category = categories[index];
    setSelectedCategory(category.name);
    if (category.scenarios.length > 0) {
      setSelectedScenario(category.scenarios[0].id);
    }
  }, [categories]);

  const clearSelection = useCallback(() => {
    setSelectedCategory('');
    setSelectedScenario('');
    setSearchQuery('');
    setScenarioState({});
    setDynamicProps({});
  }, []);

  const focusSearch = useCallback(() => {
    searchRef.current?.focus();
  }, []);

  // Get scenario count for category badge
  const getScenarioCount = (category: ScenarioCategory) => {
    if (!searchQuery.trim()) return category.scenarios.length;
    
    return category.scenarios.filter(scenario =>
      scenario.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      scenario.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      category.name.toLowerCase().includes(searchQuery.toLowerCase())
    ).length;
  };

  // Development shortcuts integration
  const devShortcuts = useDevShortcuts({
    handlers: {
      onSearch: focusSearch,
      onNavigateNext: () => navigateToScenario('next'),
      onNavigatePrevious: () => navigateToScenario('previous'), 
      onClearSelection: clearSelection,
      onSelectCategory: selectCategoryByIndex,
      onReset: clearSelection,
      onToggleDemoMode: () => {}, // Handled internally
      onToggleTheme: () => {}, // Handled by ThemeToggle
      onToggleControls: () => setShowControls(prev => !prev),
      onResetProps: handleResetProps,
      onCopyProps: () => handleCopyProps(mergedProps),
    },
    scenarioViewerActive: true,
    enabled: true,
  });

  // Demo mode effect - auto cycle through scenarios
  useEffect(() => {
    if (devShortcuts.isDemoMode) {
      const interval = setInterval(() => {
        navigateToScenario('next');
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [devShortcuts.isDemoMode, navigateToScenario]);

  return (
    <ThemeProvider>
      <SidebarProvider defaultOpen={true}>
        <div className="flex h-screen w-full" data-testid="scenario-viewer">
        {/* Sidebar Navigation */}
        <Sidebar data-testid="scenario-sidebar" style={hideUI ? { display: 'none' } : {}}>
          <SidebarHeader>
            <div className="flex items-center gap-2 px-2">
              <Code2 className="h-5 w-5 text-blue-600" />
              <h2 className="font-semibold">Scenario Viewer</h2>
            </div>
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                ref={searchRef}
                placeholder="Search scenarios..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </SidebarHeader>

          <SidebarContent>
            {/* Categories and Scenarios */}
            {filteredCategories.map((category) => {
              const scenarioCount = getScenarioCount(category);
              
              return (
                <SidebarGroup key={category.id}>
                  <SidebarGroupLabel className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4" />
                      {category.name}
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {scenarioCount}
                    </Badge>
                  </SidebarGroupLabel>
                  
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {category.scenarios.map((scenario) => (
                        <SidebarMenuItem key={scenario.id}>
                          <SidebarMenuButton
                            isActive={selectedCategory === category.name && selectedScenario === scenario.id}
                            onClick={() => handleScenarioSelect(category.name, scenario.id)}
                            data-testid={`scenario-${scenario.id}`}
                          >
                            <Play className="h-4 w-4" />
                            <span className="truncate">{scenario.name}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              );
            })}

            {/* No results message */}
            {filteredCategories.length === 0 && searchQuery.trim() && (
              <div className="p-4 text-center text-sm text-gray-500">
                No scenarios found for "{searchQuery}"
              </div>
            )}
          </SidebarContent>
        </Sidebar>

        {/* Main Content Area */}
        <SidebarInset>
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className={`border-b bg-white p-4 ${hideUI ? 'hidden' : ''}`}>
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-lg font-semibold">
                    {currentScenario ? currentScenario.name : 'Select a Scenario'}
                    {devShortcuts.isDemoMode && (
                      <Badge className="ml-2 bg-green-100 text-green-800">Demo Mode</Badge>
                    )}
                  </h1>
                  {currentScenario && (
                    <p className="text-sm text-gray-600 mt-1">
                      {currentScenario.description}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <ThemeToggle size="sm" />
                  
                  {currentScenario && enhancedScenario?.controls && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowControls(!showControls)}
                    >
                      <Settings className="h-4 w-4" />
                      {showControls ? 'Hide Controls' : 'Controls'}
                    </Button>
                  )}
                  
                  {currentScenario && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowMetadata(!showMetadata)}
                    >
                      {showMetadata ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      {showMetadata ? 'Hide Info' : 'Show Info'}
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={devShortcuts.toggleDemoMode}
                  >
                    {devShortcuts.isDemoMode ? 'Stop Demo' : 'Demo Mode'}
                  </Button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto">
              {currentScenario ? (
                <div className="flex h-full">
                  {/* Main Content */}
                  <div className={`${showControls && enhancedScenario?.controls ? 'flex-1' : 'w-full'} ${hideUI ? 'p-0' : 'p-6'}`} data-testid="scenario-content">
                    {/* Scenario Metadata */}
                    {showMetadata && <ScenarioMetadata scenario={currentScenario} />}
                    
                    {/* Scenario Preview */}
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle>Live Preview</CardTitle>
                            <CardDescription>
                              Component rendered in isolation with {Object.keys(mergedProps).length > 0 ? 'interactive props' : 'default props'}
                            </CardDescription>
                          </div>
                          {Object.keys(mergedProps).length > 0 && (
                            <div className="text-xs text-muted-foreground">
                              {Object.keys(mergedProps).length} prop(s) active
                            </div>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div 
                          className={`border rounded-lg ${hideUI ? 'border-0 p-0' : 'p-6'} bg-gray-50 dark:bg-gray-900 min-h-96`}
                          data-testid={`scenario-${currentScenario.id}`}
                        >
                          <ScenarioErrorBoundary scenarioName={currentScenario.name}>
                            {/* Render component with merged props if it's a function */}
                            {typeof currentScenario.component === 'function' ? (
                              React.createElement(currentScenario.component as any, mergedProps)
                            ) : (
                              currentScenario.component()
                            )}
                          </ScenarioErrorBoundary>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  {/* Controls Panel */}
                  {showControls && enhancedScenario?.controls && (
                    <div className="w-80 border-l bg-white dark:bg-gray-950 p-4 overflow-auto">
                      <PropControls
                        scenarioId={currentScenario.id}
                        controls={enhancedScenario.controls}
                        currentProps={dynamicProps[currentScenario.id] || {}}
                        defaultProps={enhancedScenario.defaultProps}
                        onPropChange={handlePropChange}
                        onReset={handleResetProps}
                        onCopy={handleCopyProps}
                      />
                    </div>
                  )}
                </div>
              ) : (
                // Empty state
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <Code2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      Welcome to Scenario Viewer
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 max-w-sm">
                      Select a scenario from the sidebar to preview components in isolation.
                      Use the search bar to quickly find specific scenarios.
                    </p>
                    <div className="mt-6">
                      <Badge variant="outline" className="mr-2">
                        {categories.length} Categories
                      </Badge>
                      <Badge variant="outline">
                        {categories.reduce((total, cat) => total + cat.scenarios.length, 0)} Scenarios
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </SidebarInset>
        
        {/* Development Utilities */}
        <DevUtilities
          isStateInspectorOpen={devShortcuts.isStateInspectorOpen}
          isPropsViewerOpen={devShortcuts.isPropsViewerOpen}
          currentScenario={currentScenario}
          scenarioState={scenarioState}
          dynamicProps={dynamicProps[currentScenario?.id || ''] || {}}
          mergedProps={mergedProps}
          controls={enhancedScenario?.controls}
          onPropChange={handlePropChange}
          onResetProps={handleResetProps}
          onCopyProps={handleCopyProps}
          onClose={() => {
            if (devShortcuts.isStateInspectorOpen) devShortcuts.toggleStateInspector();
            if (devShortcuts.isPropsViewerOpen) devShortcuts.togglePropsViewer();
          }}
        />
        </div>
      </SidebarProvider>
    </ThemeProvider>
  );
}

export default ScenarioViewer;