import { useState } from "react";
import { Button } from "@/components/featherui/Button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { filesApi } from "@/lib/files-api";

interface DeleteDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    uuid: string;
    root: string;
    files: string[]; // List of filenames to delete
    onSuccess: () => void;
}

export function DeleteDialog({ open, onOpenChange, uuid, root, files, onSuccess }: DeleteDialogProps) {
    const [loading, setLoading] = useState(false);

    const handleDelete = async () => {
        setLoading(true);
        try {
            await filesApi.deleteFiles(uuid, root, files);
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
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Delete Files</DialogTitle>
                    <DialogDescription className="text-destructive">
                        Are you sure you want to delete {files.length} item(s)? This action cannot be undone.
                    </DialogDescription>
                </DialogHeader>
                <div className="max-h-32 overflow-y-auto rounded bg-muted/50 p-2 text-sm text-muted-foreground">
                    <ul className="list-inside list-disc">
                        {files.map(f => <li key={f}>{f}</li>)}
                    </ul>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
                        Cancel
                    </Button>
                    <Button variant="destructive" onClick={handleDelete} disabled={loading}>
                        {loading ? "Deleting..." : "Delete"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
