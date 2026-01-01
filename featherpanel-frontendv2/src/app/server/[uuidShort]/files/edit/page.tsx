/*
MIT License

Copyright (c) 2024-2026 MythicalSystems and Contributors
Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

"use client";

import { useEffect, useState, useRef, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { Editor, OnMount } from "@monaco-editor/react";
import { filesApi } from "@/lib/files-api";
import { toast } from "sonner";
import { Save, Loader2, FileCode, Lock } from "lucide-react";
import { useServerPermissions } from "@/hooks/useServerPermissions";
import { usePluginWidgets } from "@/hooks/usePluginWidgets";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/featherui/Button";
import { PageHeader } from "@/components/featherui/PageHeader";
import { useTranslation } from "@/contexts/TranslationContext";
import { WidgetRenderer } from "@/components/server/WidgetRenderer";

export default function FileEditorPage({ 
    params, 
    searchParams 
}: { 
    params: Promise<{ uuidShort: string }>, 
    searchParams: Promise<{ file?: string, directory?: string }> 
}) {
    const { t } = useTranslation();
    const { uuidShort } = use(params);
    const { file: fileName = "file.txt", directory = "/" } = use(searchParams);
    const router = useRouter();
    const { theme } = useTheme();
    const fullPath = directory.endsWith("/") ? `${directory}${fileName}` : `${directory}/${fileName}`;

    const [content, setContent] = useState("");
    const [originalContent, setOriginalContent] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const editorRef = useRef<any>(null);

    const { hasPermission } = useServerPermissions(uuidShort);
    const canEdit = hasPermission("file.update");

    // Plugin Widgets
    const { fetchWidgets, getWidgets } = usePluginWidgets('server-file-editor')

    const fetchContent = useCallback(async () => {
        setLoading(true);
        try {
            const data = await filesApi.getFileContent(uuidShort, fullPath);
            setContent(data);
            setOriginalContent(data);
        } catch (error) {
            console.error(error);
            toast.error(t("files.editor.load_error"));
        } finally {
            setLoading(false);
        }
    }, [uuidShort, fullPath, t]);

    useEffect(() => {
        if (uuidShort && fileName && directory) {
            fetchContent();
        }
    }, [uuidShort, fileName, directory, fetchContent]);

    useEffect(() => {
        fetchWidgets()
    }, [fetchWidgets]);

    const handleSave = async () => {
        if (!canEdit) return;

        setSaving(true);
        const toastId = toast.loading(t("files.editor.saving"));
        try {
            await filesApi.saveFileContent(uuidShort, fullPath, content);
            setOriginalContent(content);
            toast.success(t("files.editor.save_success"), { id: toastId });
        } catch (error) {
            console.error(error);
            toast.error(t("files.editor.save_error"), { id: toastId });
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
                            <h3 className="text-lg font-bold tracking-tight text-foreground">{t("files.editor.loading_title")}</h3>
                            <p className="text-xs text-muted-foreground uppercase tracking-[0.3em] font-medium animate-pulse">{t("files.editor.loading_description")}</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 relative h-[calc(100vh-6rem)] pb-4">
            <WidgetRenderer widgets={getWidgets('server-file-editor', 'top-of-page')} />
            <PageHeader
                title={t("files.editor.title", { file: fileName })}
                description={t("files.editor.description", { path: fullPath })}
            />
            <WidgetRenderer widgets={getWidgets('server-file-editor', 'after-header')} />

            <div className="flex-1 rounded-4xl border border-border/50 bg-card/50 shadow-2xl backdrop-blur-3xl overflow-hidden p-1 flex flex-col group transition-all hover:border-border/80 relative min-h-0">
                <div className="flex items-center justify-between p-3 border-b border-border/10 bg-muted/30 shrink-0">
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
                         {!canEdit && (
                            <div className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 px-3 py-1 rounded-lg border border-yellow-500/20 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                                <Lock className="h-3 w-3" />
                                {t("files.editor.read_only")}
                            </div>
                        )}
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => router.back()}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            {t("files.editor.cancel")}
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
                                    {t("files.editor.encrypting")}
                                </>
                            ) : (
                                <>
                                    <Save className="mr-2 h-4 w-4" />
                                    {t("files.editor.save_changes")}
                                </>
                            )}
                        </Button>
                    </div>
                </div>
                <div className="flex-1 relative w-full h-full min-h-0">
                    <div className="absolute inset-0">
                        <Editor
                            height="100%"
                            defaultLanguage={getLanguage(fileName)}
                            value={content}
                            theme={theme === 'dark' ? "vs-dark" : "light"}
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
            <WidgetRenderer widgets={getWidgets('server-file-editor', 'bottom-of-page')} />
        </div>
    );
}
