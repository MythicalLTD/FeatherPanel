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
import { Download } from "lucide-react";

interface PullFileDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    uuid: string;
    root: string;
    onSuccess: () => void;
}

export function PullFileDialog({ 
    open, 
    onOpenChange, 
    uuid, 
    root,
    onSuccess 
}: PullFileDialogProps) {
    const [url, setUrl] = useState("");
    const [filename, setFilename] = useState("");
    const [loading, setLoading] = useState(false);

    const handlePull = async () => {
        if (!url) {
            toast.error("Please enter a URL");
            return;
        }

        setLoading(true);
        const toastId = toast.loading("Starting file pull...");
        try {
            await filesApi.pullFile(uuid, root, url, filename || undefined);
            toast.success("File pull initiated successfully", { id: toastId });
            onSuccess();
            onOpenChange(false);
            setUrl("");
            setFilename("");
        } catch {
            toast.error("Failed to pull file", { id: toastId });
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
                            <Download className="h-5 w-5" />
                        </div>
                        <div>
                            <DialogTitle>Pull File</DialogTitle>
                            <DialogDescription>
                                Download a file directly to your server from a URL.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex flex-col gap-4 py-4">
                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">
                            File URL
                        </label>
                        <Input 
                            placeholder="https://example.com/file.zip" 
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            className="bg-white/5 border-white/10 focus:border-primary/50"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">
                            Save As (Optional)
                        </label>
                        <Input 
                            placeholder="Leave empty for original name" 
                            value={filename}
                            onChange={(e) => setFilename(e.target.value)}
                            className="bg-white/5 border-white/10 focus:border-primary/50"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button 
                        variant="default" 
                        onClick={handlePull} 
                        disabled={loading || !url}
                        className="shadow-lg shadow-primary/20"
                    >
                        Pull File
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
