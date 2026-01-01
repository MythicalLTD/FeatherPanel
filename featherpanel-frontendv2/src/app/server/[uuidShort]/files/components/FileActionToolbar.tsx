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

import { Button } from "@/components/featherui/Button";
import { 
    RefreshCw, 
    Upload, 
    Trash2, 
    FolderPlus, 
    FilePlus, 
    Download, 
    Archive,
    Settings,
    Move,
    Copy,
    ShieldCheck,
    MoreVertical
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FileActionToolbarProps {
    loading: boolean;
    selectedCount: number;
    onRefresh: () => void;
    onCreateFile: () => void;
    onCreateFolder: () => void;
    onUpload: () => void;
    onDeleteSelected: () => void;
    onDownloadSelected: () => void;
    onArchiveSelected: () => void;
    onClearSelection: () => void;
    onPullFile: () => void;
    onWipeAll: () => void;
    onIgnoredContent: () => void;
    onCopySelected: () => void;
    onMoveSelected: () => void;
    onPermissionsSelected: () => void;
    canCreate: boolean;
    canDelete: boolean;
    currentDirectory: string;
}

export function FileActionToolbar({
    loading,
    selectedCount,
    onRefresh,
    onCreateFile,
    onCreateFolder,
    onUpload,
    onDeleteSelected,
    onDownloadSelected,
    onArchiveSelected,
    onClearSelection,
    onPullFile,
    onWipeAll,
    onIgnoredContent,
    onCopySelected,
    onMoveSelected,
    onPermissionsSelected,
    canCreate,
    canDelete,
    currentDirectory,
}: FileActionToolbarProps) {
    const hasSelection = selectedCount > 0;

    return (
        <div className="sticky top-0 z-20 pb-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-black/5 dark:border-white/10 bg-white/80 dark:bg-white/5 backdrop-blur-xl p-2 shadow-sm transition-all duration-300">
                {hasSelection ? (
                    // Selection Mode
                    <>
                        <div className="flex items-center gap-3 px-2">
                            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 text-primary animate-in zoom-in-50 duration-300">
                                <span className="text-xs font-bold">{selectedCount}</span>
                            </div>
                            <span className="text-sm font-medium text-muted-foreground hidden xs:inline">Selected</span>
                            <div className="h-4 w-px bg-border mx-1 hidden xs:block" />
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={onClearSelection}
                                className="h-8 px-3 text-xs uppercase tracking-wider font-bold text-muted-foreground hover:text-foreground"
                            >
                                Cancel
                            </Button>
                        </div>
                        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pl-2">
                             <Button 
                                variant="default" 
                                size="sm" 
                                onClick={onDownloadSelected}
                                className="h-9 px-4 shadow-sm"
                            >
                                <Download className="mr-2 h-4 w-4" />
                                Download
                            </Button>
                            <Button 
                                variant="secondary" 
                                size="sm" 
                                onClick={onArchiveSelected}
                                className="h-9 px-4 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20"
                            >
                                <Archive className="mr-2 h-4 w-4" />
                                <span className="hidden sm:inline">Compress</span>
                            </Button>
                            <Button 
                                variant="secondary" 
                                size="sm" 
                                onClick={onDeleteSelected}
                                className="h-9 px-3 bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                            
                             <DropdownMenu>
                                <DropdownMenuTrigger as={Button} variant="ghost" size="icon" className="h-9 w-9">
                                    <MoreVertical className="h-4 w-4" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={onMoveSelected}>
                                        <Move className="mr-2 h-4 w-4" /> Move
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={onCopySelected}>
                                        <Copy className="mr-2 h-4 w-4" /> Copy
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={onPermissionsSelected}>
                                        <ShieldCheck className="mr-2 h-4 w-4" /> Permissions
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </>
                ) : (
                    // Default Mode
                    <>
                         <div className="flex flex-wrap items-center gap-1.5">
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={onRefresh} 
                                disabled={loading}
                                className="h-9 px-3 text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
                            >
                                <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
                                <span className="hidden xs:inline">Refresh</span>
                            </Button>
                            {canCreate && (
                                <>
                                    <div className="h-4 w-px bg-border mx-1 hidden sm:block" />
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={onCreateFile}
                                        className="h-9 px-3 text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
                                    >
                                        <FilePlus className="mr-2 h-4 w-4" />
                                        <span className="hidden lg:inline">New File</span>
                                    </Button>
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={onCreateFolder}
                                        className="h-9 px-3 text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
                                    >
                                        <FolderPlus className="mr-2 h-4 w-4" />
                                        <span className="hidden lg:inline">New Folder</span>
                                    </Button>
                                </>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                             <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={onPullFile}
                                className="h-9 px-3 text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
                            >
                                <Download className="mr-2 h-4 w-4" />
                                <span className="hidden xs:inline">Pull</span>
                            </Button>
                            
                             {canCreate && (
                                <Button 
                                    variant="default" 
                                    size="sm" 
                                    onClick={onUpload}
                                    className="h-9 px-6 shadow-sm font-semibold"
                                >
                                    <Upload className="mr-2 h-4 w-4" />
                                    Upload
                                </Button>
                            )}
                            
                             <DropdownMenu>
                                <DropdownMenuTrigger as={Button} variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground">
                                    <Settings className="h-4 w-4" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={onIgnoredContent}>
										<ShieldCheck className="mr-2 h-4 w-4" />
                                        Ignored Content
                                    </DropdownMenuItem>
                                    {canDelete && currentDirectory === "/" && (
                                        <DropdownMenuItem onClick={onWipeAll} className="text-red-500 focus:text-red-500 focus:bg-red-500/10">
                                            <Trash2 className="mr-2 h-4 w-4" /> Wipe All
                                        </DropdownMenuItem>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
