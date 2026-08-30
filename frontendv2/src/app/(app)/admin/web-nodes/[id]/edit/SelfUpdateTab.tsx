/*
This file is part of FeatherPanel.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ArrowUpCircle, GitBranch, Globe, RefreshCw, Settings2, Terminal } from 'lucide-react';
import { toast } from 'sonner';

interface SelfUpdateTabProps {
    nodeId: string;
    currentVersion?: string | null;
    onRefresh?: () => void;
}

interface VersionStatus {
    current_version?: string;
    latest_version?: string | null;
    update_available?: boolean;
    github_owner?: string;
    github_repo?: string;
}

const DEFAULT_OPTIONS = {
    repoOwner: 'mythicalltd',
    repoName: 'featherquilld',
    downloadUrl: 'https://github.com/mythicalltd/featherquilld/releases/latest/download/featherquilld',
};

export function SelfUpdateTab({ nodeId, currentVersion, onRefresh }: SelfUpdateTabProps) {
    const { t } = useTranslation();
    const [updating, setUpdating] = useState(false);
    const [loading, setLoading] = useState(false);
    const [versionStatus, setVersionStatus] = useState<VersionStatus | null>(null);
    const [options, setOptions] = useState({
        source: 'github' as 'github' | 'url',
        repoOwner: DEFAULT_OPTIONS.repoOwner,
        repoName: DEFAULT_OPTIONS.repoName,
        version: '',
        url: DEFAULT_OPTIONS.downloadUrl,
        sha256: '',
        force: false,
        disableChecksum: false,
    });

    const prefilledForNodeRef = useRef<string | null>(null);

    const fetchVersionStatus = async () => {
        if (!nodeId) return;
        setLoading(true);
        try {
            const { data } = await axios.get(`/api/admin/web-nodes/${nodeId}/version-status`);
            if (data.success) {
                setVersionStatus(data.data);
            }
        } catch (e) {
            console.error('Failed to fetch version status', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void fetchVersionStatus();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nodeId]);

    useEffect(() => {
        if (!versionStatus) return;
        if (prefilledForNodeRef.current === nodeId) return;
        const owner = versionStatus.github_owner?.trim();
        const repo = versionStatus.github_repo?.trim();
        if (!owner && !repo) return;
        prefilledForNodeRef.current = nodeId;
        setOptions((prev) => ({
            ...prev,
            repoOwner: owner || prev.repoOwner,
            repoName: repo || prev.repoName,
            url:
                owner && repo
                    ? `https://github.com/${owner}/${repo}/releases/latest/download/${repo}`
                    : prev.url,
        }));
    }, [versionStatus, nodeId]);

    const handleUpdate = async () => {
        if (!confirm(t('admin.node.view.self_update.confirm'))) return;

        setUpdating(true);
        try {
            const { data } = await axios.post(`/api/admin/web-nodes/${nodeId}/self-update`, {
                source: options.source,
                repo_owner: options.source === 'github' ? options.repoOwner : undefined,
                repo_name: options.source === 'github' ? options.repoName : undefined,
                version: options.version || undefined,
                url: options.source === 'url' ? options.url : undefined,
                sha256: options.source === 'url' ? options.sha256 : undefined,
                force: options.force,
                disable_checksum: options.disableChecksum,
            });

            if (data.success) {
                toast.success(t('admin.node.view.self_update.success'));
                onRefresh?.();
                void fetchVersionStatus();
            } else {
                toast.error(data.message || t('admin.node.view.self_update.failed'));
            }
        } catch (e: unknown) {
            let msg = t('admin.node.view.self_update.failed');
            if (axios.isAxiosError(e)) {
                msg = e.response?.data?.message || e.message;
            }
            toast.error(msg);
        } finally {
            setUpdating(false);
        }
    };

    const installedVersion =
        versionStatus?.current_version || currentVersion || t('common.unknown');

    return (
        <div className='space-y-6'>
            <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
                <PageCard
                    title={t('admin.node.view.self_update.current_version')}
                    description='Currently installed FeatherQuilld binary'
                    icon={Terminal}
                    className='h-full'
                >
                    <h3 className='text-primary font-mono text-3xl font-bold'>{installedVersion}</h3>
                </PageCard>

                <PageCard
                    title={t('admin.node.view.self_update.latest_version')}
                    description='Available from upstream'
                    icon={RefreshCw}
                    className='h-full'
                >
                    <div className='flex items-center gap-4'>
                        <h3 className='font-mono text-3xl font-bold'>
                            {loading ? (
                                <RefreshCw className='text-primary h-8 w-8 animate-spin' />
                            ) : (
                                versionStatus?.latest_version || t('common.unknown')
                            )}
                        </h3>
                        {versionStatus?.update_available && (
                            <div className='rounded-md border border-orange-500/20 bg-orange-500/10 px-2 py-1 text-[10px] font-bold tracking-wider text-orange-500 uppercase'>
                                {t('admin.node.view.self_update.update_ready')}
                            </div>
                        )}
                    </div>
                </PageCard>
            </div>

            <PageCard
                title={t('admin.node.view.self_update.options_title')}
                description={t('admin.node.view.self_update.options_description')}
                icon={Settings2}
            >
                <div className='space-y-8'>
                    <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                        <button
                            type='button'
                            onClick={() => setOptions({ ...options, source: 'github' })}
                            className={`flex items-start gap-4 rounded-2xl border p-4 text-left ${
                                options.source === 'github' ? 'bg-primary/5 border-primary' : 'border-border/50'
                            }`}
                        >
                            <GitBranch className='h-5 w-5' />
                            <div>
                                <h4 className='text-sm font-bold'>{t('admin.node.view.self_update.source_github')}</h4>
                                <p className='text-muted-foreground mt-1 text-xs'>
                                    {t('admin.node.view.self_update.source_github_help')}
                                </p>
                            </div>
                        </button>
                        <button
                            type='button'
                            onClick={() => setOptions({ ...options, source: 'url' })}
                            className={`flex items-start gap-4 rounded-2xl border p-4 text-left ${
                                options.source === 'url' ? 'border-blue-500 bg-blue-500/5' : 'border-border/50'
                            }`}
                        >
                            <Globe className='h-5 w-5' />
                            <div>
                                <h4 className='text-sm font-bold'>{t('admin.node.view.self_update.source_url')}</h4>
                                <p className='text-muted-foreground mt-1 text-xs'>
                                    {t('admin.node.view.self_update.source_url_help')}
                                </p>
                            </div>
                        </button>
                    </div>

                    <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
                        {options.source === 'github' ? (
                            <>
                                <div className='space-y-2'>
                                    <Label htmlFor='repoOwner'>{t('admin.node.view.self_update.repo_owner')}</Label>
                                    <Input
                                        id='repoOwner'
                                        value={options.repoOwner}
                                        onChange={(e) => setOptions({ ...options, repoOwner: e.target.value })}
                                    />
                                </div>
                                <div className='space-y-2'>
                                    <Label htmlFor='repoName'>{t('admin.node.view.self_update.repo_name')}</Label>
                                    <Input
                                        id='repoName'
                                        value={options.repoName}
                                        onChange={(e) => setOptions({ ...options, repoName: e.target.value })}
                                    />
                                </div>
                                <div className='space-y-2 md:col-span-2'>
                                    <Label htmlFor='version'>{t('admin.node.view.self_update.version_optional')}</Label>
                                    <Input
                                        id='version'
                                        value={options.version}
                                        onChange={(e) => setOptions({ ...options, version: e.target.value })}
                                        placeholder='latest'
                                    />
                                </div>
                            </>
                        ) : (
                            <>
                                <div className='space-y-2 md:col-span-2'>
                                    <Label htmlFor='url'>{t('admin.node.view.self_update.download_url')}</Label>
                                    <Input
                                        id='url'
                                        value={options.url}
                                        onChange={(e) => setOptions({ ...options, url: e.target.value })}
                                    />
                                </div>
                                <div className='space-y-2 md:col-span-2'>
                                    <Label htmlFor='sha256'>{t('admin.node.view.self_update.sha256_optional')}</Label>
                                    <Input
                                        id='sha256'
                                        value={options.sha256}
                                        onChange={(e) => setOptions({ ...options, sha256: e.target.value })}
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    <div className='flex flex-wrap gap-6'>
                        <div className='flex items-center gap-2'>
                            <Switch
                                id='force'
                                checked={options.force}
                                onCheckedChange={(checked) => setOptions({ ...options, force: checked })}
                            />
                            <Label htmlFor='force'>{t('admin.node.view.self_update.force')}</Label>
                        </div>
                        <div className='flex items-center gap-2'>
                            <Switch
                                id='disableChecksum'
                                checked={options.disableChecksum}
                                onCheckedChange={(checked) =>
                                    setOptions({ ...options, disableChecksum: checked })
                                }
                            />
                            <Label htmlFor='disableChecksum'>{t('admin.node.view.self_update.disable_checksum')}</Label>
                        </div>
                    </div>

                    <Button onClick={() => void handleUpdate()} loading={updating} className='gap-2'>
                        <ArrowUpCircle className='h-4 w-4' />
                        {t('admin.node.view.self_update.trigger')}
                    </Button>
                </div>
            </PageCard>
        </div>
    );
}
