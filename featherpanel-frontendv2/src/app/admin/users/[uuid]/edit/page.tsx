// MIT License
//
// Copyright (c) 2025 MythicalSystems
// Copyright (c) 2025 Cassian Gherman (NaysKutzu)
// Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/contexts/TranslationContext';
import axios from 'axios';
import { 
    User, 
    Shield, 
    Mail, 
    Server as ServerIcon, 
    Activity, 
    Key, 
    Ban, 
    Unlock, 
    Trash2, 
    ArrowLeft, 
    RefreshCw,
    Copy,
    ExternalLink,
    AlertTriangle,
    CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { PageHeader } from '@/components/featherui/PageHeader';
import { PageCard } from '@/components/featherui/PageCard';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select-native';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface UserRole {
  name: string;
  display_name: string;
  color: string;
}

interface ApiUser {
  id?: number;
  uuid: string;
  avatar: string;
  username: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  external_id?: number | null;
  first_ip?: string;
  last_ip?: string;
  banned?: string;
  two_fa_enabled?: string;
  two_fa_blocked?: string;
  deleted?: boolean | string;
  locked?: boolean | string;
  first_seen?: string;
  last_seen?: string;
  created_at?: string;
  updated_at?: string;
  role_id?: number;
  role?: UserRole;
  discord_oauth2_id?: string | null;
  discord_oauth2_linked?: string;
  discord_oauth2_username?: string | null;
  discord_oauth2_name?: string | null;
  activities?: { name: string; context: string; ip_address: string; created_at: string }[];
  mails?: { subject: string; status: string; created_at: string; body?: string }[];
}

interface EditForm {
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  role_id: string;
  external_id?: number | null;
  password?: string;
}

interface Server {
  id: number;
  name: string;
  description?: string;
  status?: string;
  uuidShort: string;
  created_at: string;
}

interface AvailableRole {
  id: string;
  name: string;
  display_name: string;
  color: string;
}

export default function UserEditPage({ params }: { params: Promise<{ uuid: string }> }) {
  const { t } = useTranslation();
  const router = useRouter();
  const resolvedParams = use(params);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<ApiUser | null>(null);
  const [availableRoles, setAvailableRoles] = useState<AvailableRole[]>([]);
  const [ownedServers, setOwnedServers] = useState<Server[]>([]);
  const [ssoGenerating, setSsoGenerating] = useState(false);
  const [ssoLink, setSsoLink] = useState<string | null>(null);
  const [mailPreview, setMailPreview] = useState<{
    subject: string;
    body?: string;
    status: string;
    created_at: string;
  } | null>(null);
  const [mailPreviewOpen, setMailPreviewOpen] = useState(false);

  const [editForm, setEditForm] = useState<EditForm>({
    username: '',
    first_name: '',
    last_name: '',
    email: '',
    role_id: '',
    external_id: undefined,
    password: '',
  });

  const fetchUser = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`/api/admin/users/${resolvedParams.uuid}`);
      const apiUser: ApiUser = data.data.user;
      setUser(apiUser);

      // Fetch roles
      try {
          const rolesRes = await axios.get('/api/admin/roles');
          if (rolesRes.data?.data?.roles) {
              const rolesObj = rolesRes.data.data.roles;
              // Handle both array and object responses for roles
              const rolesList = Array.isArray(rolesObj) 
                  ? rolesObj 
                  : Object.values(rolesObj);
              
              setAvailableRoles(rolesList.map((r: { id: string | number; name: string; display_name: string; color: string }) => ({
                  id: String(r.id),
                  name: r.name,
                  display_name: r.display_name,
                  color: r.color
              })));
          }
      } catch (e) {
          console.error('Failed to fetch roles', e);
      }

      setEditForm({
        username: apiUser.username || '',
        first_name: apiUser.first_name || '',
        last_name: apiUser.last_name || '',
        email: apiUser.email || '',
        role_id: apiUser.role_id != null ? String(apiUser.role_id) : '',
        external_id:
          apiUser.external_id !== null && apiUser.external_id !== undefined
            ? Number(apiUser.external_id)
            : undefined,
        password: '',
      });

      // Load owned servers
      try {
        const serversRes = await axios.get(`/api/admin/users/${resolvedParams.uuid}/servers`);
        setOwnedServers(serversRes.data?.data?.servers || []);
      } catch {
        setOwnedServers([]);
      }
    } catch {
      toast.error(t('admin.users.edit.error'));
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedParams.uuid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);
    try {
      const patchData: Partial<EditForm> = { ...editForm };

      if (!patchData.password || patchData.password.trim() === '') {
        delete patchData.password;
      }

      if (
        patchData.external_id === undefined ||
        patchData.external_id === null ||
        patchData.external_id === 0
      ) {
        delete patchData.external_id;
      }

      const { data } = await axios.patch(`/api/admin/users/${user.uuid}`, patchData);
      if (data?.success) {
        toast.success(t('admin.users.messages.updated'));
        await fetchUser();
      } else {
        toast.error(data?.message || t('admin.users.messages.update_failed'));
      }
    } catch (error: unknown) {
        console.error(error);
      toast.error(t('admin.users.messages.update_failed'));
    } finally {
      setSubmitting(false);
    }
  };

  const toggleBanUser = async () => {
    if (!user) return;
    if (!confirm(t('admin.users.messages.ban_confirm'))) return;
    const currentlyBanned = user.banned === 'true';
    try {
      const { data } = await axios.patch(`/api/admin/users/${user.uuid}`, {
        banned: currentlyBanned ? 'false' : 'true',
      });
      if (data?.success) {
        toast.success(
          currentlyBanned ? t('admin.users.messages.unbanned') : t('admin.users.messages.banned')
        );
        await fetchUser();
      } else {
        toast.error(data?.message || t('admin.users.messages.ban_failed'));
      }
    } catch {
      toast.error(t('admin.users.messages.ban_failed'));
    }
  };

  const disable2FA = async () => {
    if (!user) return;
    try {
      const { data } = await axios.patch(`/api/admin/users/${user.uuid}`, {
        two_fa_enabled: 'false',
        two_fa_key: null,
      });
      if (data?.success) {
        toast.success(t('admin.users.messages.2fa_disabled'));
        await fetchUser();
      } else {
        toast.error(data?.message || t('admin.users.messages.2fa_failed'));
      }
    } catch {
      toast.error(t('admin.users.messages.2fa_failed'));
    }
  };

  const unlinkDiscord = async () => {
    if (!user) return;
    if (!confirm(t('admin.users.messages.discord_confirm'))) {
      return;
    }
    try {
      const { data } = await axios.patch(`/api/admin/users/${user.uuid}`, {
        discord_oauth2_linked: 'false',
        discord_oauth2_id: null,
        discord_oauth2_access_token: null,
        discord_oauth2_username: null,
        discord_oauth2_name: null,
      });
      if (data?.success) {
        toast.success(t('admin.users.messages.discord_unlinked'));
        await fetchUser();
      } else {
        toast.error(data?.message || t('admin.users.messages.discord_failed'));
      }
    } catch {
      toast.error(t('admin.users.messages.discord_failed'));
    }
  };

  const generateSsoLoginLink = async () => {
    if (!user) return;

    setSsoGenerating(true);
    try {
      const { data } = await axios.post(`/api/admin/users/${user.uuid}/sso-token`);
      if (data?.success && data.data?.token) {
        const origin = window.location.origin;
        setSsoLink(`${origin}/auth/login?sso_token=${encodeURIComponent(data.data.token)}&redirect=/`);
        toast.success(t('admin.users.messages.sso_generated'));
      } else {
        toast.error(data?.message || t('admin.users.messages.sso_failed'));
      }
    } catch {
      toast.error(t('admin.users.messages.sso_failed'));
    } finally {
      setSsoGenerating(false);
    }
  };

  const copySsoLinkToClipboard = async () => {
    if (!ssoLink) return;

    try {
      await navigator.clipboard.writeText(ssoLink);
      toast.success(t('admin.users.messages.sso_copied'));
    } catch {
      toast.error(t('admin.users.messages.sso_copy_failed'));
    }
  };

  const showMailPreview = (mail: {
    subject: string;
    body?: string;
    status: string;
    created_at: string;
  }) => {
    setMailPreview(mail);
    setMailPreviewOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
          <span className="text-muted-foreground">{t('admin.users.edit.loading')}</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <p className="text-xl font-semibold">{t('admin.users.edit.error')}</p>
        <Button variant="outline" onClick={() => router.push('/admin/users')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('admin.users.back_to_list')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <PageHeader
        title={t('admin.users.edit.title', { username: user.username })}
        description={t('admin.users.edit.description')}
        icon={User}
        actions={
          <Button variant="outline" onClick={() => router.push('/admin/users')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('admin.users.back_to_list')}
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Edit Form */}
        <div className="lg:col-span-2 space-y-6">
            <PageCard title={t('admin.users.edit.form.title')} icon={User} className="h-full">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <Label htmlFor="edit-username">{t('admin.users.edit.form.username')}</Label>
                        <Input
                            id="edit-username"
                            value={editForm.username}
                            onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                            placeholder={t('admin.users.create.form.username_placeholder')}
                            required
                            className="mt-2"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <Label htmlFor="edit-firstname">{t('admin.users.edit.form.first_name')}</Label>
                            <Input
                                id="edit-firstname"
                                value={editForm.first_name}
                                onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                                placeholder={t('admin.users.create.form.first_name_placeholder')}
                                className="mt-2"
                            />
                        </div>
                        <div>
                            <Label htmlFor="edit-lastname">{t('admin.users.edit.form.last_name')}</Label>
                            <Input
                                id="edit-lastname"
                                value={editForm.last_name}
                                onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                                placeholder={t('admin.users.create.form.last_name_placeholder')}
                                className="mt-2"
                            />
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="edit-email">{t('admin.users.edit.form.email')}</Label>
                        <Input
                            id="edit-email"
                            type="email"
                            value={editForm.email}
                            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                            placeholder={t('admin.users.create.form.email_placeholder')}
                            required
                            className="mt-2"
                        />
                    </div>

                    <div>
                        <Label htmlFor="edit-role">{t('admin.users.edit.form.role')}</Label>
                        <Select
                            id="edit-role"
                            value={editForm.role_id}
                            onChange={(e) => setEditForm({ ...editForm, role_id: e.target.value })}
                            required
                            className="w-full mt-2"
                        >
                            <option value="">{t('admin.users.create.form.select_role')}</option>
                            {availableRoles.map((role) => (
                                <option key={role.id} value={role.id}>
                                    {role.display_name}
                                </option>
                            ))}
                        </Select>
                    </div>

                    <div>
                        <Label htmlFor="edit-externalid">{t('admin.users.edit.form.external_id')}</Label>
                        <Input
                            id="edit-externalid"
                            type="number"
                            value={editForm.external_id ?? ''}
                            onChange={(e) =>
                                setEditForm({
                                    ...editForm,
                                    external_id: e.target.value === '' ? undefined : Number(e.target.value),
                                })
                            }
                            placeholder={t('admin.users.edit.form.external_id_help')}
                            className="mt-2"
                        />
                        <p className="text-xs text-muted-foreground mt-1.5">{t('admin.users.edit.form.external_id_help')}</p>
                    </div>

                    <div>
                        <Label htmlFor="edit-password">{t('admin.users.edit.form.password')}</Label>
                        <Input
                            id="edit-password"
                            type="password"
                            value={editForm.password}
                            onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                            placeholder={t('admin.users.edit.form.password_placeholder')}
                            className="mt-2"
                        />
                         <p className="text-xs text-muted-foreground mt-1.5">{t('admin.users.edit.form.password_help')}</p>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-border/50">
                        <Button type="submit" disabled={submitting}>
                            {submitting ? (
                                <>
                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                    {t('admin.users.messages.updating')}
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                    {t('admin.users.edit.form.save')}
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </PageCard>
        </div>

        {/* Right Column: User Profile & Actions */}
        <div className="space-y-6">
            
            {/* Overview Card */}
            <PageCard title={t('admin.users.edit.account_info.title')} icon={User}>
                <div className="flex flex-col items-center mb-6">
                    <Avatar className="h-24 w-24 mb-4 ring-4 ring-background shadow-lg">
                        <AvatarImage src={user.avatar} alt={user.username} />
                        <AvatarFallback className="text-2xl">{user.username[0]}</AvatarFallback>
                    </Avatar>
                    <h2 className="text-xl font-bold">{user.username}</h2>
                    <p className="text-muted-foreground text-sm">{user.email}</p>
                    
                    <div className="flex flex-wrap gap-2 mt-4 justify-center">
                        <Badge
                            style={user.role?.color ? { backgroundColor: user.role.color, color: '#fff' } : undefined}
                            variant="secondary"
                        >
                            {user.role?.display_name || user.role?.name || '-'}
                        </Badge>
                        <Badge variant={user.banned === 'true' ? 'destructive' : 'secondary'}>
                            {user.banned === 'true' ? t('admin.users.badges.banned') : t('admin.users.badges.active')}
                        </Badge>
                        <Badge variant={user.two_fa_enabled === 'true' ? 'secondary' : 'outline'}>
                             {user.two_fa_enabled === 'true' ? t('admin.users.badges.2fa') : t('admin.users.badges.no_2fa')}
                        </Badge>
                    </div>
                </div>

                <div className="space-y-3 text-sm border-t border-border/50 pt-4">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('admin.users.edit.account_info.user_id')}</span>
                        <span className="font-mono">{user.id}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('admin.users.edit.account_info.uuid')}</span>
                        <span className="font-mono text-xs" title={user.uuid}>{user.uuid.substring(0, 8)}...</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('admin.users.edit.account_info.created')}</span>
                        <span>{user.created_at || user.first_seen}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('admin.users.edit.account_info.last_seen')}</span>
                        <span>{user.last_seen || '-'}</span>
                    </div>
                    {user.last_ip && (
                         <div className="flex justify-between">
                            <span className="text-muted-foreground">{t('admin.users.edit.account_info.last_ip')}</span>
                            <span className="font-mono">{user.last_ip}</span>
                        </div>
                    )}
                </div>
            </PageCard>

            {/* Danger Zone / Actions */}
            <PageCard title="Actions" icon={Shield} variant="default">
                <div className="space-y-3">
                     <Button 
                        variant={user.banned === 'true' ? 'default' : 'destructive'} 
                        className="w-full justify-start"
                        onClick={toggleBanUser}
                    >
                        {user.banned === 'true' ? (
                            <><Unlock className="h-4 w-4 mr-2" /> {t('admin.users.edit.unban_user')}</>
                        ) : (
                            <><Ban className="h-4 w-4 mr-2" /> {t('admin.users.edit.ban_user')}</>
                        )}
                    </Button>

                    {user.two_fa_enabled === 'true' && (
                        <Button variant="destructive" className="w-full justify-start" onClick={disable2FA}>
                            <Shield className="h-4 w-4 mr-2" /> {t('admin.users.edit.disable_2fa')}
                        </Button>
                    )}

                    {user.discord_oauth2_linked === 'true' && (
                         <Button variant="destructive" className="w-full justify-start" onClick={unlinkDiscord}>
                            <Trash2 className="h-4 w-4 mr-2" /> {t('admin.users.edit.unlink_discord')}
                        </Button>
                    )}
                </div>

                <div className="mt-6 pt-6 border-t border-border/50">
                    <Label className="mb-2 block text-xs uppercase text-muted-foreground font-bold tracking-wider">
                        Single Sign-On
                    </Label>
                    <div className="space-y-2">
                        {ssoLink ? (
                             <div className="flex gap-2">
                                <Input value={ssoLink} readOnly className="h-10 text-xs font-mono" />
                                <Button size="icon" variant="outline" onClick={copySsoLinkToClipboard}>
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </div>
                        ) : (
                            <Button 
                                variant="secondary" 
                                className="w-full" 
                                onClick={generateSsoLoginLink}
                                disabled={ssoGenerating}
                            >
                                {ssoGenerating ? (
                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <Key className="h-4 w-4 mr-2" />
                                )}
                                {t('admin.users.edit.account_info.generate_sso')}
                            </Button>
                        )}
                    </div>
                </div>
            </PageCard>
        </div>
      </div>

      {/* Tabs Section */}
      <Tabs defaultValue="servers" className="w-full">
         <div className="flex items-center justify-between mb-4">
             <TabsList>
                <TabsTrigger value="servers" className="gap-2">
                    <ServerIcon className="h-4 w-4" /> 
                    {t('admin.users.edit.tabs.servers')}
                </TabsTrigger>
                <TabsTrigger value="activities" className="gap-2">
                     <Activity className="h-4 w-4" /> 
                    {t('admin.users.edit.tabs.activities')}
                </TabsTrigger>
                <TabsTrigger value="mails" className="gap-2">
                     <Mail className="h-4 w-4" /> 
                    {t('admin.users.edit.tabs.mails')}
                </TabsTrigger>
            </TabsList>
         </div>

         <TabsContent value="servers">
            <PageCard title={t('admin.users.edit.servers.title')} icon={ServerIcon}>
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/5 text-left">
                                <th className="p-4 font-medium text-muted-foreground">{t('admin.users.edit.servers.name')}</th>
                                <th className="p-4 font-medium text-muted-foreground">{t('admin.users.edit.servers.status')}</th>
                                <th className="p-4 font-medium text-muted-foreground">{t('admin.users.edit.servers.created')}</th>
                                <th className="p-4 font-medium text-muted-foreground text-right">{t('admin.users.edit.servers.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ownedServers.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-muted-foreground">
                                        No servers found for this user.
                                    </td>
                                </tr>
                            ) : (
                                ownedServers.map((server) => (
                                    <tr key={server.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                                        <td className="p-4">
                                            <div className="font-medium">{server.name}</div>
                                            <div className="text-xs text-muted-foreground">{server.uuidShort}</div>
                                        </td>
                                        <td className="p-4">
                                            <Badge variant={server.status === 'Online' ? 'secondary' : 'destructive'}>
                                                {server.status || t('admin.users.edit.servers.offline')}
                                            </Badge>
                                        </td>
                                        <td className="p-4 text-muted-foreground">{server.created_at}</td>
                                        <td className="p-4 text-right">
                                            <div className="flex gap-2 justify-end">
                                                 <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => (window.location.href = `/server/${server.uuidShort}`)}
                                                  >
                                                    <ExternalLink className="h-4 w-4" />
                                                  </Button>
                                                  <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => (window.location.href = `/admin/servers/${server.id}/edit`)}
                                                  >
                                                    <RefreshCw className="h-4 w-4" />
                                                  </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                 </div>
            </PageCard>
         </TabsContent>

         <TabsContent value="activities">
            <PageCard title={t('admin.users.edit.activities.title')} icon={Activity}>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                         <thead>
                            <tr className="border-b border-white/5 text-left">
                                <th className="p-4 font-medium text-muted-foreground">{t('admin.users.edit.activities.name')}</th>
                                <th className="p-4 font-medium text-muted-foreground">{t('admin.users.edit.activities.context')}</th>
                                <th className="p-4 font-medium text-muted-foreground">{t('admin.users.edit.activities.ip')}</th>
                                <th className="p-4 font-medium text-muted-foreground">{t('admin.users.edit.activities.created')}</th>
                            </tr>
                        </thead>
                        <tbody>
                             {(!user.activities || user.activities.length === 0) ? (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-muted-foreground">
                                        No activity logs found.
                                    </td>
                                </tr>
                            ) : (
                                user.activities.map((activity, index) => (
                                    <tr key={index} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                                        <td className="p-4 font-medium">{activity.name}</td>
                                        <td className="p-4 text-muted-foreground">{activity.context}</td>
                                        <td className="p-4 font-mono text-xs">{activity.ip_address}</td>
                                        <td className="p-4 text-muted-foreground">{activity.created_at}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </PageCard>
         </TabsContent>

         <TabsContent value="mails">
             <PageCard title={t('admin.users.edit.mails.title')} icon={Mail}>
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                         <thead>
                            <tr className="border-b border-white/5 text-left">
                                <th className="p-4 font-medium text-muted-foreground">{t('admin.users.edit.mails.subject')}</th>
                                <th className="p-4 font-medium text-muted-foreground">{t('admin.users.edit.mails.status')}</th>
                                <th className="p-4 font-medium text-muted-foreground">{t('admin.users.edit.mails.created')}</th>
                                <th className="p-4 font-medium text-muted-foreground text-right">{t('admin.users.edit.mails.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(!user.mails || user.mails.length === 0) ? (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-muted-foreground">
                                        No mails found.
                                    </td>
                                </tr>
                            ) : (
                                user.mails.map((mail, index) => (
                                    <tr key={index} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                                        <td className="p-4 font-medium">{mail.subject}</td>
                                        <td className="p-4">
                                             <Badge variant={mail.status === 'sent' ? 'secondary' : 'destructive'}>
                                                {mail.status}
                                            </Badge>
                                        </td>
                                        <td className="p-4 text-muted-foreground">{mail.created_at}</td>
                                        <td className="p-4 text-right">
                                             <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => showMailPreview(mail)}
                                            >
                                                {t('admin.users.edit.mails.preview')}
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                 </div>
             </PageCard>
         </TabsContent>
      </Tabs>

     {/* Mail Preview Dialog */}
      <Dialog open={mailPreviewOpen} onOpenChange={setMailPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{mailPreview?.subject}</DialogTitle>
            <DialogDescription>
              {mailPreview?.created_at} | {mailPreview?.status}
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-auto max-h-[60vh] border rounded-xl bg-muted/50 p-4 mt-4">
            { }
            <div 
                className="prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: mailPreview?.body || '' }} 
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
