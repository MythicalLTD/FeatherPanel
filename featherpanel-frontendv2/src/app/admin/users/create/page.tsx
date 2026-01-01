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

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/contexts/TranslationContext';
import axios from 'axios';
import { ArrowLeft, UserPlus, RefreshCw, Users, Shield, Info } from 'lucide-react';
import { PageHeader } from '@/components/featherui/PageHeader';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { PageCard } from '@/components/featherui/PageCard';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select-native';
import { toast } from 'sonner';

interface AvailableRole {
  id: string;
  name: string;
  display_name: string;
  color: string;
}

export default function CreateUserPage() {
  const { t } = useTranslation();
  const router = useRouter();

  const [creating, setCreating] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<AvailableRole[]>([]);
  const [createForm, setCreateForm] = useState({
    username: '',
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    role_id: '',
  });

  const fetchRoles = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/admin/roles');
      console.log('Roles API response:', data);
      if (data.data.roles) {
        const rolesArray = Object.entries(data.data.roles).map(([id, role]) => {
          const r = role as { name: string; display_name: string; color: string };
          return {
            id: String(id),
            name: r.name,
            display_name: r.display_name,
            color: r.color,
          };
        });
        console.log('Parsed roles:', rolesArray);
        setAvailableRoles(rolesArray);
      } else {
        console.log('No roles in response');
      }
    } catch (error) {
      console.error('Failed to fetch roles:', error);
      toast.error(t('admin.users.messages.fetch_failed'));
    }
  }, [t]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!createForm.username || !createForm.email || !createForm.password || !createForm.role_id) {
      toast.error(t('admin.users.create.validation'));
      return;
    }

    setCreating(true);
    try {
      const { data } = await axios.put('/api/admin/users', createForm);
      if (data?.success) {
        toast.success(t('admin.users.messages.created'));
        router.push('/admin/users');
      } else {
        toast.error(data?.message || t('admin.users.messages.create_failed'));
      }
    } catch (error: unknown) {
      const errorMessage =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        t('admin.users.messages.create_failed');
      toast.error(errorMessage);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <PageHeader
        title={t('admin.users.create.title')}
        description={t('admin.users.create.description')}
        icon={UserPlus}
        actions={
          <Button variant="outline" onClick={() => router.push('/admin/users')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('admin.users.back_to_list')}
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <PageCard title={t('admin.users.create.form.title')} icon={UserPlus}>
            <form onSubmit={handleCreateUser} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="create-username">{t('admin.users.create.form.username')}</Label>
                  <Input
                    id="create-username"
                    value={createForm.username}
                    onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                    placeholder={t('admin.users.create.form.username_placeholder')}
                    required
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="create-firstname">{t('admin.users.create.form.first_name')}</Label>
                  <Input
                    id="create-firstname"
                    value={createForm.first_name}
                    onChange={(e) => setCreateForm({ ...createForm, first_name: e.target.value })}
                    placeholder={t('admin.users.create.form.first_name_placeholder')}
                    required
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="create-lastname">{t('admin.users.create.form.last_name')}</Label>
                  <Input
                    id="create-lastname"
                    value={createForm.last_name}
                    onChange={(e) => setCreateForm({ ...createForm, last_name: e.target.value })}
                    placeholder={t('admin.users.create.form.last_name_placeholder')}
                    required
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="create-email">{t('admin.users.create.form.email')}</Label>
                  <Input
                    id="create-email"
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    placeholder={t('admin.users.create.form.email_placeholder')}
                    required
                    className="mt-2"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="create-password">{t('admin.users.create.form.password')}</Label>
                <Input
                  id="create-password"
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  placeholder={t('admin.users.create.form.password_placeholder')}
                  required
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="create-role">{t('admin.users.create.form.role')}</Label>
                <Select
                  id="create-role"
                  value={createForm.role_id}
                  onChange={(e) => setCreateForm({ ...createForm, role_id: e.target.value })}
                  className="w-full mt-2"
                  required
                >
                  <option value="">{t('admin.users.create.form.select_role')}</option>
                  {availableRoles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.display_name}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="flex flex-wrap justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => router.push('/admin/users')}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      {t('admin.users.create.creating')}
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      {t('admin.users.create.submit')}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </PageCard>
        </div>

        {/* Help Cards */}
        <div className="space-y-6">
          <PageCard title={t('admin.users.create.help.tips_title')} icon={Info} variant="default">
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <Users className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                <span>{t('admin.users.create.help.tips.username')}</span>
              </li>
              <li className="flex items-start gap-2">
                <Shield className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                <span>{t('admin.users.create.help.tips.role')}</span>
              </li>
              <li className="flex items-start gap-2">
                <Info className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                <span>{t('admin.users.create.help.tips.email')}</span>
              </li>
            </ul>
          </PageCard>

          <PageCard title={t('admin.users.create.help.security_title')} icon={Shield} variant="danger">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t('admin.users.create.help.security_desc')}
            </p>
          </PageCard>
        </div>
      </div>
    </div>
  );
}
