// src/pages/UploadPage.tsx
import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileText, CheckCircle, X, LogIn, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { uploadCV, aiGenerateFromCVId } from "@/api/endpoints";

type UploadState = "idle" | "uploading" | "success" | "error" | "unauth";

export default function UploadPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [state, setState] = useState<UploadState>("idle");
  const [serverFileName, setServerFileName] = useState<string>("");
  const [cvId, setCvId] = useState<string | number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { toast } = useToast();
  const nav = useNavigate();

  /* ---------- Drag & Drop ---------- */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onPick = (file: File | undefined | null) => {
    if (!file) return;
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      setUploadedFile(null);
      setError("Please select a PDF file.");
      toast({ title: "Invalid file", description: "Only PDF is supported.", variant: "destructive" });
      return;
    }
    setUploadedFile(file);
    setError(null);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    onPick(files[0]);
  }, []);

  /* ---------- File Dialog via ref ---------- */
  const openFileDialog = () => {
    if (state === "uploading") return;
    fileInputRef.current?.click();
  };

  const onHiddenInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    onPick(f);
    // allow re-selecting the same file again later
    e.currentTarget.value = "";
  };

  /* ---------- Actions ---------- */
  const resetUpload = () => {
    setUploadedFile(null);
    setError(null);
    setState("idle");
    setCvId(null);
    setServerFileName("");
  };

  const startQuiz = () => {
    if (!cvId) return;
    nav("/quiz", { state: { cvId } });
  };

  const doUpload = async () => {
  const token = localStorage.getItem("access");
  if (!token) {
    setState("unauth");
    setError("You must be logged in to upload.");
    return;
  }
  if (!uploadedFile) {
    setError("Please choose a PDF to upload.");
    return;
  }

  setState("uploading");
  setError(null);

  try {
    // 1. Upload the CV to Django (this saves it in /api/cv/)
    const res = await uploadCV(uploadedFile);
    const id = res?.cv_id ?? res?.id ?? res?.cvId;
    const name = res?.filename ?? uploadedFile.name;

    if (!id) {
      throw new Error("Upload succeeded but server did not return cv_id.");
    }

    // Save for other pages to access
    localStorage.setItem("last_cv_id", String(id));
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "last_cv_id",
        newValue: String(id),
      })
    );

    setCvId(id);
    setServerFileName(name);

    // 2. Ask the AI service to generate quiz questions from this CV
    const aiData = await aiGenerateFromCVId(id);
    // We expect something like { questions: [...] }
    const questions = aiData?.questions ?? aiData ?? [];

    // Store the questions so QuizPage can use them
    localStorage.setItem("ai_questions", JSON.stringify(questions));

    // 3. Mark upload done
    setState("success");

    toast({
      title: "Upload & Analysis Complete!",
      description: "Your personalized quiz is ready.",
    });
  } catch (e: any) {
    const status = e?.response?.status;
    if (status === 401 || status === 403) {
      setState("unauth");
      setError("Authentication required. Please log in.");
      return;
    }

    const msg =
      e?.response?.data?.error ||
      e?.response?.data?.detail ||
      e?.message ||
      "Upload failed.";

    setError(msg);
    setState("error");

    toast({
      title: "Upload failed",
      description: msg,
      variant: "destructive",
    });
  }
};


  return (
    <div className="min-h-screen bg-gradient-hero py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Upload Your CV</h1>
          <p className="text-lg text-muted-foreground">
            Let our AI analyze your skills and create a personalized assessment
          </p>
        </div>

        {/* Idle or uploading card */}
        {(state === "idle" || state === "uploading" || (!cvId && uploadedFile)) && (
          <Card className="shadow-large">
            <CardContent className="p-8">
              <div
                className={`border-2 border-dashed rounded-lg p-12 text-center transition-all ${
                  isDragging ? "border-primary bg-primary/5 scale-105" : "border-muted-foreground/25 hover:border-primary/50"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">Drag & drop your CV here</h3>
                <p className="text-muted-foreground mb-6">or click to browse files</p>

                {/* Hidden input triggered via ref click */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={onHiddenInputChange}
                  // keep it in DOM but non-visible & non-interactive
                  style={{ position: "absolute", width: 0, height: 0, opacity: 0, pointerEvents: "none" }}
                  tabIndex={-1}
                />

                {/* Button that opens the file dialog */}
                <div className="inline-flex">
                  <Button variant="hero" size="lg" className="gap-2" onClick={openFileDialog} disabled={state === "uploading"}>
                    <Upload className="w-4 h-4" />
                    {state === "uploading" ? "Uploading…" : "Select CV"}
                  </Button>
                </div>

                {uploadedFile && (
                  <div className="mt-6 flex items-center justify-center gap-2 text-muted-foreground">
                    <FileText className="w-5 h-5" />
                    <span>
                      Selected: <strong>{uploadedFile.name}</strong>
                    </span>
                  </div>
                )}

                <p className="text-sm text-muted-foreground mt-4">Supports PDF files up to 10MB</p>

                <div className="mt-6">
                  <Button
                    variant="hero"
                    size="lg"
                    className="gap-2"
                    onClick={doUpload}
                    disabled={!uploadedFile || state === "uploading"}
                  >
                    <ArrowRight className="w-4 h-4" />
                    {state === "uploading" ? "Uploading…" : "Upload CV"}
                  </Button>
                </div>

                {error && <div className="text-red-600 text-sm mt-4">{error}</div>}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Success card */}
        {state === "success" && (
          <Card className="shadow-medium animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-success" />
                  <span>Upload Successful!</span>
                </span>
                <Button variant="ghost" size="sm" onClick={resetUpload}>
                  <X className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2 text-muted-foreground">
                <FileText className="w-5 h-5" />
                <span>{serverFileName || uploadedFile?.name}</span>
              </div>
              <div className="text-center pt-4">
                <Button variant="hero" size="lg" className="gap-2" onClick={startQuiz}>
                  <ArrowRight className="w-4 h-4" />
                  Start Quiz
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Unauth state */}
        {state === "unauth" && (
          <Card className="shadow-medium animate-fade-in mt-6">
            <CardContent className="p-6 text-center space-y-3">
              <div className="text-amber-600 text-sm">You’re not logged in. Please sign in and try again.</div>
              <Button variant="hero" size="lg" className="gap-2" onClick={() => nav("/login")}>
                <LogIn className="w-4 h-4" />
                Go to Login
              </Button>
              <Button variant="outline" onClick={resetUpload}>Back</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}