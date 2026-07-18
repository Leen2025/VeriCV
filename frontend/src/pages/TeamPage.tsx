import { Linkedin, Github } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const TeamPage = () => {
  const team = [
    {
      name: "Danah Alshehri",
      role: "Frontend Developer",
      bio: "",
      linkedin:
        "https://www.linkedin.com/in/danah-alshehri-a26463217?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=ios_app",
      github: "https://github.com/d-alshehri",
    },
    {
      name: "Leen Alsaleh",
      role: "AI Engineer",
      bio: "",
      linkedin: "https://www.linkedin.com/in/leen-alsaleh-112bb3216/",
      github: "https://github.com/Leen2025",
    },
    {
      name: "Haneen Aldawood",
      role: "Backend Developer",
      bio: "",
      linkedin: "https://www.linkedin.com/in/haneen-aldawood-069778353?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=ios_app",
      github: "https://github.com/hyvuz",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-3xl">
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-primary via-primary-glow to-accent bg-clip-text text-transparent">
            Meet Our Team
          </h1>
          <p className="text-xl text-muted-foreground">
            We're a passionate group of professionals dedicated to helping tech
            talent discover and validate their true strengths.
          </p>
        </div>
      </section>

      {/* Team Grid */}
      <section className="py-12 px-4 pb-20">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {team.map((member, index) => (
              <Card
                key={index}
                className="group hover:shadow-elegant transition-smooth overflow-hidden"
              >
                <CardContent className="p-6">
                  <h3 className="text-2xl font-bold mb-1">{member.name}</h3>
                  <p className="text-primary font-medium mb-3">{member.role}</p>
                  <p className="text-muted-foreground mb-4">{member.bio}</p>
                  <div className="flex items-center gap-3">
                    <a
                      href={member.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary transition-smooth"
                      aria-label={`${member.name}'s LinkedIn`}
                    >
                      <Linkedin className="w-5 h-5" />
                    </a>
                    <a
                      href={member.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary transition-smooth"
                      aria-label={`${member.name}'s GitHub`}
                    >
                      <Github className="w-5 h-5" />
                    </a>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default TeamPage;
