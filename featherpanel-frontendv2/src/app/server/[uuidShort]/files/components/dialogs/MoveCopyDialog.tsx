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
import { Input } from "@/components/featherui/Input";
import { toast } from "sonner";
import { filesApi } from "@/lib/files-api";
import { Move, Copy } from "lucide-react";

interface MoveCopyDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    uuid: string;
    root: string;
    files: string[];
    action: "move" | "copy";
    onSuccess: () => void;
}

export function MoveCopyDialog({ 
    open, 
    onOpenChange, 
    uuid, 
    root,
    files,
    action,
    onSuccess 
}: MoveCopyDialogProps) {
    const [destination, setDestination] = useState(root);
    const [loading, setLoading] = useState(false);

    const handleAction = async () => {
        setLoading(true);
        const toastId = toast.loading(`${action === "move" ? "Moving" : "Copying"} files...`);
        try {
            if (action === "copy") {
                for (const file of files) {
                    await filesApi.copyFile(uuid, root, file, destination);
                }
            } else {
                const updates = files.map(f => ({ from: f, to: `${destination}/${f}`.replace(/\/\//g, "/") }));
                await filesApi.moveFile(uuid, root, updates);
            }
            toast.success(`${action === "move" ? "Move" : "Copy"} completed`, { id: toastId });
            onSuccess();
            onOpenChange(false);
        } catch {
            toast.error(`Failed to ${action} files`, { id: toastId });
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
                            {action === "move" ? <Move className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                        </div>
                        <div>
                            <DialogTitle className="capitalize">{action} Items</DialogTitle>
                            <DialogDescription>
                                {action === "move" ? "Move" : "Copy"} {files.length} item(s) to a new location.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex flex-col gap-4 py-4">
                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">
                            Destination Path
                        </label>
                        <Input 
                            placeholder="/" 
                            value={destination}
                            onChange={(e) => setDestination(e.target.value)}
                            className="bg-white/5 border-white/10"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button 
                        variant="default" 
                        onClick={handleAction} 
                        disabled={loading || !destination}
                        className="shadow-lg shadow-primary/20 h-10 px-6 capitalize"
                    >
                        {action}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
