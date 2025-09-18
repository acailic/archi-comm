import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Edit3,
  Trash2,
  Save,
  Upload,
  Download,
  Copy,
  CheckCircle,
  AlertCircle,
  BookOpen,
} from 'lucide-react';
import { ExtendedChallenge, challengeManager, tauriChallengeAPI } from '@/lib/config/challenge-config';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/components/ui/card';
import { Button } from '@ui/components/ui/button';
import { Input } from '@ui/components/ui/input';
import { Textarea } from '@ui/components/ui/textarea';
import { Label } from '@ui/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/components/ui/select';
import { Badge } from '@ui/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@ui/components/ui/tabs';
import { ScrollArea } from '@ui/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@ui/components/ui/dialog';
import { Alert, AlertDescription } from '@ui/components/ui/alert';
import type { Challenge } from '@/shared/contracts';

interface ChallengeManagerProps {
  onChallengeUpdate?: (challenges: ExtendedChallenge[]) => void;
  isOpen: boolean;
  onClose: () => void;
}

// ArchiComm Community Edition - Challenge Manager
// Simplified challenge management for educational use
interface ChallengeFormData {
  id: string;
  title: string;
  description: string;
  requirements: string[];
  difficulty: Challenge['difficulty'];
  estimatedTime: number;
  category: string;
  tags: string[];
}

const defaultFormData: ChallengeFormData = {
  id: '',
  title: '',
  description: '',
  requirements: [''],
  difficulty: 'beginner',
  estimatedTime: 30,
  category: 'system-design',
  tags: [],
};

export function ChallengeManager({ onChallengeUpdate, isOpen, onClose }: ChallengeManagerProps) {
  const [currentTab, setCurrentTab] = useState('challenges');
  const [challenges, setChallenges] = useState<ExtendedChallenge[]>([]);
  const [editingChallenge, setEditingChallenge] = useState<ExtendedChallenge | null>(null);
  const [formData, setFormData] = useState<ChallengeFormData>(defaultFormData);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [importExportState, setImportExportState] = useState<'idle' | 'importing' | 'exporting'>(
    'idle'
  );
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadChallenges();
    }
  }, [isOpen]);

  const loadChallenges = () => {
    const allChallenges = challengeManager.getAllChallenges();
    setChallenges(allChallenges);
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleCreateChallenge = () => {
    setEditingChallenge(null);
    setFormData({
      ...defaultFormData,
      id: `custom-${Date.now()}`,
    });
    setShowCreateDialog(true);
  };

  const handleEditChallenge = (challenge: ExtendedChallenge) => {
    setEditingChallenge(challenge);
    setFormData({
      id: challenge.id,
      title: challenge.title,
      description: challenge.description,
      requirements: challenge.requirements,
      difficulty: challenge.difficulty,
      estimatedTime: challenge.estimatedTime,
      category: challenge.category,
      tags: challenge.tags || [],
    });
    setShowCreateDialog(true);
  };

  const handleSaveChallenge = () => {
    try {
      // Validate form data
      if (!formData.title.trim() || !formData.description.trim()) {
        showMessage('error', 'Title and description are required');
        return;
      }

      const challengeData: ExtendedChallenge = {
        ...formData,
        requirements: formData.requirements.filter(req => req.trim() !== ''),
        tags: formData.tags.filter(tag => tag.trim() !== ''),
      };

      if (editingChallenge) {
        // Update existing challenge
        const index = challenges.findIndex(c => c.id === editingChallenge.id);
        if (index !== -1) {
          const updatedChallenges = [...challenges];
          updatedChallenges[index] = challengeData;
          setChallenges(updatedChallenges);
        }
      } else {
        // Add new challenge
        challengeManager.addCustomChallenge(challengeData);
        setChallenges([...challenges, challengeData]);
      }

      setShowCreateDialog(false);
      showMessage('success', `Challenge ${editingChallenge ? 'updated' : 'created'} successfully`);
      onChallengeUpdate?.(challengeManager.getAllChallenges());
    } catch (error) {
      showMessage('error', 'Failed to save challenge');
    }
  };

  const handleDeleteChallenge = (challengeId: string) => {
    const updatedChallenges = challenges.filter(c => c.id !== challengeId);
    setChallenges(updatedChallenges);
    showMessage('success', 'Challenge deleted successfully');
    onChallengeUpdate?.(updatedChallenges);
  };

  const handleImportChallenges = async () => {
    setImportExportState('importing');
    try {
      // Basic import functionality for community edition
      const importedChallenges = await tauriChallengeAPI.loadChallengesFromFile('challenges.json');
      showMessage('success', `Imported ${importedChallenges.length} challenges`);
      loadChallenges();
    } catch (error) {
      showMessage('error', 'Failed to import challenges. Please check file format.');
    } finally {
      setImportExportState('idle');
    }
  };

  const handleExportChallenges = async () => {
    setImportExportState('exporting');
    try {
      const exportData = challengeManager.exportChallenges();
      await tauriChallengeAPI.saveChallenges(
        challengeManager.getAllChallenges(),
        'exported-challenges.json'
      );
      showMessage('success', 'Challenges exported successfully');
    } catch (error) {
      showMessage('error', 'Failed to export challenges');
    } finally {
      setImportExportState('idle');
    }
  };

  const addArrayItem = (field: 'requirements', value?: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], value || ''],
    }));
  };

  const updateArrayItem = (field: 'requirements', index: number, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => (i === index ? value : item)),
    }));
  };

  const removeArrayItem = (field: 'requirements', index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  };

  const duplicateChallenge = (challenge: ExtendedChallenge) => {
    const duplicated: ExtendedChallenge = {
      ...challenge,
      id: `${challenge.id}-copy-${Date.now()}`,
      title: `${challenge.title} (Copy)`,
    };
    challengeManager.addCustomChallenge(duplicated);
    setChallenges([...challenges, duplicated]);
    showMessage('success', 'Challenge duplicated successfully');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='max-w-6xl h-[80vh] p-0'>
        <DialogHeader className='p-6 pb-0'>
          <DialogTitle className='flex items-center space-x-2'>
            <BookOpen className='w-5 h-5' />
            <span>Challenge Manager - Community Edition</span>
          </DialogTitle>
          <DialogDescription>
            Create and manage basic system design challenges for learning fundamental concepts
          </DialogDescription>
        </DialogHeader>

        {/* Message Alert */}
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className='px-6'
            >
              <Alert className={message.type === 'success' ? 'border-green-500' : 'border-red-500'}>
                {message.type === 'success' ? (
                  <CheckCircle className='h-4 w-4 text-green-500' />
                ) : (
                  <AlertCircle className='h-4 w-4 text-red-500' />
                )}
                <AlertDescription>{message.text}</AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        <div className='flex-1 overflow-hidden'>
          <Tabs value={currentTab} onValueChange={setCurrentTab} className='h-full flex flex-col'>
            <div className='px-6'>
              <TabsList className='grid w-full grid-cols-2'>
                <TabsTrigger value='challenges'>Challenges ({challenges.length})</TabsTrigger>
                <TabsTrigger value='import-export'>Import/Export</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value='challenges' className='flex-1 overflow-hidden px-6 pb-6'>
              <div className='h-full flex flex-col'>
                {/* Actions Bar */}
                <div className='flex justify-between items-center mb-4'>
                  <div className='flex space-x-2'>
                    <Button
                      onClick={handleCreateChallenge}
                      className='bg-gradient-to-r from-blue-500 to-blue-600'
                    >
                      <Plus className='w-4 h-4 mr-2' />
                      Create Challenge
                    </Button>
                  </div>

                  <div className='text-sm text-muted-foreground'>
                    {challenges.length} challenges available
                  </div>
                </div>

                {/* Challenges List */}
                <ScrollArea className='flex-1'>
                  <div className='space-y-3'>
                    {challenges.map(challenge => (
                      <Card
                        key={challenge.id}
                        className='group hover:shadow-lg transition-all duration-200'
                      >
                        <CardHeader className='pb-3'>
                          <div className='flex items-start justify-between'>
                            <div className='flex-1'>
                              <div className='flex items-center space-x-2 mb-2'>
                                <CardTitle className='text-lg'>{challenge.title}</CardTitle>
                                <Badge variant='outline' className='text-xs capitalize'>
                                  {challenge.difficulty}
                                </Badge>
                                <Badge variant='secondary' className='text-xs'>
                                  {challenge.category.replace('-', ' ')}
                                </Badge>
                              </div>
                              <CardDescription className='text-sm'>
                                {challenge.description}
                              </CardDescription>
                            </div>

                            <div className='flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity'>
                              <Button
                                variant='ghost'
                                size='sm'
                                onClick={() => duplicateChallenge(challenge)}
                                className='h-8 w-8 p-0'
                              >
                                <Copy className='w-3 h-3' />
                              </Button>
                              <Button
                                variant='ghost'
                                size='sm'
                                onClick={() => handleEditChallenge(challenge)}
                                className='h-8 w-8 p-0'
                              >
                                <Edit3 className='w-3 h-3' />
                              </Button>
                              <Button
                                variant='ghost'
                                size='sm'
                                onClick={() => handleDeleteChallenge(challenge.id)}
                                className='h-8 w-8 p-0 text-red-500 hover:text-red-700'
                              >
                                <Trash2 className='w-3 h-3' />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent className='pt-0'>
                          <div className='grid grid-cols-2 md:grid-cols-3 gap-4 text-sm'>
                            <div>
                              <span className='text-muted-foreground'>Requirements:</span>
                              <span className='ml-1 font-medium'>
                                {challenge.requirements.length}
                              </span>
                            </div>
                            <div>
                              <span className='text-muted-foreground'>Time:</span>
                              <span className='ml-1 font-medium'>{challenge.estimatedTime}m</span>
                            </div>
                            <div>
                              <span className='text-muted-foreground'>Tags:</span>
                              <span className='ml-1 font-medium'>
                                {challenge.tags?.length || 0}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                    {challenges.length === 0 && (
                      <div className='text-center py-12'>
                        <BookOpen className='w-12 h-12 mx-auto text-muted-foreground mb-4' />
                        <h3 className='text-lg font-medium mb-2'>No custom challenges yet</h3>
                        <p className='text-muted-foreground mb-4'>
                          Create your first educational challenge to practice system design concepts
                        </p>
                        <Button onClick={handleCreateChallenge}>
                          <Plus className='w-4 h-4 mr-2' />
                          Create Challenge
                        </Button>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </TabsContent>

            <TabsContent value='import-export' className='flex-1 overflow-hidden px-6 pb-6'>
              <div className='h-full'>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-6 h-full'>
                  {/* Import Section */}
                  <Card>
                    <CardHeader>
                      <CardTitle className='flex items-center space-x-2'>
                        <Upload className='w-5 h-5' />
                        <span>Import Challenges</span>
                      </CardTitle>
                      <CardDescription>
                        Import basic challenges from a JSON file for educational use
                      </CardDescription>
                    </CardHeader>
                    <CardContent className='space-y-4'>
                      <Button
                        onClick={handleImportChallenges}
                        disabled={importExportState === 'importing'}
                        className='w-full'
                      >
                        {importExportState === 'importing' ? (
                          <>
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                              className='mr-2'
                            >
                              <Upload className='w-4 h-4' />
                            </motion.div>
                            Importing...
                          </>
                        ) : (
                          <>
                            <Upload className='w-4 h-4 mr-2' />
                            Select File to Import
                          </>
                        )}
                      </Button>

                      <div className='text-sm text-muted-foreground'>
                        <p>Supported formats:</p>
                        <ul className='list-disc list-inside mt-1 space-y-1'>
                          <li>JSON files with basic challenge data</li>
                          <li>Community challenge collections</li>
                        </ul>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Export Section */}
                  <Card>
                    <CardHeader>
                      <CardTitle className='flex items-center space-x-2'>
                        <Download className='w-5 h-5' />
                        <span>Export Challenges</span>
                      </CardTitle>
                      <CardDescription>
                        Save your educational challenges for sharing and backup
                      </CardDescription>
                    </CardHeader>
                    <CardContent className='space-y-4'>
                      <Button
                        onClick={handleExportChallenges}
                        disabled={importExportState === 'exporting' || challenges.length === 0}
                        className='w-full'
                      >
                        {importExportState === 'exporting' ? (
                          <>
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                              className='mr-2'
                            >
                              <Download className='w-4 h-4' />
                            </motion.div>
                            Exporting...
                          </>
                        ) : (
                          <>
                            <Download className='w-4 h-4 mr-2' />
                            Export All Challenges
                          </>
                        )}
                      </Button>

                      <div className='text-sm text-muted-foreground'>
                        <p>Export includes:</p>
                        <ul className='list-disc list-inside mt-1 space-y-1'>
                          <li>All custom challenges</li>
                          <li>Basic challenge metadata</li>
                          <li>Tags and requirements</li>
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Challenge Creation/Edit Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className='max-w-4xl h-[80vh] p-0'>
            <DialogHeader className='p-6 pb-0'>
              <DialogTitle>
                {editingChallenge ? 'Edit Challenge' : 'Create New Challenge'}
              </DialogTitle>
              <DialogDescription>
                {editingChallenge
                  ? 'Modify the educational challenge details'
                  : 'Create a new basic system design challenge for learning'}
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className='flex-1 px-6 pb-6'>
              <div className='space-y-6'>
                {/* Basic Info */}
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div>
                    <Label htmlFor='title'>Title</Label>
                    <Input
                      id='title'
                      value={formData.title}
                      onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder='Challenge title'
                    />
                  </div>

                  <div>
                    <Label htmlFor='id'>ID</Label>
                    <Input
                      id='id'
                      value={formData.id}
                      onChange={e => setFormData(prev => ({ ...prev, id: e.target.value }))}
                      placeholder='unique-challenge-id'
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor='description'>Description</Label>
                  <Textarea
                    id='description'
                    value={formData.description}
                    onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder='Detailed challenge description'
                    rows={3}
                  />
                </div>

                <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                  <div>
                    <Label htmlFor='difficulty'>Difficulty</Label>
                    <Select
                      value={formData.difficulty}
                      onValueChange={(value: Challenge['difficulty']) =>
                        setFormData(prev => ({ ...prev, difficulty: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='beginner'>Beginner</SelectItem>
                        <SelectItem value='intermediate'>Intermediate</SelectItem>
                        <SelectItem value='advanced'>Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor='category'>Category</Label>
                    <Select
                      value={formData.category}
                      onValueChange={value => setFormData(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='system-design'>System Design</SelectItem>
                        <SelectItem value='architecture'>Architecture</SelectItem>
                        <SelectItem value='scaling'>Scaling</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor='estimatedTime'>Estimated Time (minutes)</Label>
                    <Input
                      id='estimatedTime'
                      type='number'
                      value={formData.estimatedTime}
                      onChange={e =>
                        setFormData(prev => ({
                          ...prev,
                          estimatedTime: parseInt(e.target.value) || 30,
                        }))
                      }
                      min='15'
                      max='90'
                      placeholder='30'
                    />
                    <p className='text-xs text-muted-foreground mt-1'>
                      Recommended: 15-60 minutes for educational challenges
                    </p>
                  </div>
                </div>

                {/* Requirements */}
                <div>
                  <div className='flex items-center justify-between mb-2'>
                    <Label>Requirements</Label>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      onClick={() => addArrayItem('requirements')}
                    >
                      <Plus className='w-3 h-3 mr-1' />
                      Add
                    </Button>
                  </div>
                  <p className='text-xs text-muted-foreground mb-2'>
                    Define clear, achievable requirements for learning system design concepts
                  </p>
                  <div className='space-y-2'>
                    {formData.requirements.map((req, index) => (
                      <div key={index} className='flex space-x-2'>
                        <Input
                          value={req}
                          onChange={e => updateArrayItem('requirements', index, e.target.value)}
                          placeholder='e.g., Handle user authentication and basic CRUD operations'
                        />
                        <Button
                          type='button'
                          variant='ghost'
                          size='sm'
                          onClick={() => removeArrayItem('requirements', index)}
                          className='px-2'
                        >
                          <Trash2 className='w-3 h-3' />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <Label htmlFor='tags'>Tags (comma-separated)</Label>
                  <Input
                    id='tags'
                    value={formData.tags.join(', ')}
                    onChange={e =>
                      setFormData(prev => ({
                        ...prev,
                        tags: e.target.value
                          .split(',')
                          .map(tag => tag.trim())
                          .filter(tag => tag !== ''),
                      }))
                    }
                    placeholder='e.g., web-services, databases, authentication'
                  />
                  <p className='text-xs text-muted-foreground mt-1'>
                    Add relevant tags to help categorize your challenge
                  </p>
                </div>
              </div>
            </ScrollArea>

            <div className='flex justify-end space-x-2 p-6 pt-0 border-t'>
              <Button variant='outline' onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveChallenge}>
                <Save className='w-4 h-4 mr-2' />
                {editingChallenge ? 'Update' : 'Create'} Challenge
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
