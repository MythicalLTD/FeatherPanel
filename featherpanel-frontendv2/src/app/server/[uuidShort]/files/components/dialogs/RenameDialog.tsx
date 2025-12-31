import { useState, useEffect } from "react";
import { Button } from "@/components/featherui/Button";
import { Input } from "@/components/featherui/Input";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { filesApi } from "@/lib/files-api";

interface RenameDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    uuid: string;
    root: string;
    fileName: string; // The file being renamed
    onSuccess: () => void;
}

export function RenameDialog({ open, onOpenChange, uuid, root, fileName, onSuccess }: RenameDialogProps) {
    const [newName, setNewName] = useState(fileName);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open) {
            setNewName(fileName);
        }
    }, [open, fileName]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName || newName === fileName) return;

        setLoading(true);
        try {
            await filesApi.renameFile(uuid, root, [{ from: fileName, to: newName }]);
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
                    <DialogTitle>Rename File</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        autoFocus
                    />
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={!newName || newName === fileName || loading}>
                            {loading ? "Renaming..." : "Rename"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
