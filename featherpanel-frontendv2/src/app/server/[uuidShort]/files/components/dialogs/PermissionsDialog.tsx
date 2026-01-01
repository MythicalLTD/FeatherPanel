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
import { toast } from "sonner";
import { filesApi } from "@/lib/files-api";
import { ShieldCheck, Info } from "lucide-react";

interface PermissionsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    uuid: string;
    root: string;
    files: string[];
    onSuccess: () => void;
}

export function PermissionsDialog({ 
    open, 
    onOpenChange, 
    uuid, 
    root,
    files,
    onSuccess 
}: PermissionsDialogProps) {
    const [mode, setMode] = useState("644");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open) {
            setMode("644");
        }
    }, [open]);

    const handleUpdate = async () => {
        setLoading(true);
        const toastId = toast.loading("Updating permissions...");
        try {
            const updates = files.map(f => ({ file: f, mode }));
            await filesApi.changePermissions(uuid, root, updates);
            // The original instruction provided a success message for "move" or "copy".
            // Since this is a PermissionsDialog, the original success message is more appropriate.
            // Assuming the instruction meant to restore a generic success message for permissions.
            toast.success("Permissions updated successfully", { id: toastId });
            onSuccess();
            onOpenChange(false);
        } catch {
            // Similarly, adjusting the error message to be specific to permissions.
            toast.error("Failed to update permissions", { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                            <ShieldCheck className="h-5 w-5" />
                        </div>
                        <div>
                            <DialogTitle>Update Permissions</DialogTitle>
                            <DialogDescription>
                                Set file mode (chmod) for {files.length} item(s).
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex flex-col gap-4 py-4">
                    <div className="flex items-start gap-3 bg-amber-500/5 p-4 rounded-xl border border-amber-500/10">
                        <Info className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-100/70 leading-relaxed">
                            Be careful when changing permissions. Incorrect settings can make files inaccessible or insecure.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">
                            Mode (Octal)
                        </label>
                        <Input 
                            placeholder="644" 
                            value={mode}
                            onChange={(e) => setMode(e.target.value)}
                            className="bg-white/5 border-white/10 text-center text-lg font-mono tracking-widest"
                            maxLength={4}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button 
                        variant="default" 
                        onClick={handleUpdate} 
                        disabled={loading || !mode}
                        className="shadow-lg shadow-primary/20 h-10 px-6"
                    >
                        Update
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
