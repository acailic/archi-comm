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
  PlayCircle
} from 'lucide-react';

interface ChallengeSelectionProps {
  onChallengeSelect: (challenge: Challenge) => void;
  availableChallenges?: ExtendedChallenge[];
}

const challenges: Challenge[] = [
  {
    id: 'url-shortener',
    title: 'URL Shortener Service',
    description: 'Design a scalable URL shortening service like bit.ly or tinyurl.com with analytics and custom domains.',
    requirements: [
      'Handle 100M URLs shortened per day',
      'Support custom aliases and domains',
      'Provide real-time analytics and click tracking',
      'Ensure high availability (99.9% uptime)',
      'Implement rate limiting and spam protection'
    ],
    difficulty: 'intermediate',
    estimatedTime: 45,
    category: 'system-design'
  },
  {
    id: 'ecommerce-platform',
    title: 'E-commerce Platform',
    description: 'Create a comprehensive e-commerce platform handling millions of products and users globally.',
    requirements: [
      'Product catalog with search and filtering',
      'Shopping cart and secure checkout flow',
      'Payment processing with multiple providers',
      'Order management and tracking system',
      'User authentication and profile management',
      'Inventory management and supplier integration'
    ],
    difficulty: 'advanced',
    estimatedTime: 60,
    category: 'system-design'
  },
  {
    id: 'notification-system',
    title: 'Multi-Channel Notification System',
    description: 'Scale a notification system to handle millions of users across email, SMS, and push channels.',
    requirements: [
      'Support multiple channels (email, SMS, push, in-app)',
      'Handle 10M+ notifications per day',
      'Ensure delivery guarantees and retry logic',
      'Support user preferences and opt-outs',
      'Provide detailed delivery analytics',
      'Template management and A/B testing'
    ],
    difficulty: 'advanced',
    estimatedTime: 55,
    category: 'scaling'
  },
  {
    id: 'file-storage',
    title: 'Distributed File Storage Service',
    description: 'Build a scalable file storage service like Dropbox with sync, sharing, and version control.',
    requirements: [
      'File upload, download, and streaming',
      'Real-time synchronization across devices',
      'File sharing with granular permissions',
      'Version control and conflict resolution',
      'Storage optimization and deduplication',
      'Cross-platform client applications'
    ],
    difficulty: 'advanced',
    estimatedTime: 70,
    category: 'architecture'
  },
  {
    id: 'ride-sharing',
    title: 'Real-time Ride-sharing Platform',
    description: 'Design a ride-sharing application handling real-time matching, routing, and payments.',
    requirements: [
      'Real-time driver and rider matching',
      'GPS tracking and route optimization',
      'Dynamic pricing and surge handling',
      'Payment processing and splitting',
      'Driver and rider profiles with ratings',
      'Trip history and receipt generation'
    ],
    difficulty: 'intermediate',
    estimatedTime: 50,
    category: 'system-design'
  },
  {
    id: 'social-media',
    title: 'Social Media Feed System',
    description: 'Build a scalable social media platform with timeline generation and content distribution.',
    requirements: [
      'User profiles and friend/follow system',
      'Timeline generation (push vs pull)',
      'Content creation and media handling',
      'Real-time notifications and messaging',
      'Content moderation and spam detection',
      'Analytics and recommendation engine'
    ],
    difficulty: 'advanced',
    estimatedTime: 65,
    category: 'scaling'
  },
  {
    id: 'chat-system',
    title: 'Real-time Chat System',
    description: 'Design a messaging platform supporting millions of concurrent users with rich features.',
    requirements: [
      'Real-time message delivery',
      'Group chats and channels',
      'File sharing and media messages',
      'Message encryption and security',
      'Online presence and typing indicators',
      'Message history and search'
    ],
    difficulty: 'intermediate',
    estimatedTime: 40,
    category: 'system-design'
  },
  {
    id: 'search-engine',
    title: 'Distributed Search Engine',
    description: 'Build a search engine capable of indexing and searching billions of web pages.',
    requirements: [
      'Web crawling and content indexing',
      'Distributed search infrastructure',
      'Ranking algorithm implementation',
      'Query processing and optimization',
      'Auto-complete and spell correction',
      'Search analytics and insights'
    ],
    difficulty: 'advanced',
    estimatedTime: 80,
    category: 'architecture'
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

  // Use available challenges if provided, otherwise fall back to default challenges
  const allChallenges = availableChallenges && availableChallenges.length > 0 ? availableChallenges : challenges;

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
                      <Card className="h-full cursor-pointer transition-all duration-300 hover:shadow-2xl border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
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
                            </div>
                          </div>

                          <CardTitle className="text-lg leading-tight group-hover:text-primary transition-colors">
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

                          {/* Tags (for extended challenges) */}
                          {'tags' in challenge && challenge.tags && challenge.tags.length > 0 && (
                            <div className="mb-4">
                              <div className="flex flex-wrap gap-1">
                                {challenge.tags.slice(0, 4).map((tag, tagIndex) => (
                                  <Badge key={tagIndex} variant="outline" className="text-xs px-1.5 py-0.5">
                                    {tag}
                                  </Badge>
                                ))}
                                {challenge.tags.length > 4 && (
                                  <Badge variant="outline" className="text-xs px-1.5 py-0.5 opacity-60">
                                    +{challenge.tags.length - 4}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}

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