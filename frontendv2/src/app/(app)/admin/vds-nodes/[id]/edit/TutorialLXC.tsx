/*
This file is part of FeatherPanel.

Copyright (C) 2025 MythicalSystems Studio
Copyright (C) 2025 FeatherPanel Contributors
Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

See the LICENSE file or <https://www.gnu.org/licenses/>.
*/

'use client';

import { Info, ShieldAlert } from 'lucide-react';
import { PageCard } from '@/components/featherui/PageCard';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useTranslation } from '@/contexts/TranslationContext';

export function TutorialLXC() {
    const { t } = useTranslation();

    return (
        <PageCard title={t('admin.vdsNodes.tutorial.lxc.title')} icon={Info} className='mt-6'>
            <div className='text-muted-foreground space-y-4 text-sm'>
                <Alert variant='destructive'>
                    <ShieldAlert className='h-4 w-4' />
                    <AlertTitle>{t('admin.vdsNodes.tutorial.lxc.security_warning')}</AlertTitle>
                    <AlertDescription>
                        {t('ui.admin.vdsNodes.edit.tutorialLXC.lXCContainersAreNotRecommendedIf')}
                        <strong>{t('ui.admin.vdsNodes.edit.tutorialLXC.qEMUKVMVirtualMachines')}</strong> for hosting.
                    </AlertDescription>
                </Alert>

                <p className='font-medium'>{t('admin.vdsNodes.tutorial.lxc.step1')}</p>
                <p>
                    {t('ui.admin.vdsNodes.edit.tutorialLXC.inTheProxmoxWebInterfaceNavigate')} <code>local</code>),
                    click on
                    <code>{t('ui.admin.vdsNodes.edit.tutorialLXC.cTTemplates')}</code>, and then click{' '}
                    <code>{t('ui.admin.vdsNodes.edit.tutorialLXC.templates')}</code>. Choose your preferred distribution
                    (e.g., Debian 12, Ubuntu 24.04) and click{' '}
                    <code>{t('ui.admin.vdsNodes.edit.tutorialLXC.download')}</code>.
                </p>

                <p className='font-medium'>{t('admin.vdsNodes.tutorial.lxc.step2')}</p>
                <p>{t('ui.admin.vdsNodes.edit.tutorialLXC.clickCreateCTInTheTop')}</p>
                <ul className='list-inside list-disc space-y-1 text-xs'>
                    <li>
                        <span className='font-semibold'>{t('ui.admin.vdsNodes.edit.tutorialLXC.general')}</span>{' '}
                        {t('ui.admin.vdsNodes.edit.tutorialLXC.setAVMIDEG')} <code>8000</code>) and a hostname. Set a
                        root password.
                    </li>
                    <li>
                        <span className='font-semibold'>{t('ui.admin.vdsNodes.edit.tutorialLXC.template')}</span>{' '}
                        {t('ui.admin.vdsNodes.edit.tutorialLXC.selectTheTemplateYouJustDownloaded')}
                    </li>
                    <li>
                        <span className='font-semibold'>{t('ui.admin.vdsNodes.edit.tutorialLXC.disks')}</span>{' '}
                        {t('ui.admin.vdsNodes.edit.tutorialLXC.chooseYourStorageAndASuitable')}
                    </li>
                    <li>
                        <span className='font-semibold'>{t('ui.admin.vdsNodes.edit.tutorialLXC.cPUMemory')}</span>{' '}
                        {t('ui.admin.vdsNodes.edit.tutorialLXC.keepDefaultsOrAdjustAsNeeded')}
                    </li>
                    <li>
                        <span className='font-semibold'>{t('ui.admin.vdsNodes.edit.tutorialLXC.network')}</span>{' '}
                        {t('ui.admin.vdsNodes.edit.tutorialLXC.set')} <code>Bridge = vmbr0</code> and leave IP settings
                        as <code>{t('ui.admin.vdsNodes.edit.tutorialLXC.static')}</code>{' '}
                        {t('ui.admin.vdsNodes.edit.tutorialLXC.featherPanelWillOverrideTheseSettingsDuring')}
                    </li>
                    <li>
                        <span className='font-semibold'>{t('ui.admin.vdsNodes.edit.tutorialLXC.confirm')}</span>{' '}
                        {t('ui.admin.vdsNodes.edit.tutorialLXC.reviewSettingsAndClick')}{' '}
                        <code>{t('ui.admin.vdsNodes.edit.tutorialLXC.finish')}</code>.
                    </li>
                </ul>

                <p className='font-medium'>{t('admin.vdsNodes.tutorial.lxc.step3')}</p>
                <p className='text-xs'>
                    {t('ui.admin.vdsNodes.edit.tutorialLXC.beforeYouConvertThisCTTo')} <code>/etc/ssh/sshd_config</code>{' '}
                    and make sure
                    <code> {t('ui.admin.vdsNodes.edit.tutorialLXC.passwordAuthenticationYes')}</code> is enabled (and if
                    you use direct root login,
                    <code> {t('ui.admin.vdsNodes.edit.tutorialLXC.permitRootLoginYes')}</code>). Then restart SSH.
                </p>
                <p className='text-xs'>{t('ui.admin.vdsNodes.edit.tutorialLXC.onceSSHSettingsAreCorrectEnsure')}</p>
                <pre className='bg-muted/60 overflow-x-auto rounded-md p-3 text-xs'>
                    <code>{`apt update && apt install -y openssh-server curl

# Edit SSH settings before templating (if your plans use password SSH logins)
nano /etc/ssh/sshd_config
# Set: PasswordAuthentication yes
# Optional for root login flows: PermitRootLogin yes
systemctl restart ssh

apt upgrade -y
`}</code>
                </pre>

                <p className='font-medium'>{t('admin.vdsNodes.tutorial.lxc.step4')}</p>
                <p className='text-xs'>
                    {t('ui.admin.vdsNodes.edit.tutorialLXC.stopTheContainerRightClickIt')}{' '}
                    <code>{t('ui.admin.vdsNodes.edit.tutorialLXC.convertToTemplate')}</code>.
                </p>

                <p className='font-medium'>{t('admin.vdsNodes.tutorial.lxc.step5')}</p>
                <p>
                    {t('ui.admin.vdsNodes.edit.tutorialLXC.inTheTemplatesTabOfYour')} <code>LXC</code> as the Guest
                    Type. FeatherPanel will now be able to clone this template when creating new LXC instances.
                </p>
            </div>
        </PageCard>
    );
}
