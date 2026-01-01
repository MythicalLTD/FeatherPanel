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
import { ChevronRight, Home, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

interface FileBreadcrumbsProps {
    currentDirectory: string;
    onNavigate: (path: string) => void;
    searchQuery: string;
    onSearchChange: (query: string) => void;
}

export function FileBreadcrumbs({ 
    currentDirectory, 
    onNavigate,
    searchQuery,
    onSearchChange
}: FileBreadcrumbsProps) {
    const segments = currentDirectory.split("/").filter(Boolean); // Remove empty strings

    const getPath = (index: number) => {
        return "/" + segments.slice(0, index + 1).join("/");
    };

    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-1">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground shrink-0"
                    onClick={() => onNavigate("/")}
                >
                    <Home className="h-4 w-4" />
                </Button>
                
                {segments.map((segment, index) => (
                    <div key={index} className="flex items-center gap-1 shrink-0">
                        <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                        <Button
                            variant="ghost"
                            size="sm"
                            className={`h-8 px-2 whitespace-nowrap ${
                                index === segments.length - 1
                                    ? "font-bold text-foreground pointer-events-none bg-white/5"
                                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                            }`}
                            onClick={() => onNavigate(getPath(index))}
                        >
                            {segment}
                        </Button>
                    </div>
                ))}
            </div>

            <div className="relative w-full md:w-64 group">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                </div>
                <Input
                    id="file-search-input"
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Search files..."
                    className="h-10 pl-10 pr-10 bg-black/5 dark:bg-black/20 border-black/10 dark:border-white/5 focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all rounded-2xl text-sm font-medium"
                />
                {searchQuery && (
                    <button
                        onClick={() => onSearchChange("")}
                        className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-white transition-colors"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                )}
            </div>
        </div>
    );
}
