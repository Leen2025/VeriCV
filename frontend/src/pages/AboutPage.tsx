// src/pages/AboutPage.tsx
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, Users, Target, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { getCvCount } from "@/api/endpoints";

const AboutPage = () => {
  const features = [
    {
      icon: Brain,
      title: "AI-Powered CV Analysis",
      description:
        "Advanced models identify and categorize your technical and soft skills directly from your CV.",
    },
    {
      icon: Target,
      title: "Personalized Skill Quiz",
      description:
        "Assessments are tailored to your profile so questions are always relevant to you.",
    },
    {
      icon: Zap,
      title: "Instant, Actionable Feedback",
      description:
        "See strengths, gaps, and next steps so you can level up quickly and confidently.",
    },
    {
      icon: Users,
      title: "Career-Focused Guidance",
      description:
        "Each recommendation is centered around what will genuinely improve your job-search outcomes.",
    },
  ];

  const [cvCount, setCvCount] = useState<string>("—");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await getCvCount();
        if (mounted && typeof data?.count === "number") {
          setCvCount(data.count.toLocaleString());
          return;
        }
      } catch {}
      if (!mounted) return;
      const lastId = localStorage.getItem("last_cv_id");
      const approx = lastId ? parseInt(String(lastId), 10) : NaN;
      if (!Number.isNaN(approx) && approx > 0) {
        setCvCount(approx.toLocaleString());
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const stats = [
    { number: cvCount, label: "CVs Analyzed" },
    { number: "95%", label: "Analysis Confidence" },
    { number: "24/7", label: "Availability" },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="gradient-hero py-20">
        <div className="container mx-auto px-4 text-center max-w-4xl">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">About VeriCV</h1>
          <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
            We help you discover, validate, and communicate your skills. VeriCV turns your CV into a clear skill profile,
            tailored quizzes, and feedback you can act on.
          </p>
        </div>
      </section>

      {/* Mission + Stats */}
      <section className="py-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-6">Our Mission</h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Bridge the gap between potential and proof. We make it simple to understand what you’re great at and how to get even better.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 justify-items-center max-w-3xl mx-auto mb-16">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl md:text-4xl font-bold gradient-primary bg-clip-text text-transparent mb-2">
                  {stat.number}
                </div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Why Choose VeriCV?</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Practical career outcomes powered by solid AI fundamentals.
            </p>
          </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {features.map((feature) => (
            <Card key={feature.title} className="card-hover">
              <CardHeader>
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 gradient-primary rounded-lg flex items-center justify-center">
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">How It Works</h2>
            <p className="text-lg text-muted-foreground">From CV to clarity in minutes.</p>
          </div>

          <div className="space-y-8">
            <div className="flex items-start space-x-6">
              <div className="w-8 h-8 gradient-primary rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">1</div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Upload Your CV</h3>
                <p className="text-muted-foreground">Drag and drop your PDF. We start analyzing instantly.</p>
              </div>
            </div>

            <div className="flex items-start space-x-6">
              <div className="w-8 h-8 gradient-primary rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">2</div>
              <div>
                <h3 className="text-xl font-semibold mb-2">AI Skill Extraction</h3>
                <p className="text-muted-foreground">We map your technical and soft skills into a clear profile.</p>
              </div>
            </div>

            <div className="flex items-start space-x-6">
              <div className="w-8 h-8 gradient-primary rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">3</div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Personalized Quiz</h3>
                <p className="text-muted-foreground">Questions are generated from your profile—relevant by design.</p>
              </div>
            </div>

            <div className="flex items-start space-x-6">
              <div className="w-8 h-8 gradient-primary rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">4</div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Feedback & Job Match</h3>
                <p className="text-muted-foreground">
                  See strengths and gaps, then compare your CV to a job and get a match score with missing-keyword tips.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 gradient-hero">
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <h2 className="text-3xl font-bold mb-4">Ready to Discover Your Potential?</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join candidates using VeriCV to validate skills and target better-fit roles.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Button asChild variant="hero" size="lg">
              <Link to="/upload">Upload CV</Link>
            </Button>
            <Button asChild variant="hero" size="lg">
              <Link to="/matcher">Try Job Match</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;
