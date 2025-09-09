import React from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import {
  CheckCircle,
  UserCheck,
  Layers,
  Mic2,
  BrainCog,
  Building2,
  Star,
  MessageCircle,
} from 'lucide-react';

interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const proFeatures: Feature[] = [
  {
    icon: <UserCheck className='w-7 h-7 text-blue-600' aria-hidden='true' />,
    title: 'Personalized Onboarding',
    description:
      'Skill assessment and custom learning paths tailored to your goals. Get started faster and smarter.',
  },
  {
    icon: <Layers className='w-7 h-7 text-purple-600' aria-hidden='true' />,
    title: 'Premium Task Packs',
    description:
      'Access exclusive FAANG-style scenarios and real company challenges to accelerate your growth.',
  },
  {
    icon: <Mic2 className='w-7 h-7 text-pink-600' aria-hidden='true' />,
    title: 'Pro Audio Features',
    description:
      'Automatic transcription, voice analysis, and AI-powered insights for every session.',
  },
  {
    icon: <BrainCog className='w-7 h-7 text-green-600' aria-hidden='true' />,
    title: 'Advanced AI Review',
    description:
      'Detailed feedback, multiple AI providers, and advanced review settings for deeper learning.',
  },
  {
    icon: <Building2 className='w-7 h-7 text-yellow-600' aria-hidden='true' />,
    title: 'Company Templates',
    description:
      'Interview-style templates and industry-specific scenarios to prepare for your dream job.',
  },
];

const testimonials = [
  {
    quote:
      'ArchiComm Pro helped me land my dream job. The advanced AI feedback and real-world challenges made all the difference!',
    name: 'Samantha L.',
    role: 'Software Engineer @ TechCorp',
  },
  {
    quote:
      'The personalized onboarding and premium tasks are a game changer. I felt truly prepared for my interviews.',
    name: 'David K.',
    role: 'Frontend Developer @ FinStart',
  },
];

const faqs = [
  {
    question: 'What is included in ArchiComm Pro?',
    answer:
      'Pro includes personalized onboarding, premium task packs, advanced audio features, AI review, and company templates.',
  },
  {
    question: 'Can I try Pro before upgrading?',
    answer: "Contact us for a free trial or demo. We're happy to help you explore Pro features!",
  },
  {
    question: 'Is Pro suitable for teams?',
    answer:
      'Yes! We offer team plans and custom onboarding for companies. Contact sales for details.',
  },
];

export const ProVersionPage: React.FC = () => {
  return (
    <div className='min-h-screen bg-gradient-to-br from-white to-slate-100 flex flex-col items-center py-10 px-4'>
      {/* Header Section */}
      <div className='max-w-2xl text-center mb-12'>
        <Badge className='mb-4 px-3 py-1 text-base font-semibold bg-blue-50 text-blue-700 border-blue-200'>
          New in Pro
        </Badge>
        <h1 className='text-4xl md:text-5xl font-extrabold mb-4 text-gray-900'>
          Unlock Your Potential with <span className='text-blue-600'>ArchiComm Pro</span>
        </h1>
        <p className='text-lg md:text-xl text-gray-600 mb-6'>
          Supercharge your interview prep and learning with exclusive features, advanced AI, and
          premium content.
        </p>
        <Button asChild size='lg' className='mt-2 px-8 py-3 text-lg font-semibold'>
          <a
            href='https://archicomm.com/upgrade'
            target='_blank'
            rel='noopener noreferrer'
            aria-label='Upgrade to Pro'
          >
            Upgrade to Pro
          </a>
        </Button>
      </div>

      {/* Features Grid */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl w-full mb-16'>
        {proFeatures.map(feature => (
          <Card key={feature.title} className='flex flex-col items-center p-6 shadow-md h-full'>
            <div className='mb-4'>{feature.icon}</div>
            <CardHeader className='text-center p-0 mb-2'>
              <CardTitle className='text-xl font-bold text-gray-900'>{feature.title}</CardTitle>
            </CardHeader>
            <CardContent className='text-gray-600 text-base'>{feature.description}</CardContent>
          </Card>
        ))}
      </div>

      {/* Benefits Section */}
      <div className='max-w-3xl w-full mb-16'>
        <h2 className='text-2xl font-bold mb-4 text-gray-900 flex items-center gap-2'>
          <CheckCircle className='w-6 h-6 text-green-500' aria-hidden='true' />
          Why Go Pro?
        </h2>
        <ul className='list-disc pl-6 text-gray-700 text-lg space-y-2'>
          <li>Accelerate your learning with personalized content</li>
          <li>Practice with real-world, company-style challenges</li>
          <li>Get detailed, actionable feedback from advanced AI</li>
          <li>Save time with automatic transcription and voice analysis</li>
          <li>Access exclusive templates and resources</li>
        </ul>
      </div>

      {/* Social Proof / Testimonials */}
      <div className='max-w-3xl w-full mb-16'>
        <h2 className='text-2xl font-bold mb-6 text-gray-900 flex items-center gap-2'>
          <Star className='w-6 h-6 text-yellow-500' aria-hidden='true' />
          What Our Users Say
        </h2>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          {testimonials.map(t => (
            <Card key={t.name} className='p-6 shadow-sm'>
              <CardContent className='text-gray-700 italic mb-2'>“{t.quote}”</CardContent>
              <div className='flex items-center gap-2 mt-2'>
                <MessageCircle className='w-5 h-5 text-blue-400' aria-hidden='true' />
                <span className='font-semibold text-gray-900'>{t.name}</span>
                <span className='text-gray-500 text-sm'>{t.role}</span>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Pricing Section */}
      <div className='max-w-2xl w-full mb-16 text-center'>
        <h2 className='text-2xl font-bold mb-4 text-gray-900'>Simple, Transparent Pricing</h2>
        <div className='flex flex-col md:flex-row items-center justify-center gap-8'>
          <Card className='p-8 flex-1 min-w-[260px]'>
            <CardHeader className='mb-2 p-0'>
              <CardTitle className='text-xl font-bold text-blue-700'>Pro Individual</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-3xl font-extrabold text-gray-900 mb-2'>
                $12<span className='text-lg font-normal'>/mo</span>
              </div>
              <div className='text-gray-600 mb-4'>Billed annually. Cancel anytime.</div>
              <Button asChild size='lg' className='w-full mt-2'>
                <a
                  href='https://archicomm.com/upgrade'
                  target='_blank'
                  rel='noopener noreferrer'
                  aria-label='Upgrade to Pro Individual'
                >
                  Upgrade
                </a>
              </Button>
            </CardContent>
          </Card>
          <Card className='p-8 flex-1 min-w-[260px] border-2 border-blue-600'>
            <CardHeader className='mb-2 p-0'>
              <CardTitle className='text-xl font-bold text-blue-700 flex items-center gap-2'>
                Pro Team <Badge className='bg-blue-600 text-white ml-2'>Best Value</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-3xl font-extrabold text-gray-900 mb-2'>Custom</div>
              <div className='text-gray-600 mb-4'>
                Team onboarding, admin tools, and volume discounts.
              </div>
              <Button
                asChild
                size='lg'
                variant='outline'
                className='w-full mt-2 border-blue-600 text-blue-700'
              >
                <a
                  href='mailto:sales@archicomm.com?subject=Pro%20Team%20Inquiry'
                  aria-label='Contact Sales'
                >
                  Contact Sales
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* FAQ Section */}
      <div className='max-w-2xl w-full mb-12'>
        <h2 className='text-2xl font-bold mb-6 text-gray-900'>Frequently Asked Questions</h2>
        <div className='space-y-6'>
          {faqs.map(faq => (
            <div key={faq.question} className='bg-white rounded-lg shadow-sm p-5'>
              <div className='font-semibold text-gray-900 mb-1'>{faq.question}</div>
              <div className='text-gray-700 text-base'>{faq.answer}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Final Call-to-Action */}
      <div className='max-w-2xl w-full text-center mb-4'>
        <Button asChild size='lg' className='px-10 py-3 text-lg font-semibold'>
          <a
            href='https://archicomm.com/upgrade'
            target='_blank'
            rel='noopener noreferrer'
            aria-label='Upgrade to Pro'
          >
            Upgrade to Pro
          </a>
        </Button>
        <div className='mt-3 text-gray-500 text-sm'>
          Have questions?{' '}
          <a href='mailto:support@archicomm.com' className='underline text-blue-600'>
            Contact us
          </a>
        </div>
      </div>
    </div>
  );
};

export default ProVersionPage;
