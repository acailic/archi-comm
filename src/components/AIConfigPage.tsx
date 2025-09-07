import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  Eye, 
  EyeOff, 
  TestTube, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Info,
  Settings,
  Save,
  RotateCcw,
  Loader2,
  ArrowLeft,
  X
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Alert, AlertDescription } from './ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Slider } from './ui/slider';

import { useAIConfig } from '../hooks/useAIConfig';
import { 
  AIConfig, 
  AIConfigSchema,
  validateApiKeyFormat,
  DEFAULT_SETTINGS
} from '../lib/types/AIConfig';

const FormSchema = AIConfigSchema;

interface AIConfigPageProps {
  onClose?: () => void;
}

export function AIConfigPage({ onClose }: AIConfigPageProps) {
  const [showApiKey, setShowApiKey] = useState(false);
  const [temperature, setTemperature] = useState(DEFAULT_SETTINGS.temperature || 0.7);
  const [maxTokens, setMaxTokens] = useState(DEFAULT_SETTINGS.maxTokens || 1000);

  const {
    config,
    loading,
    saving,
    error,
    connectionTest,
    testingConnection,
    saveConfig,
    testConnection,
    resetToDefaults,
    clearError,
    clearTestResult,
    isAIConfigured
  } = useAIConfig();

  const form = useForm<AIConfig>({
    resolver: zodResolver(FormSchema),
    defaultValues: config,
    values: config
  });

  // Update local state when config changes
  useEffect(() => {
    setTemperature(DEFAULT_SETTINGS.temperature || 0.7);
    setMaxTokens(DEFAULT_SETTINGS.maxTokens || 1000);
  }, [config]);

  const onSubmit = async (data: AIConfig) => {
    const success = await saveConfig(data);
    if (success) {
      // Show success notification or toast here if needed
    }
  };

  const handleTestConnection = async () => {
    const apiKey = form.getValues('openai.apiKey');
    await testConnection(apiKey);
  };

  const toggleApiKeyVisibility = () => {
    setShowApiKey(prev => !prev);
  };

  const handleResetToDefaults = async () => {
    await resetToDefaults();
    form.reset(config);
    setTemperature(DEFAULT_SETTINGS.temperature || 0.7);
    setMaxTokens(DEFAULT_SETTINGS.maxTokens || 1000);
  };

  const handleClose = () => {
    if (!onClose) return;
    
    const isDirty = form.formState.isDirty;
    if (isDirty) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to leave without saving?'
      );
      if (!confirmed) return;
    }
    
    onClose();
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && onClose) {
        event.preventDefault();
        handleClose();
      }
    };

    if (onClose) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [onClose, handleClose]);

  const getConnectionStatus = () => {
    const test = connectionTest;
    const configured = isAIConfigured();
    const isTesting = testingConnection;

    if (isTesting) {
      return (
        <div className="flex items-center gap-2 text-blue-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Testing...</span>
        </div>
      );
    }

    if (!test && !configured) {
      return (
        <div className="flex items-center gap-2 text-gray-500">
          <Info className="h-4 w-4" />
          <span className="text-sm">Not configured</span>
        </div>
      );
    }

    if (test?.success) {
      return (
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle className="h-4 w-4" />
          <span className="text-sm">Connected ({test.responseTime}ms)</span>
        </div>
      );
    }

    if (test && !test.success) {
      return (
        <div className="flex items-center gap-2 text-red-600">
          <XCircle className="h-4 w-4" />
          <span className="text-sm">Connection failed</span>
        </div>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {onClose && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleClose}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            )}
            <div>
              <h1 className="text-3xl font-bold">AI Configuration</h1>
              <p className="text-muted-foreground mt-2">
                Configure your AI provider settings and API keys
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleResetToDefaults}
              disabled={saving}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to Defaults
            </Button>
            {onClose && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleClose}
                className="h-9 w-9 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              {error}
              <Button variant="ghost" size="sm" onClick={clearError}>
                Dismiss
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <Alert variant="warning">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Security Notice:</strong> API keys are encrypted and stored locally on your device. 
            Never share your API keys or commit them to version control.
          </AlertDescription>
        </Alert>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      OpenAI Configuration
                    </CardTitle>
                    <CardDescription>
                      Configure your OpenAI API settings for AI-powered features
                    </CardDescription>
                  </div>
                  {getConnectionStatus()}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="openai.enabled"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <FormLabel>Enable AI Features</FormLabel>
                        <FormDescription>
                          Enable AI-powered features using OpenAI
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="openai.apiKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>OpenAI API Key</FormLabel>
                      <FormDescription>
                        Your OpenAI API key (encrypted when saved)
                      </FormDescription>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <FormControl>
                            <Input
                              type={showApiKey ? 'text' : 'password'}
                              placeholder="Enter your OpenAI API key (sk-...)"
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                // Clear test results when API key changes
                                clearTestResult();
                              }}
                            />
                          </FormControl>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                            onClick={toggleApiKeyVisibility}
                          >
                            {showApiKey ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleTestConnection}
                          disabled={!field.value || testingConnection}
                        >
                          <TestTube className="h-4 w-4 mr-2" />
                          Test
                        </Button>
                      </div>
                      <FormMessage />
                      {connectionTest && !connectionTest.success && (
                        <Alert variant="destructive">
                          <XCircle className="h-4 w-4" />
                          <AlertDescription>
                            {connectionTest.error}
                          </AlertDescription>
                        </Alert>
                      )}
                    </FormItem>
                  )}
                />

                {/* Basic Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">AI Settings</CardTitle>
                    <CardDescription>
                      Configure basic AI behavior settings
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <FormLabel className="flex items-center gap-2">
                        Temperature
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-4 w-4" />
                          </TooltipTrigger>
                          <TooltipContent>
                            Controls randomness. Lower values = more focused, higher values = more creative
                          </TooltipContent>
                        </Tooltip>
                      </FormLabel>
                      <div className="space-y-2 mt-2">
                        <Slider
                          value={[temperature]}
                          onValueChange={([value]) => setTemperature(value)}
                          max={2}
                          min={0}
                          step={0.1}
                          className="w-full"
                        />
                        <div className="text-center text-sm text-muted-foreground">
                          {temperature.toFixed(1)}
                        </div>
                      </div>
                    </div>

                    <div>
                      <FormLabel>Max Tokens</FormLabel>
                      <FormDescription>
                        Maximum number of tokens in the response (1-4000)
                      </FormDescription>
                      <Input
                        type="number"
                        min="1"
                        max="4000"
                        value={maxTokens}
                        onChange={(e) => setMaxTokens(parseInt(e.target.value) || 1000)}
                        className="mt-2"
                      />
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
              {onClose && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleClose}
                  disabled={saving}
                >
                  Cancel
                </Button>
              )}
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Configuration
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </TooltipProvider>
  );
}
