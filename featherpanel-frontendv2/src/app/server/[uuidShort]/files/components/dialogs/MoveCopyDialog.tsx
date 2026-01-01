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
import { Input } from "@/components/featherui/Input";
import { toast } from "sonner";
import { filesApi } from "@/lib/files-api";
import { Move, Copy } from "lucide-react";
import { useTranslation } from "@/contexts/TranslationContext";

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
    const { t } = useTranslation();
    const [destination, setDestination] = useState(root);
    const [loading, setLoading] = useState(false);

    const handleAction = async () => {
        setLoading(true);
        const toastId = toast.loading(action === "move" ? t("files.dialogs.move_copy.moving") : t("files.dialogs.move_copy.copying"));
        try {
            if (action === "copy") {
                for (const file of files) {
                    await filesApi.copyFile(uuid, root, file, destination);
                }
            } else {
                const updates = files.map(f => ({ from: f, to: `${destination}/${f}`.replace(/\/\//g, "/") }));
                await filesApi.moveFile(uuid, root, updates);
            }
            toast.success(action === "move" ? t("files.dialogs.move_copy.move_success") : t("files.dialogs.move_copy.copy_success"), { id: toastId });
            onSuccess();
            onOpenChange(false);
        } catch {
            toast.error(action === "move" ? t("files.dialogs.move_copy.move_error") : t("files.dialogs.move_copy.copy_error"), { id: toastId });
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
                            <DialogTitle className="capitalize">
                                {action === "move" ? t("files.dialogs.move_copy.move_title") : t("files.dialogs.move_copy.copy_title")}
                            </DialogTitle>
                            <DialogDescription>
                                {action === "move" 
                                    ? t("files.dialogs.move_copy.move_description", { count: String(files.length) }) 
                                    : t("files.dialogs.move_copy.copy_description", { count: String(files.length) })}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex flex-col gap-4 py-4">
                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">
                            {t("files.dialogs.move_copy.destination_label")}
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
                        {t("files.dialogs.move_copy.cancel")}
                    </Button>
                    <Button 
                        variant="default" 
                        onClick={handleAction} 
                        disabled={loading || !destination}
                        className="shadow-lg shadow-primary/20 h-10 px-6 capitalize"
                    >
                        {action === "move" ? t("files.dialogs.move_copy.move") : t("files.dialogs.move_copy.copy")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
