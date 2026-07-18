import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, CheckCircle } from "lucide-react";
import api from "@/api/http";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const formSchema = z.object({
  position: z
    .string()
    .trim()
    .min(1, "Position is required")
    .max(200, "Position must be less than 200 characters"),
  job_description: z
    .string()
    .trim()
    .min(10, "Job description must be at least 10 characters")
    .max(5000, "Job description must be less than 5000 characters"),
  cv: z
    .instanceof(FileList)
    .refine((files) => files.length > 0, "CV file is required")
    .refine((files) => files[0]?.size <= MAX_FILE_SIZE, "File size must be less than 10MB")
    .refine(
      (files) => files[0]?.type === "application/pdf" || files[0]?.name?.toLowerCase()?.endsWith?.(".pdf"),
      "Only PDF files are allowed",
    ),
});

type FormValues = z.infer<typeof formSchema>;

interface MatchResult {
  match_score: number;
  missing_keywords: string[];
  summary: string;
}

const JobMatchPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<MatchResult | null>(null);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      position: "",
      job_description: "",
    },
  });

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("cv", data.cv[0]);
      formData.append("job_description", data.job_description);
      formData.append("position", data.position);

      // Use shared axios instance (adds Authorization automatically if available)
      const response = await api.post("matcher/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const resultData: MatchResult = response.data;
      setResult(resultData);

      toast({
        title: "Analysis Complete",
        description: `Match score: ${resultData.match_score}%`,
      });

      try {
        const cacheKey = "job_match_cache";
        const raw = localStorage.getItem(cacheKey);
        const arr: any[] = raw ? JSON.parse(raw) : [];
        arr.unshift({
          position: data.position,
          match_score: resultData.match_score,
          missing_keywords: resultData.missing_keywords,
          summary: resultData.summary,
          timestamp: Date.now(),
        });
        // keep last 20 entries
        localStorage.setItem(cacheKey, JSON.stringify(arr.slice(0, 20)));
      } catch {}
    } catch (error: any) {
      const msg = error?.response?.data?.error || error?.message || "Failed to analyze CV match";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-success";
    if (score >= 60) return "text-primary";
    return "text-destructive";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Excellent Match";
    if (score >= 60) return "Good Match";
    return "Needs Improvement";
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Job Matcher</h1>
        <p className="text-muted-foreground">Upload your CV and job description to find out how well you match</p>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Upload Your Details</CardTitle>
          <CardDescription>Provide your CV and the job details you're interested in</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Position</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Senior Backend Developer" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="job_description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Paste the full job description here..."
                        className="min-h-[200px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cv"
                render={({ field: { onChange, value, ...field } }) => (
                  <FormItem>
                    <FormLabel>Upload CV (PDF only)</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-4">
                        <Input
                          type="file"
                          accept=".pdf,application/pdf"
                          onChange={(e) => onChange(e.target.files)}
                          {...field}
                          className="cursor-pointer"
                        />
                        <Upload className="text-muted-foreground" size={20} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={isLoading} variant="hero" className="w-full" size="lg">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  "Analyze Match"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {result && (
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="text-success" />
              Analysis Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex items-baseline gap-3 mb-2">
                <h3 className="text-5xl font-bold">
                  <span className={getScoreColor(result.match_score)}>{result.match_score}%</span>
                </h3>
                <span className="text-lg text-muted-foreground">{getScoreLabel(result.match_score)}</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-3">
                <div className="bg-primary h-3 rounded-full transition-all duration-500" style={{ width: `${result.match_score}%` }} />
              </div>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-3">Summary</h4>
              <p className="text-muted-foreground leading-relaxed">{result.summary}</p>
            </div>

            {result.missing_keywords?.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold mb-3">Missing Keywords</h4>
                <div className="flex flex-wrap gap-2">
                  {result.missing_keywords.map((keyword, index) => (
                    <span key={index} className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-sm">
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default JobMatchPage;
