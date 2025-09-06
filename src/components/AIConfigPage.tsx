import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
  Loader2
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Alert, AlertDescription } from './ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Slider } from './ui/slider';

import { useAIConfig } from '../hooks/useAIConfig';
import { 
  AIProvider, 
  AIConfig, 
  AVAILABLE_MODELS, 
  DEFAULT_MODELS,
  AIConfigSchema,
  validateApiKeyFormat
} from '../lib/types/AIConfig';

const FormSchema = AIConfigSchema;

export function AIConfigPage() {
  const [showApiKeys, setShowApiKeys] = useState<Record<AIProvider, boolean>>({
    [AIProvider.OPENAI]: false,
    [AIProvider.GEMINI]: false,
    [AIProvider.CLAUDE]: false
  });

  const [testingProvider, setTestingProvider] = useState<AIProvider | null>(null);

  const {
    config,
    loading,
    saving,
    error,
    connectionTests,
    testingConnections,
    saveConfig,
    testConnection,
    resetToDefaults,
    clearError,
    clearTestResult,
    isProviderConfigured
  } = useAIConfig();

  const form = useForm<AIConfig>({
    resolver: zodResolver(FormSchema),
    defaultValues: config,
    values: config
  });

  const onSubmit = async (data: AIConfig) => {
    const success = await saveConfig(data);
    if (success) {
      // Show success notification or toast here if needed
    }
  };

  const handleTestConnection = async (provider: AIProvider) => {
    setTestingProvider(provider);
    const apiKey = form.getValues(`${provider}.apiKey`);
    await testConnection(provider, apiKey);
    setTestingProvider(null);
  };

  const toggleApiKeyVisibility = (provider: AIProvider) => {
    setShowApiKeys(prev => ({
      ...prev,
      [provider]: !prev[provider]
    }));
  };

  const handleResetToDefaults = async () => {
    await resetToDefaults();
    form.reset(config);
  };

  const getConnectionStatus = (provider: AIProvider) => {
    const test = connectionTests[provider];
    const isConfigured = isProviderConfigured(provider);
    const isTesting = testingConnections[provider];

    if (isTesting) {
      return (
        <div className="flex items-center gap-2 text-blue-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Testing...</span>
        </div>
      );
    }

    if (!test && !isConfigured) {
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
          <div>
            <h1 className="text-3xl font-bold">AI Configuration</h1>
            <p className="text-muted-foreground mt-2">
              Configure your AI provider settings and API keys
            </p>
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
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  AI Provider Settings
                </CardTitle>
                <CardDescription>
                  Configure your preferred AI providers and their settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue={AIProvider.OPENAI} className="space-y-6">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value={AIProvider.OPENAI}>OpenAI</TabsTrigger>
                    <TabsTrigger value={AIProvider.GEMINI}>Gemini</TabsTrigger>
                    <TabsTrigger value={AIProvider.CLAUDE}>Claude</TabsTrigger>
                  </TabsList>

                  {Object.values(AIProvider).map((provider) => (
                    <TabsContent key={provider} value={provider} className="space-y-6">
                      <Card>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="capitalize">{provider} Configuration</CardTitle>
                              <CardDescription>
                                Configure your {provider} API settings
                              </CardDescription>
                            </div>
                            {getConnectionStatus(provider)}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          <FormField
                            control={form.control}
                            name={`${provider}.enabled`}
                            render={({ field }) => (
                              <FormItem className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                  <FormLabel>Enable {provider.toUpperCase()}</FormLabel>
                                  <FormDescription>
                                    Enable this AI provider for use in the application
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
                            name={`${provider}.apiKey`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>API Key</FormLabel>
                                <FormDescription>
                                  Your {provider.toUpperCase()} API key (encrypted when saved)
                                </FormDescription>
                                <div className="flex gap-2">
                                  <div className="relative flex-1">
                                    <FormControl>
                                      <Input
                                        type={showApiKeys[provider] ? 'text' : 'password'}
                                        placeholder={`Enter your ${provider.toUpperCase()} API key`}
                                        {...field}
                                        onChange={(e) => {
                                          field.onChange(e);
                                          // Clear test results when API key changes
                                          clearTestResult(provider);
                                        }}
                                      />
                                    </FormControl>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                                      onClick={() => toggleApiKeyVisibility(provider)}
                                    >
                                      {showApiKeys[provider] ? (
                                        <EyeOff className="h-4 w-4" />
                                      ) : (
                                        <Eye className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => handleTestConnection(provider)}
                                    disabled={!field.value || testingProvider === provider}
                                  >
                                    <TestTube className="h-4 w-4 mr-2" />
                                    Test
                                  </Button>
                                </div>
                                <FormMessage />
                                {connectionTests[provider] && !connectionTests[provider]?.success && (
                                  <Alert variant="destructive">
                                    <XCircle className="h-4 w-4" />
                                    <AlertDescription>
                                      {connectionTests[provider]?.error}
                                    </AlertDescription>
                                  </Alert>
                                )}
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`${provider}.selectedModel`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Model</FormLabel>
                                <FormDescription>
                                  Choose the AI model to use for this provider
                                </FormDescription>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select a model" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {AVAILABLE_MODELS[provider].map((model) => (
                                      <SelectItem key={model.id} value={model.id}>
                                        <div>
                                          <div className="font-medium">{model.name}</div>
                                          <div className="text-sm text-muted-foreground">
                                            {model.description}
                                          </div>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* Advanced Settings */}
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-base">Advanced Settings</CardTitle>
                              <CardDescription>
                                Fine-tune the behavior of the AI model
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <FormField
                                control={form.control}
                                name={`${provider}.settings.temperature`}
                                render={({ field }) => (
                                  <FormItem>
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
                                    <FormControl>
                                      <div className="space-y-2">
                                        <Slider
                                          value={[field.value || 0.7]}
                                          onValueChange={([value]) => field.onChange(value)}
                                          max={2}
                                          min={0}
                                          step={0.1}
                                          className="w-full"
                                        />
                                        <div className="text-center text-sm text-muted-foreground">
                                          {field.value?.toFixed(1) || '0.7'}
                                        </div>
                                      </div>
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name={`${provider}.settings.maxTokens`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Max Tokens</FormLabel>
                                    <FormDescription>
                                      Maximum number of tokens in the response
                                    </FormDescription>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        min="1"
                                        max="200000"
                                        {...field}
                                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              {/* Provider-specific advanced settings */}
                              {provider === AIProvider.OPENAI && (
                                <>
                                  <FormField
                                    control={form.control}
                                    name={`${provider}.settings.topP`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="flex items-center gap-2">
                                          Top P
                                          <Tooltip>
                                            <TooltipTrigger>
                                              <Info className="h-4 w-4" />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              Controls diversity via nucleus sampling. Lower values = more focused
                                            </TooltipContent>
                                          </Tooltip>
                                        </FormLabel>
                                        <FormControl>
                                          <div className="space-y-2">
                                            <Slider
                                              value={[field.value || 1]}
                                              onValueChange={([value]) => field.onChange(value)}
                                              max={1}
                                              min={0}
                                              step={0.1}
                                              className="w-full"
                                            />
                                            <div className="text-center text-sm text-muted-foreground">
                                              {field.value?.toFixed(1) || '1.0'}
                                            </div>
                                          </div>
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />

                                  <FormField
                                    control={form.control}
                                    name={`${provider}.settings.frequencyPenalty`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="flex items-center gap-2">
                                          Frequency Penalty
                                          <Tooltip>
                                            <TooltipTrigger>
                                              <Info className="h-4 w-4" />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              Reduces repetition of frequent tokens. Higher values = less repetition
                                            </TooltipContent>
                                          </Tooltip>
                                        </FormLabel>
                                        <FormControl>
                                          <div className="space-y-2">
                                            <Slider
                                              value={[field.value || 0]}
                                              onValueChange={([value]) => field.onChange(value)}
                                              max={2}
                                              min={-2}
                                              step={0.1}
                                              className="w-full"
                                            />
                                            <div className="text-center text-sm text-muted-foreground">
                                              {field.value?.toFixed(1) || '0.0'}
                                            </div>
                                          </div>
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />

                                  <FormField
                                    control={form.control}
                                    name={`${provider}.settings.presencePenalty`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="flex items-center gap-2">
                                          Presence Penalty
                                          <Tooltip>
                                            <TooltipTrigger>
                                              <Info className="h-4 w-4" />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              Reduces repetition of any tokens. Higher values = more diverse topics
                                            </TooltipContent>
                                          </Tooltip>
                                        </FormLabel>
                                        <FormControl>
                                          <div className="space-y-2">
                                            <Slider
                                              value={[field.value || 0]}
                                              onValueChange={([value]) => field.onChange(value)}
                                              max={2}
                                              min={-2}
                                              step={0.1}
                                              className="w-full"
                                            />
                                            <div className="text-center text-sm text-muted-foreground">
                                              {field.value?.toFixed(1) || '0.0'}
                                            </div>
                                          </div>
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </>
                              )}

                              {provider === AIProvider.GEMINI && (
                                <>
                                  <FormField
                                    control={form.control}
                                    name={`${provider}.settings.topP`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="flex items-center gap-2">
                                          Top P
                                          <Tooltip>
                                            <TooltipTrigger>
                                              <Info className="h-4 w-4" />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              Controls diversity via nucleus sampling. Lower values = more focused
                                            </TooltipContent>
                                          </Tooltip>
                                        </FormLabel>
                                        <FormControl>
                                          <div className="space-y-2">
                                            <Slider
                                              value={[field.value || 1]}
                                              onValueChange={([value]) => field.onChange(value)}
                                              max={1}
                                              min={0}
                                              step={0.1}
                                              className="w-full"
                                            />
                                            <div className="text-center text-sm text-muted-foreground">
                                              {field.value?.toFixed(1) || '1.0'}
                                            </div>
                                          </div>
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />

                                  <FormField
                                    control={form.control}
                                    name={`${provider}.settings.topK`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="flex items-center gap-2">
                                          Top K
                                          <Tooltip>
                                            <TooltipTrigger>
                                              <Info className="h-4 w-4" />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              Limits token selection to top K most likely tokens
                                            </TooltipContent>
                                          </Tooltip>
                                        </FormLabel>
                                        <FormControl>
                                          <Input
                                            type="number"
                                            min="1"
                                            max="100"
                                            {...field}
                                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </>
                              )}

                              {provider === AIProvider.CLAUDE && (
                                <FormField
                                  control={form.control}
                                  name={`${provider}.settings.topP`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="flex items-center gap-2">
                                        Top P
                                        <Tooltip>
                                          <TooltipTrigger>
                                            <Info className="h-4 w-4" />
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            Controls diversity via nucleus sampling. Lower values = more focused
                                          </TooltipContent>
                                        </Tooltip>
                                      </FormLabel>
                                      <FormControl>
                                        <div className="space-y-2">
                                          <Slider
                                            value={[field.value || 1]}
                                            onValueChange={([value]) => field.onChange(value)}
                                            max={1}
                                            min={0}
                                            step={0.1}
                                            className="w-full"
                                          />
                                          <div className="text-center text-sm text-muted-foreground">
                                            {field.value?.toFixed(1) || '1.0'}
                                          </div>
                                        </div>
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              )}
                            </CardContent>
                          </Card>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  ))}
                </Tabs>

                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>Default Provider</CardTitle>
                    <CardDescription>
                      Choose which AI provider to use by default
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <FormField
                      control={form.control}
                      name="defaultProvider"
                      render={({ field }) => (
                        <FormItem>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select default provider" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.values(AIProvider).map((provider) => (
                                <SelectItem key={provider} value={provider}>
                                  {provider.toUpperCase()}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </CardContent>
            </Card>

            <div className="flex justify-end">
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