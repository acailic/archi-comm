import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { 
  Zap, 
  Target, 
  Mic, 
  BarChart3, 
  ArrowRight, 
  Sparkles,
  Brain,
  Users,
  TrendingUp,
  CheckCircle
} from 'lucide-react';

interface WelcomeOverlayProps {
  onComplete: () => void;
}

const features = [
  {
    icon: Target,
    title: 'System Design Challenges',
    description: 'Practice with real-world scenarios from top tech companies',
    color: 'from-blue-500 to-blue-600'
  },
  {
    icon: Brain,
    title: 'Interactive Design Canvas',
    description: 'Drag-and-drop components to build scalable architectures',
    color: 'from-purple-500 to-purple-600'
  },
  {
    icon: Mic,
    title: 'Communication Practice',
    description: 'Record explanations and get AI-powered feedback',
    color: 'from-green-500 to-green-600'
  },
  {
    icon: BarChart3,
    title: 'Performance Analytics',
    description: 'Track your progress with detailed metrics and insights',
    color: 'from-orange-500 to-orange-600'
  }
];

const benefits = [
  'Master system design interviews',
  'Improve technical communication',
  'Build portfolio-worthy projects',
  'Learn from expert feedback'
];

export function WelcomeOverlay({ onComplete }: WelcomeOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showFeatures, setShowFeatures] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowFeatures(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const handleGetStarted = () => {
    onComplete();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 bg-gradient-to-br from-background via-background/95 to-primary/5 backdrop-blur-xl z-50 overflow-auto"
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.3),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(120,198,179,0.2),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(198,120,179,0.2),transparent_50%)]" />
      </div>

      <div className="relative min-h-full flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-6xl mx-auto">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            {/* Logo/Icon */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 0.8, delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto mb-8 w-24 h-24 bg-gradient-to-r from-primary via-primary to-primary/80 rounded-3xl flex items-center justify-center shadow-2xl relative overflow-hidden"
            >
              <motion.div
                animate={{ 
                  boxShadow: [
                    "0 0 20px rgba(120,119,198,0.5)",
                    "0 0 40px rgba(120,119,198,0.8)",
                    "0 0 20px rgba(120,119,198,0.5)"
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 rounded-3xl"
              />
              <Zap className="w-12 h-12 text-primary-foreground" />
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-6xl font-bold bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent mb-6"
            >
              ArchiComm
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed"
            >
              Master system design and technical communication through interactive practice sessions.
              <br />
              <span className="text-foreground font-medium">Build. Explain. Excel.</span>
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="flex flex-wrap justify-center gap-2 mb-8"
            >
              <Badge variant="secondary" className="px-3 py-1 text-sm">
                <Users className="w-4 h-4 mr-1" />
                Interview Ready
              </Badge>
              <Badge variant="secondary" className="px-3 py-1 text-sm">
                <TrendingUp className="w-4 h-4 mr-1" />
                Skill Building
              </Badge>
              <Badge variant="secondary" className="px-3 py-1 text-sm">
                <Sparkles className="w-4 h-4 mr-1" />
                AI Powered
              </Badge>
            </motion.div>
          </motion.div>

          {/* Features Grid */}
          <AnimatePresence>
            {showFeatures && (
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16"
              >
                {features.map((feature, index) => (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                  >
                    <Card className="h-full group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border border-border/50 bg-card/80 backdrop-blur-sm">
                      <CardContent className="p-6 text-center">
                        <motion.div
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          transition={{ type: "spring", stiffness: 300 }}
                          className={`mx-auto mb-4 w-14 h-14 bg-gradient-to-r ${feature.color} rounded-2xl flex items-center justify-center shadow-lg`}
                        >
                          <feature.icon className="w-7 h-7 text-white" />
                        </motion.div>
                        <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
                          {feature.title}
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {feature.description}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Benefits Section */}
          <AnimatePresence>
            {showFeatures && (
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="text-center mb-16"
              >
                <h2 className="text-3xl font-bold mb-8 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                  Why Choose ArchiComm?
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                  {benefits.map((benefit, index) => (
                    <motion.div
                      key={benefit}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
                      className="flex items-center space-x-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-all duration-200"
                    >
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span className="text-foreground">{benefit}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* CTA Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: showFeatures ? 1 : 0.8 }}
            className="text-center"
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                onClick={handleGetStarted}
                size="lg"
                className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-primary-foreground px-8 py-4 text-lg font-medium shadow-2xl hover:shadow-primary/25 transition-all duration-300 group"
              >
                <span className="mr-2">Start Your Journey</span>
                <motion.div
                  animate={{ x: [0, 4, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <ArrowRight className="w-5 h-5" />
                </motion.div>
              </Button>
            </motion.div>
            
            <p className="text-sm text-muted-foreground mt-4">
              No signup required • Free to use • Desktop optimized
            </p>
          </motion.div>

          {/* Floating Elements */}
          <motion.div
            animate={{ 
              y: [0, -10, 0],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-20 left-20 w-2 h-2 bg-primary rounded-full"
          />
          <motion.div
            animate={{ 
              y: [0, -15, 0],
              opacity: [0.3, 0.8, 0.3]
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute top-32 right-32 w-3 h-3 bg-green-500 rounded-full"
          />
          <motion.div
            animate={{ 
              y: [0, -8, 0],
              opacity: [0.4, 0.9, 0.4]
            }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            className="absolute bottom-40 left-40 w-2 h-2 bg-purple-500 rounded-full"
          />
        </div>
      </div>
    </motion.div>
  );
}