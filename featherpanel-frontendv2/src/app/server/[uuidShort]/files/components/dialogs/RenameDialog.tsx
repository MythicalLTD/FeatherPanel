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
