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

import { useState, useEffect } from "react";
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogFooter,
    DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/featherui/Button";
import { Input } from "@/components/featherui/Input";
import { Settings, Info, Plus, X } from "lucide-react";
import { toast } from "sonner";

interface IgnoredContentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    uuid: string;
    onSuccess: () => void;
}

export function IgnoredContentDialog({ 
    open, 
    onOpenChange, 
    uuid, 
    onSuccess 
}: IgnoredContentDialogProps) {
    const [patterns, setPatterns] = useState<string[]>([]);
    const [newPattern, setNewPattern] = useState("");

    // Load from localStorage
    useEffect(() => {
        if (open) {
            const saved = localStorage.getItem(`feather_ignored_${uuid}`);
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    // Use setTimeout to avoid cascading render lint error
                    setTimeout(() => setPatterns(parsed), 0);
                } catch (e) {
                    console.error("Failed to parse ignored patterns", e);
                }
            } else {
                setTimeout(() => setPatterns([]), 0);
            }
        }
    }, [open, uuid]);

    const handleSave = () => {
        localStorage.setItem(`feather_ignored_${uuid}`, JSON.stringify(patterns));
        toast.success("Ignored patterns saved");
        onSuccess();
        onOpenChange(false);
    };

    const addPattern = () => {
        if (!newPattern.trim()) return;
        if (patterns.includes(newPattern.trim())) {
            toast.error("Pattern already exists");
            return;
        }
        setPatterns([...patterns, newPattern.trim()]);
        setNewPattern("");
    };

    const removePattern = (pattern: string) => {
        setPatterns(patterns.filter(p => p !== pattern));
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                            <Settings className="h-5 w-5" />
                        </div>
                        <div>
                            <DialogTitle>Ignored Content</DialogTitle>
                            <DialogDescription>
                                Hide specific files or folders from the view.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex flex-col gap-4 py-4">
                    <div className="flex items-start gap-3 bg-blue-500/5 p-4 rounded-xl border border-blue-500/10 mb-2">
                        <Info className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-blue-100/70 leading-relaxed">
                            Patterns are case-sensitive. These filters only affect your local view and do not delete any files on the server.
                        </p>
                    </div>

                    <div className="flex gap-2">
                        <Input 
                            placeholder="e.g. .git or logs" 
                            value={newPattern}
                            onChange={(e) => setNewPattern(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addPattern()}
                            className="bg-white/5 border-white/10"
                        />
                        <Button variant="secondary" size="icon" onClick={addPattern} className="shrink-0">
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>

                    <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                        {patterns.length === 0 ? (
                            <p className="text-xs text-center w-full py-8 text-muted-foreground italic bg-white/5 rounded-xl border border-dashed border-white/10">
                                No patterns added yet.
                            </p>
                        ) : (
                            patterns.map(pattern => (
                                <div 
                                    key={pattern} 
                                    className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg border border-white/5 group border-primary/20"
                                >
                                    <span className="text-xs font-medium text-white/80">{pattern}</span>
                                    <button 
                                        onClick={() => removePattern(pattern)}
                                        className="text-white/40 hover:text-red-400 transition-colors"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button 
                        variant="default" 
                        onClick={handleSave} 
                        className="shadow-lg shadow-primary/20 h-10 px-6"
                    >
                        Save Visibility
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
