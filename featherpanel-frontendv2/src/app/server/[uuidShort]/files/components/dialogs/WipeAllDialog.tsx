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

import { useState } from "react";
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogFooter,
    DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/featherui/Button";
import { toast } from "sonner";
import { filesApi } from "@/lib/files-api";
import { AlertTriangle, Trash2 } from "lucide-react";

interface WipeAllDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    uuid: string;
    onSuccess: () => void;
}

export function WipeAllDialog({ 
    open, 
    onOpenChange, 
    uuid, 
    onSuccess 
}: WipeAllDialogProps) {
    const [loading, setLoading] = useState(false);

    const handleWipe = async () => {
        setLoading(true);
        const toastId = toast.loading("Wiping all files...");
        try {
            await filesApi.wipeAllFiles(uuid);
            toast.success("All files successfully wiped", { id: toastId });
            onSuccess();
            onOpenChange(false);
        } catch {
            toast.error("Failed to wipe server", { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md border-red-500/20 bg-red-950/10 backdrop-blur-xl">
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20 shadow-lg shadow-red-500/10">
                            <AlertTriangle className="h-6 w-6" />
                        </div>
                        <div>
                            <DialogTitle className="text-red-500 text-xl font-bold">Wipe All Files</DialogTitle>
                            <DialogDescription className="text-red-400/80">
                                This action is irreversible and extremely dangerous.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="py-6">
                    <p className="text-sm font-medium text-white/90 leading-relaxed bg-red-500/5 p-4 rounded-xl border border-red-500/10">
                        Are you absolutely sure you want to delete <span className="font-bold underline">every single file and folder</span> on this server? 
                        This cannot be undone and will likely break any running processes.
                    </p>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="ghost" onClick={() => onOpenChange(false)} className="hover:bg-white/5">
                        Cancel
                    </Button>
                    <Button 
                        variant="destructive" 
                        onClick={handleWipe} 
                        disabled={loading}
                        className="shadow-lg shadow-red-500/20 h-10 px-6"
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Yes, Wipe Everything
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
