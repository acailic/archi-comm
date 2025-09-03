import React from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Challenge, DesignData, AudioData } from '../App';
import { 
  ArrowLeft, 
  RotateCcw, 
  Download, 
  Clock, 
  MessageSquare, 
  Target,
  TrendingUp,
  CheckCircle
} from 'lucide-react';

interface ReviewScreenProps {
  challenge: Challenge;
  designData: DesignData;
  audioData: AudioData;
  onStartOver: () => void;
  onBackToDesign: () => void;
  onBackToAudio: () => void;
}

export function ReviewScreen({ 
  challenge, 
  designData, 
  audioData, 
  onStartOver, 
  onBackToDesign, 
  onBackToAudio 
}: ReviewScreenProps) {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleExport = () => {
    const exportData = {
      challenge: challenge.title,
      design: designData,
      audio: {
        transcript: audioData.transcript,
        duration: audioData.duration,
        wordCount: audioData.wordCount
      },
      metrics: audioData.analysisMetrics,
      timestamp: new Date().toISOString()
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `archicomm-session-${challenge.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Session Complete
            </h2>
            <p className="text-sm text-muted-foreground">
              Review your system design and explanation for {challenge.title}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Export Session
            </Button>
            <Button variant="outline" size="sm" onClick={onStartOver}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Start Over
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Components Used</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{designData.components.length}</div>
                <p className="text-xs text-muted-foreground">
                  System components
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Recording Duration</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatDuration(audioData.duration)}</div>
                <p className="text-xs text-muted-foreground">
                  Audio explanation
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Word Count</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{audioData.wordCount}</div>
                <p className="text-xs text-muted-foreground">
                  Words in transcript
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Analysis Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Clarity Score</span>
                  <span className="text-sm text-muted-foreground">
                    {Math.round(audioData.analysisMetrics.clarityScore)}%
                  </span>
                </div>
                <Progress value={audioData.analysisMetrics.clarityScore} />
              </div>
              
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Technical Depth</span>
                  <span className="text-sm text-muted-foreground">
                    {Math.round(audioData.analysisMetrics.technicalDepth)}%
                  </span>
                </div>
                <Progress value={audioData.analysisMetrics.technicalDepth} />
              </div>
              
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Business Focus</span>
                  <span className="text-sm text-muted-foreground">
                    {Math.round(audioData.analysisMetrics.businessFocus)}%
                  </span>
                </div>
                <Progress value={audioData.analysisMetrics.businessFocus} />
              </div>
            </CardContent>
          </Card>

          {/* Design Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Design Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Components:</span>
                    <Badge variant="secondary">{designData.components.length}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Connections:</span>
                    <Badge variant="secondary">{designData.connections.length}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Challenge:</span>
                    <Badge variant="outline">{challenge.difficulty}</Badge>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t">
                  <h4 className="font-medium mb-2">Component Types Used:</h4>
                  <div className="flex flex-wrap gap-1">
                    {Array.from(new Set(designData.components.map(c => c.type))).map(type => (
                      <Badge key={type} variant="outline" className="text-xs">
                        {type.replace('-', ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Transcript Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-48 overflow-auto text-sm">
                  {audioData.transcript || 'No transcript available'}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-6 border-t">
            <div className="flex gap-2">
              <Button variant="outline" onClick={onBackToDesign}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Design
              </Button>
              <Button variant="outline" onClick={onBackToAudio}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Recording
              </Button>
            </div>
            
            <Button onClick={onStartOver} size="lg">
              <TrendingUp className="w-4 h-4 mr-2" />
              Try Another Challenge
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}