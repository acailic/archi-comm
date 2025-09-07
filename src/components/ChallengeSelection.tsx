import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Challenge } from '../App';
import { ExtendedChallenge } from '../lib/challenge-config';
import { 
  Search,
  Clock,
  TrendingUp,
  Target,
  Database,
  ArrowRight,
  PlayCircle,
  Lock,
  Star
} from 'lucide-react';

interface ChallengeSelectionProps {
  onChallengeSelect: (challenge: Challenge) => void;
  availableChallenges?: ExtendedChallenge[];
}

// ArchiComm Community Edition - Basic Educational Challenges
// Focused on fundamental system design concepts for learning
const challenges: Challenge[] = [
  {
    id: 'todo-app',
    title: 'Todo List Application',
    description: 'Design a simple todo list application with user accounts and basic CRUD operations.',
    requirements: [
      'User registration and authentication',
      'Create, read, update, delete todos',
      'Mark todos as complete/incomplete',
      'Basic data persistence',
      'Simple user interface'
    ],
    difficulty: 'beginner',
    estimatedTime: 20,
    category: 'system-design'
  },
  {
    id: 'blog-platform',
    title: 'Simple Blog Platform',
    description: 'Create a basic blogging platform where users can write and publish articles.',
    requirements: [
      'User authentication and profiles',
      'Create and edit blog posts',
      'View published articles',
      'Basic commenting system',
      'Simple search functionality'
    ],
    difficulty: 'beginner',
    estimatedTime: 25,
    category: 'system-design'
  },
  {
    id: 'url-shortener',
    title: 'URL Shortener Service',
    description: 'Design a scalable URL shortening service like bit.ly with basic analytics.',
    requirements: [
      'Shorten long URLs to unique short codes',
      'Redirect short URLs to original URLs',
      'Basic click tracking and analytics',
      'Custom alias support',
      'Simple rate limiting'
    ],
    difficulty: 'intermediate',
    estimatedTime: 45,
    category: 'system-design'
  },
  {
    id: 'chat-system',
    title: 'Real-time Chat System',
    description: 'Design a basic messaging platform with real-time communication features.',
    requirements: [
      'Real-time message delivery',
      'User authentication and profiles',
      'Basic group chat functionality',
      'Message history storage',
      'Online presence indicators'
    ],
    difficulty: 'intermediate',
    estimatedTime: 40,
    category: 'system-design'
  },
  {
    id: 'ride-sharing',
    title: 'Real-time Ride-sharing Platform',
    description: 'Design a simplified ride-sharing application with basic matching and tracking.',
    requirements: [
      'Driver and rider registration',
      'Basic location tracking',
      'Simple ride matching algorithm',
      'Trip booking and management',
      'Basic rating system'
    ],
    difficulty: 'intermediate',
    estimatedTime: 50,
    category: 'system-design'
  }
];

const difficultyColors = {
  beginner: 'from-green-500 to-green-600',
  intermediate: 'from-yellow-500 to-orange-500',
  advanced: 'from-red-500 to-red-600'
};

const categoryIcons = {
  'system-design': Target,
  'architecture': Database,
  'scaling': TrendingUp
};

export function ChallengeSelection({ onChallengeSelect, availableChallenges }: ChallengeSelectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);


  // Simulate some premium challenges for Pro
  const premiumChallengeIds = ['faang-system', 'company-template'];
  const proChallenges: Challenge[] = [
    {
      id: 'faang-system',
      title: 'FAANG-Style System Design',
      description: 'Tackle a real interview scenario inspired by top tech companies. Available in Pro.',
      requirements: [
        'Design a scalable social network feed',
        'Handle millions of users',
        'Real-time notifications',
        'Advanced caching and sharding',
        'High availability and disaster recovery'
      ],
      difficulty: 'advanced',
      estimatedTime: 60,
      category: 'system-design'
    },
    {
      id: 'company-template',
      title: 'Company-Specific Template',
      description: 'Practice with an interview template tailored for your target company. Available in Pro.',
      requirements: [
        'Industry-specific scenario',
        'Custom evaluation criteria',
        'Role-based requirements',
        'Real company constraints',
        'Advanced business logic'
      ],
      difficulty: 'advanced',
      estimatedTime: 70,
      category: 'system-design'
    }
  ];

  // Use available challenges if provided, otherwise fall back to default challenges
  const allChallenges = [
    ...(availableChallenges && availableChallenges.length > 0 ? availableChallenges : challenges),
    ...proChallenges
  ];

  const filteredChallenges = useMemo(() => {
    return allChallenges.filter(challenge => {
      const matchesSearch = 
        challenge.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        challenge.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        challenge.requirements.some(req => 
          req.toLowerCase().includes(searchQuery.toLowerCase())
        ) ||
        (challenge.tags && challenge.tags.some(tag => 
          tag.toLowerCase().includes(searchQuery.toLowerCase())
        ));
      
      const matchesDifficulty = 
        selectedDifficulty === 'all' || challenge.difficulty === selectedDifficulty;
      
      const matchesCategory = 
        selectedCategory === 'all' || challenge.category === selectedCategory;
      
      return matchesSearch && matchesDifficulty && matchesCategory;
    });
  }, [searchQuery, selectedDifficulty, selectedCategory, allChallenges]);

  const stats = {
    total: allChallenges.length,
    beginner: allChallenges.filter(c => c.difficulty === 'beginner').length,
    intermediate: allChallenges.filter(c => c.difficulty === 'intermediate').length,
    advanced: allChallenges.filter(c => c.difficulty === 'advanced').length,
    avgTime: Math.round(allChallenges.reduce((acc, c) => acc + c.estimatedTime, 0) / allChallenges.length)
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-background via-background to-muted/5">
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="bg-card/50 backdrop-blur-sm border-b border-border/30 px-8 py-6"
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <motion.h1 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="text-3xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent mb-2"
              >
                Choose Your Challenge
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="text-muted-foreground text-lg"
              >
                Select a system design scenario to practice your skills
              </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="text-right"
            >
              <div className="text-sm text-muted-foreground mb-1">Available Challenges</div>
              <div className="text-3xl font-bold text-primary">{allChallenges.length}</div>
            </motion.div>
          </div>

          {/* Pro Upgrade Banner */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-4 mb-6">
            <Star className="w-6 h-6 text-yellow-500" />
            <div className="flex-1">
              <div className="font-semibold text-yellow-800">Unlock Premium Challenges</div>
              <div className="text-sm text-yellow-700">FAANG-style scenarios and company-specific templates are available in <span className="font-semibold">ArchiComm Pro</span>.</div>
            </div>
            <Button
              size="sm"
              className="bg-yellow-500 hover:bg-yellow-600 text-white"
              onClick={() => window.dispatchEvent(new CustomEvent('shortcut:navigate-to-screen', { detail: { screen: 'pro-version' } }))}
            >
              Upgrade to Pro
            </Button>
          </div>

          {/* Quick Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
          >
            {[
              { label: 'Beginner', value: stats.beginner, color: 'text-green-500' },
              { label: 'Intermediate', value: stats.intermediate, color: 'text-yellow-500' },
              { label: 'Advanced', value: stats.advanced, color: 'text-red-500' },
              { label: 'Avg Time', value: `${stats.avgTime}m`, color: 'text-blue-500' }
            ].map((stat, index) => (
              <div key={stat.label} className="bg-muted/30 rounded-lg p-3 text-center">
                <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </motion.div>

      {/* Filters Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="bg-card/30 backdrop-blur-sm border-b border-border/20 px-8 py-4"
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search challenges..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background/50 border-border/50"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-2">
              <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                <SelectTrigger className="w-40 bg-background/50 border-border/50">
                  <SelectValue placeholder="Difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-40 bg-background/50 border-border/50">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="system-design">System Design</SelectItem>
                  <SelectItem value="architecture">Architecture</SelectItem>
                  <SelectItem value="scaling">Scaling</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Challenges Grid */}
      <div className="flex-1 overflow-auto px-8 py-6">
        <div className="max-w-6xl mx-auto">
          {filteredChallenges.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <div className="w-16 h-16 mx-auto mb-4 bg-muted/50 rounded-full flex items-center justify-center">
                <Search className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No challenges found</h3>
              <p className="text-muted-foreground">Try adjusting your search criteria</p>
            </motion.div>
          ) : (
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.5 }}
            >
              <AnimatePresence>
                {filteredChallenges.map((challenge, index) => {
                  const CategoryIcon = categoryIcons[challenge.category];
                  const isPremium = premiumChallengeIds.includes(challenge.id);
                  return (
                    <motion.div
                      key={challenge.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      whileHover={{ y: -8, scale: 1.02 }}
                      onHoverStart={() => setHoveredCard(challenge.id)}
                      onHoverEnd={() => setHoveredCard(null)}
                      className="group"
                    >
                      <Card className={`h-full transition-all duration-300 hover:shadow-2xl border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden ${isPremium ? 'opacity-80' : 'cursor-pointer'}`}
                        >
                        {/* Card Header with gradient */}
                        <div className={`h-2 bg-gradient-to-r ${difficultyColors[challenge.difficulty]}`} />
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between mb-3">
                            <div className={`p-2 rounded-lg bg-gradient-to-r ${difficultyColors[challenge.difficulty]} bg-opacity-10`}>
                              <CategoryIcon className="w-5 h-5 text-primary" />
                            </div>
                            <div className="flex items-center space-x-1">
                              <Badge 
                                variant="outline" 
                                className={`text-xs capitalize border-current`}
                                style={{ 
                                  color: challenge.difficulty === 'beginner' ? '#10b981' :
                                         challenge.difficulty === 'intermediate' ? '#f59e0b' : '#ef4444'
                                }}
                              >
                                {challenge.difficulty}
                              </Badge>
                              {isPremium && (
                                <Badge className="ml-2 bg-yellow-500 text-white flex items-center gap-1">
                                  <Lock className="w-3 h-3 mr-1" /> Pro
                                </Badge>
                              )}
                            </div>
                          </div>
                          <CardTitle className="text-lg leading-tight group-hover:text-primary transition-colors flex items-center gap-2">
                            {challenge.title}
                          </CardTitle>
                          <CardDescription className="text-sm leading-relaxed">
                            {challenge.description}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {/* Requirements Preview */}
                          <div className="mb-4">
                            <h4 className="text-sm font-medium mb-2 flex items-center">
                              <Target className="w-3 h-3 mr-1" />
                              Key Requirements
                            </h4>
                            <ul className="space-y-1">
                              {challenge.requirements.slice(0, 3).map((req, reqIndex) => (
                                <motion.li
                                  key={reqIndex}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.1 * reqIndex }}
                                  className="text-xs text-muted-foreground flex items-start"
                                >
                                  <span className="w-1 h-1 rounded-full bg-primary mr-2 mt-1.5 flex-shrink-0" />
                                  <span>{req}</span>
                                </motion.li>
                              ))}
                              {challenge.requirements.length > 3 && (
                                <li className="text-xs text-muted-foreground/60">
                                  +{challenge.requirements.length - 3} more requirements...
                                </li>
                              )}
                            </ul>
                          </div>
                          {/* Metadata */}
                          <div className="flex items-center justify-between mb-4 text-xs text-muted-foreground">
                            <div className="flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>~{challenge.estimatedTime} min</span>
                            </div>
                            <Badge variant="secondary" className="text-xs capitalize">
                              {challenge.category.replace('-', ' ')}
                            </Badge>
                          </div>
                          {/* Action Button */}
                          {isPremium ? (
                            <Button
                              className="w-full bg-yellow-500 hover:bg-yellow-600 text-white"
                              onClick={() => window.dispatchEvent(new CustomEvent('shortcut:navigate-to-screen', { detail: { screen: 'pro-version' } }))}
                            >
                              <Lock className="w-4 h-4 mr-2" />
                              <span>Unlock with Pro</span>
                            </Button>
                          ) : (
                            <Button
                              onClick={() => onChallengeSelect(challenge)}
                              className="w-full group/btn bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300"
                            >
                              <PlayCircle className="w-4 h-4 mr-2 group-hover/btn:scale-110 transition-transform" />
                              <span>Start Challenge</span>
                              <motion.div
                                animate={{ 
                                  x: hoveredCard === challenge.id ? [0, 4, 0] : 0 
                                }}
                                transition={{ duration: 0.5, repeat: Infinity }}
                                className="ml-2"
                              >
                                <ArrowRight className="w-4 h-4" />
                              </motion.div>
                            </Button>
                          )}
                        </CardContent>
                        {/* Hover overlay */}
                        <AnimatePresence>
                          {hoveredCard === challenge.id && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none"
                            />
                          )}
                        </AnimatePresence>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
