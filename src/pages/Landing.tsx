import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { DemoVideoModal } from '@/components/DemoVideoModal';
import { LandingNav } from '@/components/LandingNav';
import { AuthModal } from '@/components/AuthModal';
import { Footer } from '@/components/Footer';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Users,
  Bot,
  Shield,
  ArrowRight,
  Play,
  CheckCircle2,
  Zap,
  Sparkles,
  PencilLine,
} from 'lucide-react';

const executives = [
  {
    name: 'Dr. Anya Sharma',
    title: 'CTO',
    role: 'Chief Technology Officer',
    description:
      'AI/ML strategy, technical architecture, ethical AI, subagent orchestration',
    gradient: 'from-blue-500 to-cyan-500',
    photo: '/executives/anya.png',
  },
  {
    name: 'Mr. Omar Al-Farsi',
    title: 'CFO',
    role: 'Chief Financial Officer',
    description:
      'Treasury management, global markets, tokenomics, fiscal strategy',
    gradient: 'from-amber-500 to-yellow-500',
    photo: '/executives/omar.png',
  },
  {
    name: 'Ms. Isabella Rodriguez',
    title: 'CMO',
    role: 'Chief Marketing Officer',
    description:
      'Brand storytelling, viral growth, consumer psychology, content strategy',
    gradient: 'from-pink-500 to-rose-500',
    photo: '/executives/bella.png',
  },
  {
    name: 'Mr. Klaus Richter',
    title: 'COO',
    role: 'Chief Operations Officer',
    description:
      'Process optimization, agent pipelines, operational excellence',
    gradient: 'from-slate-500 to-gray-600',
    photo: '/executives/klaus.png',
  },
  {
    name: 'Ms. Akari Tanaka',
    title: 'CPO',
    role: 'Chief People Officer',
    description: 'Talent development, inclusive culture, community governance',
    gradient: 'from-teal-500 to-emerald-500',
    photo: '/executives/akari.png',
  },
];

const benefits = [
  { icon: Zap, value: '$12.4M', label: 'Average C-Suite Savings' },
  { icon: Users, value: '41%', label: 'Employee Salary Increase' },
  { icon: Bot, value: '120+', label: 'Autonomous Functions' },
  { icon: Shield, value: '24/7', label: 'Always-On Operations' },
];

const steps = [
  {
    number: '01',
    title: 'Connect Your Stack',
    description: 'Link Google, GitHub, Supabase, Drive, and your preferred cloud tools.',
  },
  {
    number: '02',
    title: 'Set Outcomes',
    description: 'Give Suite objectives, constraints, and brand context once.',
  },
  {
    number: '03',
    title: 'Review and Publish',
    description: 'Approve and ship campaigns, updates, and workflows across channels.',
  },
];

const heroStickyNotes = [
  {
    id: 'left-strategy',
    title: 'Planning',
    text: 'Mapping Q2 campaign goals',
    position: 'left',
    rotation: '-9deg',
    mobileRotation: '-7deg',
    accentClassName: 'from-yellow-200 via-amber-100 to-yellow-50',
    style: { top: '6%', left: '4%' },
    mobileStyle: { top: '-2%', left: '-8%' },
  },
  {
    id: 'right-ops',
    title: 'Operations',
    text: 'Syncing GitHub and Supabase',
    position: 'right',
    rotation: '8deg',
    mobileRotation: '6deg',
    accentClassName: 'from-yellow-100 via-amber-50 to-yellow-50',
    style: { top: '18%', right: '2%' },
    mobileStyle: { top: '21%', right: '-6%' },
  },
  {
    id: 'right-draft',
    title: 'Admin',
    text: 'Scheduling social posts',
    position: 'right',
    rotation: '-4deg',
    mobileRotation: '-3deg',
    accentClassName: 'from-amber-200 via-yellow-100 to-yellow-50',
    style: { top: '54%', right: '8%' },
    mobileStyle: { top: '62%', right: '-3%' },
  },
] as const;

const sectionStickyNotes = [
  {
    id: 'exec-left',
    section: 'executives',
    title: 'Hiring',
    text: 'Briefing executive agents',
    rotation: '-6deg',
    accentClassName: 'from-yellow-200 via-amber-100 to-yellow-50',
    style: { top: '10%', left: '2%' },
  },
  {
    id: 'exec-right',
    section: 'executives',
    title: 'Growth',
    text: 'Planning multi-channel launch',
    rotation: '7deg',
    accentClassName: 'from-yellow-100 via-amber-50 to-yellow-50',
    style: { bottom: '8%', right: '2%' },
  },
  {
    id: 'benefits-right',
    section: 'benefits',
    title: 'Savings',
    text: 'Tracking forecast impact',
    rotation: '6deg',
    accentClassName: 'from-amber-200 via-yellow-100 to-yellow-50',
    style: { top: '16%', right: '2%' },
  },
  {
    id: 'how-left',
    section: 'how-it-works',
    title: 'Process',
    text: 'Automating recurring ops',
    rotation: '-5deg',
    accentClassName: 'from-yellow-200 via-amber-100 to-yellow-50',
    style: { bottom: '10%', left: '3%' },
  },
  {
    id: 'cta-right',
    section: 'cta',
    title: 'Action',
    text: 'Start your free trial',
    rotation: '8deg',
    accentClassName: 'from-yellow-100 via-amber-50 to-yellow-50',
    style: { top: '10%', right: '4%' },
  },
] as const;

export default function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();
  const { t } = useLanguage();
  const [demoOpen, setDemoOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  const handleGetStarted = async () => {
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      setAuthModalOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Lightweight Background - reduced blur for performance */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />

        {/* Single animated blob - reduced from 3 */}
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-xl opacity-60" />

        {/* Grid pattern - lighter */}
        <div className="absolute inset-0 bg-[linear-gradient(hsl(var(--primary)/0.015)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--primary)/0.015)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,black,transparent)]" />
      </div>

      {/* Navigation with Auth Modal */}
      <LandingNav />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-24 pb-10 px-4">
        <div className="pointer-events-none absolute inset-0 hidden xl:block" aria-hidden="true">
          {heroStickyNotes.map((note, index) => (
            <div
              key={note.id}
              className={`sticky-note-hero absolute hidden w-[198px] xl:block ${note.position === 'left' ? '2xl:left-[8%]' : '2xl:right-[7%]'}`}
              style={{
                ...note.style,
                ['--sticky-rotate' as string]: note.rotation,
                ['--sticky-duration' as string]: `${3.1 + index * 0.35}s`,
                ['--sticky-delay' as string]: `${index * 220}ms`,
              }}
            >
              <div className="sticky-note-hero__shadow" />
              <div className={`sticky-note-hero__paper bg-gradient-to-br ${note.accentClassName}`}>
                <div className="sticky-note-hero__tape" />
                <div className="sticky-note-hero__pin" />
                <div className="sticky-note-hero__fold" />
                <div className="mt-8 text-left">
                  <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-amber-950/55">
                    <Sparkles className="h-3.5 w-3.5 text-amber-900/55" />
                    {note.title}
                  </div>
                  <p className="sticky-note-handwriting mt-3 text-[26px] leading-[1.05] text-black/88">
                    {note.text}
                  </p>
                  <div className="mt-4 space-y-2.5">
                    <div className="h-px w-[84%] bg-black/10" />
                    <div className="h-px w-[68%] bg-black/10" />
                    <div className="h-px w-[74%] bg-black/10" />
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-[11px] text-black/55">
                    <PencilLine className="h-3.5 w-3.5" />
                    <span className="sticky-note-handwriting text-sm tracking-[0.02em] text-black/70">daily deliverable</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="container mx-auto max-w-5xl pt-4 text-center sm:pt-44 xl:pt-0">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
            {t('landing.hero.title.part1')}{' '}
            <span className="bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
              {t('landing.hero.title.part2')}
            </span>
            <br />
            <span className="text-foreground/90">
              {t('landing.hero.title.part3')}
            </span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            {t('landing.hero.subtitle')}
          </p>

          <div className="relative mb-16 xl:hidden">
            <div className="pointer-events-none absolute inset-x-0 -top-3 mx-auto h-[24rem] max-w-sm" aria-hidden="true">
              {heroStickyNotes.map((note, index) => (
                <div
                  key={`mobile-${note.id}`}
                  className="sticky-note-hero absolute w-[124px]"
                  style={{
                    ...note.mobileStyle,
                    ['--sticky-rotate' as string]: note.mobileRotation,
                    ['--sticky-duration' as string]: `${3.1 + index * 0.35}s`,
                    ['--sticky-delay' as string]: `${index * 220}ms`,
                  }}
                >
                  <div className="sticky-note-hero__shadow" />
                  <div className={`sticky-note-hero__paper bg-gradient-to-br ${note.accentClassName} !min-h-[122px] !p-3`}>
                    <div className="sticky-note-hero__tape" />
                    <div className="sticky-note-hero__pin" />
                    <div className="sticky-note-hero__fold" />
                    <div className="mt-5 text-left">
                      <div className="flex items-center gap-1.5 text-[8px] font-semibold uppercase tracking-[0.2em] text-amber-950/55">
                        <Sparkles className="h-3 w-3 text-amber-900/55" />
                        {note.title}
                      </div>
                      <p className="sticky-note-handwriting mt-2 text-[15px] leading-[1.08] text-black/88">
                        {note.text}
                      </p>
                      <div className="mt-2.5 space-y-1.5">
                        <div className="h-px w-[84%] bg-black/10" />
                        <div className="h-px w-[68%] bg-black/10" />
                        <div className="h-px w-[74%] bg-black/10" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mx-auto max-w-sm px-8 pb-12 pt-44">
              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Button
                  size="lg"
                  onClick={handleGetStarted}
                  className="text-lg px-8 py-6 bg-primary hover:bg-primary/90"
                >
                  {t('landing.hero.start.trial')}
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="text-lg px-8 py-6 border-primary/30 hover:border-primary/60 hover:bg-primary/5"
                  onClick={() => setDemoOpen(true)}
                >
                  <Play className="mr-2 w-5 h-5" />
                  {t('landing.hero.watch.demo')}
                </Button>
              </div>
            </div>
          </div>

          <div className="hidden xl:flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Button
              size="lg"
              onClick={handleGetStarted}
              className="text-lg px-8 py-6 bg-primary hover:bg-primary/90"
            >
              {t('landing.hero.start.trial')}
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-8 py-6 border-primary/30 hover:border-primary/60 hover:bg-primary/5"
              onClick={() => setDemoOpen(true)}
            >
              <Play className="mr-2 w-5 h-5" />
              {t('landing.hero.watch.demo')}
            </Button>
          </div>

          {/* Stats Row - show final values immediately for fast scrollers */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {[
              { icon: Zap, value: '$12.4M', label: t('landing.stats.savings') },
              { icon: Users, value: '41%', label: t('landing.stats.salary') },
              { icon: Bot, value: '120+', label: t('landing.stats.functions') },
              {
                icon: Shield,
                value: '24/7',
                label: t('landing.stats.operations'),
              },
            ].map((benefit, i) => (
              <div
                key={i}
                className="p-5 rounded-2xl bg-card/50 border border-border/50 hover:border-primary/40 hover:bg-card/80 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <benefit.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="text-2xl md:text-3xl font-bold">
                  {benefit.value}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {benefit.label}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            * Forecast metrics are generated from Suite AI forecasts and executive swarm predictive analysis.
          </p>
        </div>
      </section>

      {/* AI Executives Section */}
      <section id="executives" className="py-12 px-4 relative scroll-mt-20">
        <div className="pointer-events-none absolute inset-0 hidden xl:block" aria-hidden="true">
          {sectionStickyNotes
            .filter((note) => note.section === 'executives')
            .map((note, index) => (
              <div
                key={note.id}
                className="sticky-note-hero absolute w-[168px] 2xl:w-[184px]"
                style={{
                  ...note.style,
                  ['--sticky-rotate' as string]: note.rotation,
                  ['--sticky-duration' as string]: `${3.1 + index * 0.35}s`,
                  ['--sticky-delay' as string]: `${index * 180}ms`,
                }}
              >
                <div className="sticky-note-hero__shadow" />
                <div className={`sticky-note-hero__paper bg-gradient-to-br ${note.accentClassName}`}>
                  <div className="sticky-note-hero__tape" />
                  <div className="sticky-note-hero__pin" />
                  <div className="sticky-note-hero__fold" />
                  <div className="mt-8 text-left">
                    <div className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-amber-950/55">
                      <Sparkles className="h-3 w-3 text-amber-900/55" />
                      {note.title}
                    </div>
                    <p className="sticky-note-handwriting mt-2 text-[20px] leading-[1.06] text-black/88">
                      {note.text}
                    </p>
                  </div>
                </div>
              </div>
            ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-muted/20 to-transparent" />

        <div className="container mx-auto max-w-6xl relative">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              {t('landing.executives.title')}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              {t('landing.executives.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6">
            {executives.map((exec, i) => (
              <Card
                key={i}
                className="group hover:shadow-xl hover:-translate-y-2 transition-all duration-300 border-border/50 bg-card/80 overflow-hidden"
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${exec.gradient} opacity-0 group-hover:opacity-5 transition-opacity`}
                />

                <CardContent className="p-6 relative text-center">
                  {/* Portrait photo with gradient fallback */}
                  <div className="relative mx-auto mb-4 w-20 h-20">
                    <div
                      className={`w-20 h-20 rounded-full bg-gradient-to-br ${exec.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform overflow-hidden border-2 border-primary/20`}
                    >
                      <img
                        src={exec.photo}
                        alt={exec.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.currentTarget as HTMLImageElement;
                          target.style.display = 'none';
                          const fallback =
                            target.nextElementSibling as HTMLElement;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                      <span className="text-3xl hidden items-center justify-center w-full h-full"></span>
                    </div>
                    {/* Online indicator */}
                    <div className="absolute bottom-1 right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-card" />
                  </div>
                  <div className="text-base font-bold mb-0.5 group-hover:text-primary transition-colors leading-tight">
                    {exec.name}
                  </div>
                  <div
                    className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mb-2 bg-gradient-to-r ${exec.gradient} text-white`}
                  >
                    {exec.title}
                  </div>
                  <div className="text-xs text-primary font-medium mb-2">
                    {exec.role}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {exec.description}
                  </p>

                  <div
                    className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${exec.gradient} transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left`}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Why Section */}
      <section id="benefits" className="relative py-12 px-4 scroll-mt-20">
        <div className="pointer-events-none absolute inset-0 hidden xl:block" aria-hidden="true">
          {sectionStickyNotes
            .filter((note) => note.section === 'benefits')
            .map((note, index) => (
              <div
                key={note.id}
                className="sticky-note-hero absolute w-[168px]"
                style={{
                  ...note.style,
                  ['--sticky-rotate' as string]: note.rotation,
                  ['--sticky-duration' as string]: `${3.1 + index * 0.35}s`,
                  ['--sticky-delay' as string]: `${index * 180}ms`,
                }}
              >
                <div className="sticky-note-hero__shadow" />
                <div className={`sticky-note-hero__paper bg-gradient-to-br ${note.accentClassName}`}>
                  <div className="sticky-note-hero__tape" />
                  <div className="sticky-note-hero__pin" />
                  <div className="sticky-note-hero__fold" />
                  <div className="mt-8 text-left">
                    <div className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-amber-950/55">
                      <Sparkles className="h-3 w-3 text-amber-900/55" />
                      {note.title}
                    </div>
                    <p className="sticky-note-handwriting mt-2 text-[20px] leading-[1.06] text-black/88">
                      {note.text}
                    </p>
                  </div>
                </div>
              </div>
            ))}
        </div>
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              {t('landing.benefits.title')}
            </h2>
            <p className="text-muted-foreground text-lg">
              {t('landing.benefits.subtitle')}
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              {[
                {
                  title: t('landing.benefits.cost.title'),
                  desc: t('landing.benefits.cost.desc'),
                },
                {
                  title: t('landing.benefits.empowerment.title'),
                  desc: t('landing.benefits.empowerment.desc'),
                },
                {
                  title: t('landing.benefits.autonomous.title'),
                  desc: t('landing.benefits.autonomous.desc'),
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="group flex gap-4 p-5 rounded-2xl hover:bg-muted/50 border border-transparent hover:border-border/50 transition-colors"
                >
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-primary/5 to-accent/15 rounded-3xl blur-xl" />

              <div className="relative bg-card border border-border/50 rounded-3xl p-8 text-center">
                <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <div className="text-6xl md:text-7xl font-bold text-primary mb-3">
                  $0
                </div>
                <div className="text-xl text-muted-foreground mb-4">
                  {t('landing.trial.title')}
                </div>
                <div className="text-sm text-muted-foreground mb-6">
                  {t('landing.trial.description')}
                </div>
                <Button
                  size="lg"
                  onClick={handleGetStarted}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  {t('landing.trial.button')}
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="relative py-12 px-4 scroll-mt-20">
        <div className="pointer-events-none absolute inset-0 hidden xl:block" aria-hidden="true">
          {sectionStickyNotes
            .filter((note) => note.section === 'how-it-works')
            .map((note, index) => (
              <div
                key={note.id}
                className="sticky-note-hero absolute w-[168px]"
                style={{
                  ...note.style,
                  ['--sticky-rotate' as string]: note.rotation,
                  ['--sticky-duration' as string]: `${3.1 + index * 0.35}s`,
                  ['--sticky-delay' as string]: `${index * 180}ms`,
                }}
              >
                <div className="sticky-note-hero__shadow" />
                <div className={`sticky-note-hero__paper bg-gradient-to-br ${note.accentClassName}`}>
                  <div className="sticky-note-hero__tape" />
                  <div className="sticky-note-hero__pin" />
                  <div className="sticky-note-hero__fold" />
                  <div className="mt-8 text-left">
                    <div className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-amber-950/55">
                      <Sparkles className="h-3 w-3 text-amber-900/55" />
                      {note.title}
                    </div>
                    <p className="sticky-note-handwriting mt-2 text-[20px] leading-[1.06] text-black/88">
                      {note.text}
                    </p>
                  </div>
                </div>
              </div>
            ))}
        </div>
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              {t('landing.howitworks.title')}
            </h2>
            <p className="text-muted-foreground text-lg">
              {t('landing.howitworks.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <div key={i} className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-primary">
                  {step.number}
                </div>
                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-16 px-4">
        <div className="pointer-events-none absolute inset-0 hidden xl:block" aria-hidden="true">
          {sectionStickyNotes
            .filter((note) => note.section === 'cta')
            .map((note, index) => (
              <div
                key={note.id}
                className="sticky-note-hero absolute w-[168px]"
                style={{
                  ...note.style,
                  ['--sticky-rotate' as string]: note.rotation,
                  ['--sticky-duration' as string]: `${3.1 + index * 0.35}s`,
                  ['--sticky-delay' as string]: `${index * 180}ms`,
                }}
              >
                <div className="sticky-note-hero__shadow" />
                <div className={`sticky-note-hero__paper bg-gradient-to-br ${note.accentClassName}`}>
                  <div className="sticky-note-hero__tape" />
                  <div className="sticky-note-hero__pin" />
                  <div className="sticky-note-hero__fold" />
                  <div className="mt-8 text-left">
                    <div className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-amber-950/55">
                      <Sparkles className="h-3 w-3 text-amber-900/55" />
                      {note.title}
                    </div>
                    <p className="sticky-note-handwriting mt-2 text-[20px] leading-[1.06] text-black/88">
                      {note.text}
                    </p>
                  </div>
                </div>
              </div>
            ))}
        </div>
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            {t('landing.cta.title')}
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            {t('landing.cta.subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              onClick={handleGetStarted}
              className="text-lg px-8 py-6 bg-primary hover:bg-primary/90"
            >
              {t('landing.cta.button.primary')}
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-8 py-6"
              onClick={() => setDemoOpen(true)}
            >
              <Play className="mr-2 w-5 h-5" />
              {t('landing.cta.button.secondary')}
            </Button>
          </div>
        </div>
      </section>

      <Footer />

      {/* Auth Modal */}
      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />

      {/* Demo Video Modal */}
      <DemoVideoModal open={demoOpen} onOpenChange={setDemoOpen} />
    </div>
  );
}
