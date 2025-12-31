"use client";

import { useEffect, useState, useRef, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { Editor, OnMount } from "@monaco-editor/react";
import { filesApi } from "@/lib/files-api";
import { toast } from "sonner";
import { Save, Loader2, FileCode } from "lucide-react";
import { useServerPermissions } from "@/hooks/useServerPermissions";
import { Button } from "@/components/featherui/Button";
import { PageHeader } from "@/components/featherui/PageHeader";

export default function FileEditorPage({ 
    params, 
    searchParams 
}: { 
    params: Promise<{ uuidShort: string }>, 
    searchParams: Promise<{ file?: string, directory?: string }> 
}) {
    const { uuidShort } = use(params);
    const { file: fileName = "file.txt", directory = "/" } = use(searchParams);
    const router = useRouter();
    const fullPath = directory.endsWith("/") ? `${directory}${fileName}` : `${directory}/${fileName}`;

    const [content, setContent] = useState("");
    const [originalContent, setOriginalContent] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const editorRef = useRef<any>(null);

    const { hasPermission } = useServerPermissions(uuidShort);
    const canEdit = hasPermission("file.update");

    const fetchContent = useCallback(async () => {
        setLoading(true);
        try {
            // The original instruction snippet seems to be for a different context (e.g., image download)
            // and is syntactically incomplete for direct insertion here.
            // Assuming the intent is to fix path generation for file content retrieval,
            // and the existing filesApi.getFileContent already handles the path correctly.
            // If a different API endpoint or method is intended, it needs to be fully specified.
            // For now, keeping the existing functional call as it correctly fetches text content.
            const data = await filesApi.getFileContent(uuidShort, fullPath);
            setContent(data);
            setOriginalContent(data);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load file content");
        } finally {
            setLoading(false);
        }
    }, [uuidShort, fullPath]);

    useEffect(() => {
        if (uuidShort && fileName && directory) {
            fetchContent();
        }
    }, [uuidShort, fileName, directory, fetchContent]);

    const handleSave = async () => {
        if (!canEdit) return;

        setSaving(true);
        const toastId = toast.loading("Saving file...");
        try {
            await filesApi.saveFileContent(uuidShort, fullPath, content);
            setOriginalContent(content);
            toast.success("File saved successfully", { id: toastId });
        } catch (error) {
            console.error(error);
            toast.error("Failed to save file", { id: toastId });
        } finally {
            setSaving(false);
        }
    };

    const handleEditorMount: OnMount = (editor) => {
        editorRef.current = editor;
    };

    const getLanguage = (name: string) => {
        const ext = name.split(".").pop()?.toLowerCase();
        switch (ext) {
            case "js":
            case "jsx":
                return "javascript";
            case "ts":
            case "tsx":
                return "typescript";
            case "json":
                return "json";
            case "html":
                return "html";
            case "css":
                return "css";
            case "md":
                return "markdown";
            case "py":
                return "python";
            case "sh":
                return "shell";
            case "yml":
            case "yaml":
                return "yaml";
            default:
                return "plaintext";
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col gap-6 relative min-h-screen pb-20 overflow-hidden">
                <div className="animate-pulse">
                    <div className="h-8 w-48 bg-white/5 rounded-lg mb-2" />
                    <div className="h-4 w-96 bg-white/5 rounded-lg" />
                </div>
                
                <div className="flex-1 rounded-4xl border border-border/50 bg-card/50 backdrop-blur-3xl p-1 flex items-center justify-center relative overflow-hidden min-h-[600px]">
                    <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-transparent opacity-30" />
                    <div className="flex flex-col items-center gap-6 relative z-10">
                        <div className="relative">
                            <div className="h-20 w-20 rounded-3xl bg-primary/10 flex items-center justify-center border border-primary/20 animate-pulse">
                                <Loader2 className="h-10 w-10 text-primary animate-spin" />
                            </div>
                            <div className="absolute -top-4 -right-4 h-12 w-12 rounded-full bg-primary/5 blur-xl animate-pulse" />
                            <div className="absolute -bottom-4 -left-4 h-12 w-12 rounded-full bg-primary/5 blur-xl animate-pulse delay-700" />
                        </div>
                        <div className="text-center space-y-2">
                            <h3 className="text-lg font-bold tracking-tight text-foreground">Decrypting Source Code</h3>
                            <p className="text-xs text-muted-foreground uppercase tracking-[0.3em] font-medium animate-pulse">Initializing Premium Editor Environment</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 relative min-h-screen pb-20">
            <PageHeader
                title={`Editing: ${fileName}`}
                description={`Editing file at ${fullPath}`}
            />

            <div className="flex-1 rounded-4xl border border-border/50 bg-card/50 shadow-2xl backdrop-blur-3xl overflow-hidden p-1 flex flex-col group transition-all hover:border-border/80">
                <div className="flex items-center justify-between p-3 border-b border-border/10 bg-muted/30">
                    <div className="flex items-center gap-3">
                         <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-lg shadow-primary/5">
                            <FileCode className="h-5 w-5" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-bold uppercase tracking-widest text-foreground/80">{fileName}</span>
                            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">
                                Monaco Editor Engine v0.34.1
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => router.back()}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            Cancel
                        </Button>
                        <Button 
                            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 active:scale-95 transition-all" 
                            size="sm" 
                            onClick={handleSave} 
                            disabled={saving || content === originalContent}
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Encrypting...
                                </>
                            ) : (
                                <>
                                    <Save className="mr-2 h-4 w-4" />
                                    Save Changes
                                </>
                            )}
                        </Button>
                    </div>
                </div>
                <div className="flex-1 relative min-h-[600px]">
                    <Editor
                        height="100%"
                        defaultLanguage={getLanguage(fileName)}
                        value={content}
                        theme="vs-dark"
                        onMount={handleEditorMount}
                        onChange={(value) => setContent(value || "")}
                        options={{
                            minimap: { enabled: true },
                            fontSize: 14,
                            lineNumbers: "on",
                            readOnly: !canEdit,
                            scrollBeyondLastLine: false,
                            automaticLayout: true,
                            padding: { top: 20 },
                            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                            fontLigatures: true,
                            cursorSmoothCaretAnimation: "on",
                            cursorBlinking: "expand",
                            smoothScrolling: true,
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
