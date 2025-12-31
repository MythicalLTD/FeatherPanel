import { useState } from "react";
import { Button } from "@/components/featherui/Button";
import { Input } from "@/components/featherui/Input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { filesApi } from "@/lib/files-api";

interface CreateFileDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    uuid: string;
    root: string;
    onSuccess: () => void;
}

export function CreateFileDialog({ open, onOpenChange, uuid, root, onSuccess }: CreateFileDialogProps) {
    const [name, setName] = useState("");
    const [content, setContent] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) return;

        setLoading(true);
        try {
            // Need to handle path join correctly
            const path = root === "/" ? name : `${root}/${name}`;
            await filesApi.saveFileContent(uuid, path, content);
            setName("");
            setContent("");
            onSuccess();
            onOpenChange(false);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Create New File</DialogTitle>
                    <DialogDescription>
                        Create a new file in <code className="bg-muted px-1 rounded">{root}</code>
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">File Name</label>
                         <Input
                            placeholder="filename.txt"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <div className="space-y-2">
                         <label className="text-sm font-medium">Content (Optional)</label>
                         {/* Fallback to textarea usually implies standard HTML textarea styled with Tailwind */}
                         <textarea
                            className="flex min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="File content..."
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                         />
                    </div>
                   
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={!name || loading}>
                            {loading ? "Creating..." : "Create"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
