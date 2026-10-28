/**
 * Panel outbound mail provider presets.
 * SMTP presets autofill host/port/encryption; API presets set mail_transport.
 */

export type MailTransport =
    | 'smtp'
    | 'resend'
    | 'sendgrid'
    | 'mailgun'
    | 'postmark'
    | 'brevo'
    | 'mailersend'
    | 'sparkpost'
    | 'ses';

export type MailProviderMode = 'smtp' | 'api';

export interface MailProviderPreset {
    id: string;
    label: string;
    mode: MailProviderMode;
    /** Value stored in mail_transport */
    transport: MailTransport;
    host?: string;
    port?: string;
    encryption?: 'starttls' | 'tls' | 'ssl' | 'none';
    /** Suggested SMTP username hint (not forced) */
    userHint?: string;
    regionDefault?: string;
    docsUrl?: string;
    freeTier?: boolean;
    noteKey?: string;
    /** Extra fields required for this provider in the UI */
    requiresDomain?: boolean;
    requiresRegion?: boolean;
    sesKeyFormat?: boolean;
}

export const MAIL_PROVIDER_PRESETS: MailProviderPreset[] = [
    {
        id: 'custom',
        label: 'Custom SMTP',
        mode: 'smtp',
        transport: 'smtp',
        host: '',
        port: '587',
        encryption: 'starttls',
        noteKey: 'admin.settings.mail_providers.notes.custom',
    },
    {
        id: 'resend',
        label: 'Resend (API)',
        mode: 'api',
        transport: 'resend',
        freeTier: true,
        docsUrl: 'https://resend.com/docs/send-with-nodejs',
        noteKey: 'admin.settings.mail_providers.notes.resend',
    },
    {
        id: 'resend_smtp',
        label: 'Resend (SMTP)',
        mode: 'smtp',
        transport: 'smtp',
        host: 'smtp.resend.com',
        port: '587',
        encryption: 'starttls',
        userHint: 'resend',
        freeTier: true,
        docsUrl: 'https://resend.com/docs/send-with-smtp',
        noteKey: 'admin.settings.mail_providers.notes.resend_smtp',
    },
    {
        id: 'brevo',
        label: 'Brevo (API)',
        mode: 'api',
        transport: 'brevo',
        freeTier: true,
        docsUrl: 'https://developers.brevo.com/docs/send-a-transactional-email',
        noteKey: 'admin.settings.mail_providers.notes.brevo',
    },
    {
        id: 'brevo_smtp',
        label: 'Brevo (SMTP)',
        mode: 'smtp',
        transport: 'smtp',
        host: 'smtp-relay.brevo.com',
        port: '587',
        encryption: 'starttls',
        freeTier: true,
        docsUrl: 'https://help.brevo.com/hc/en-us/articles/209467485',
        noteKey: 'admin.settings.mail_providers.notes.brevo_smtp',
    },
    {
        id: 'sendgrid',
        label: 'SendGrid (API)',
        mode: 'api',
        transport: 'sendgrid',
        docsUrl: 'https://docs.sendgrid.com/api-reference/mail-send/mail-send',
        noteKey: 'admin.settings.mail_providers.notes.sendgrid',
    },
    {
        id: 'sendgrid_smtp',
        label: 'SendGrid (SMTP)',
        mode: 'smtp',
        transport: 'smtp',
        host: 'smtp.sendgrid.net',
        port: '587',
        encryption: 'starttls',
        userHint: 'apikey',
        docsUrl: 'https://docs.sendgrid.com/for-developers/sending-email/getting-started-smtp',
        noteKey: 'admin.settings.mail_providers.notes.sendgrid_smtp',
    },
    {
        id: 'mailgun',
        label: 'Mailgun (API)',
        mode: 'api',
        transport: 'mailgun',
        regionDefault: 'us',
        requiresDomain: true,
        requiresRegion: true,
        freeTier: true,
        docsUrl: 'https://documentation.mailgun.com/docs/mailgun/user-manual/sending-messages/',
        noteKey: 'admin.settings.mail_providers.notes.mailgun',
    },
    {
        id: 'mailgun_smtp',
        label: 'Mailgun (SMTP)',
        mode: 'smtp',
        transport: 'smtp',
        host: 'smtp.mailgun.org',
        port: '587',
        encryption: 'starttls',
        freeTier: true,
        docsUrl: 'https://documentation.mailgun.com/docs/mailgun/user-manual/sending-messages/#send-via-smtp',
        noteKey: 'admin.settings.mail_providers.notes.mailgun_smtp',
    },
    {
        id: 'postmark',
        label: 'Postmark (API)',
        mode: 'api',
        transport: 'postmark',
        docsUrl: 'https://postmarkapp.com/developer/api/email-api',
        noteKey: 'admin.settings.mail_providers.notes.postmark',
    },
    {
        id: 'postmark_smtp',
        label: 'Postmark (SMTP)',
        mode: 'smtp',
        transport: 'smtp',
        host: 'smtp.postmarkapp.com',
        port: '587',
        encryption: 'starttls',
        docsUrl: 'https://postmarkapp.com/developer/user-guide/send-email-with-smtp',
        noteKey: 'admin.settings.mail_providers.notes.postmark_smtp',
    },
    {
        id: 'mailersend',
        label: 'MailerSend (API)',
        mode: 'api',
        transport: 'mailersend',
        freeTier: true,
        docsUrl: 'https://developers.mailersend.com/api/v1/email.html',
        noteKey: 'admin.settings.mail_providers.notes.mailersend',
    },
    {
        id: 'mailersend_smtp',
        label: 'MailerSend (SMTP)',
        mode: 'smtp',
        transport: 'smtp',
        host: 'smtp.mailersend.com',
        port: '587',
        encryption: 'starttls',
        freeTier: true,
        noteKey: 'admin.settings.mail_providers.notes.mailersend_smtp',
    },
    {
        id: 'sparkpost',
        label: 'SparkPost (API)',
        mode: 'api',
        transport: 'sparkpost',
        regionDefault: 'us',
        requiresRegion: true,
        docsUrl: 'https://developers.sparkpost.com/api/transmissions/',
        noteKey: 'admin.settings.mail_providers.notes.sparkpost',
    },
    {
        id: 'sparkpost_smtp',
        label: 'SparkPost (SMTP)',
        mode: 'smtp',
        transport: 'smtp',
        host: 'smtp.sparkpostmail.com',
        port: '587',
        encryption: 'starttls',
        userHint: 'SMTP_Injection',
        noteKey: 'admin.settings.mail_providers.notes.sparkpost_smtp',
    },
    {
        id: 'ses',
        label: 'Amazon SES (API)',
        mode: 'api',
        transport: 'ses',
        regionDefault: 'us-east-1',
        requiresRegion: true,
        sesKeyFormat: true,
        docsUrl: 'https://docs.aws.amazon.com/ses/latest/dg/send-email-api.html',
        noteKey: 'admin.settings.mail_providers.notes.ses',
    },
    {
        id: 'ses_smtp',
        label: 'Amazon SES (SMTP)',
        mode: 'smtp',
        transport: 'smtp',
        host: 'email-smtp.us-east-1.amazonaws.com',
        port: '587',
        encryption: 'starttls',
        requiresRegion: true,
        regionDefault: 'us-east-1',
        docsUrl: 'https://docs.aws.amazon.com/ses/latest/dg/send-email-smtp.html',
        noteKey: 'admin.settings.mail_providers.notes.ses_smtp',
    },
    {
        id: 'gmail',
        label: 'Gmail (SMTP)',
        mode: 'smtp',
        transport: 'smtp',
        host: 'smtp.gmail.com',
        port: '587',
        encryption: 'starttls',
        freeTier: true,
        docsUrl: 'https://support.google.com/accounts/answer/185833',
        noteKey: 'admin.settings.mail_providers.notes.gmail',
    },
    {
        id: 'outlook',
        label: 'Outlook / Microsoft 365 (SMTP)',
        mode: 'smtp',
        transport: 'smtp',
        host: 'smtp.office365.com',
        port: '587',
        encryption: 'starttls',
        freeTier: true,
        docsUrl: 'https://support.microsoft.com/office/pop-imap-and-smtp-settings',
        noteKey: 'admin.settings.mail_providers.notes.outlook',
    },
    {
        id: 'mailtrap',
        label: 'Mailtrap (SMTP sandbox)',
        mode: 'smtp',
        transport: 'smtp',
        host: 'sandbox.smtp.mailtrap.io',
        port: '587',
        encryption: 'starttls',
        freeTier: true,
        docsUrl: 'https://mailtrap.io/',
        noteKey: 'admin.settings.mail_providers.notes.mailtrap',
    },
    {
        id: 'smtp2go',
        label: 'SMTP2GO (SMTP)',
        mode: 'smtp',
        transport: 'smtp',
        host: 'mail.smtp2go.com',
        port: '587',
        encryption: 'starttls',
        freeTier: true,
        docsUrl: 'https://www.smtp2go.com/setupguide/',
        noteKey: 'admin.settings.mail_providers.notes.smtp2go',
    },
];

export function getMailProviderPreset(id: string | undefined | null): MailProviderPreset {
    return MAIL_PROVIDER_PRESETS.find((p) => p.id === id) ?? MAIL_PROVIDER_PRESETS[0];
}

export function isApiMailTransport(transport: string | undefined | null): boolean {
    return !!transport && transport !== 'smtp' && transport !== '';
}

/** Setting keys that apply only when using SMTP transport. */
export const SMTP_ONLY_SETTING_KEYS = [
    'smtp_host',
    'smtp_port',
    'smtp_user',
    'smtp_pass',
    'smtp_encryption',
] as const;

/** Setting keys that apply only when using an HTTP API transport. */
export const API_ONLY_SETTING_KEYS = ['mail_api_key', 'mail_api_domain', 'mail_api_region'] as const;

/**
 * Whether a settings field should be shown for the current transport / preset.
 */
export function shouldShowMailSetting(
    settingKey: string,
    transport: string | undefined | null,
    presetId?: string | null,
): boolean {
    const api = isApiMailTransport(transport);
    if ((SMTP_ONLY_SETTING_KEYS as readonly string[]).includes(settingKey)) {
        return !api;
    }
    if (settingKey === 'mail_api_key') {
        return api;
    }
    if (settingKey === 'mail_api_domain') {
        return transport === 'mailgun';
    }
    if (settingKey === 'mail_api_region') {
        if (transport === 'mailgun' || transport === 'sparkpost' || transport === 'ses') {
            return true;
        }
        // SES SMTP region helper when preset is ses_smtp
        if (!api && presetId === 'ses_smtp') {
            return true;
        }
        return false;
    }
    return true;
}

export function applyMailProviderPreset(
    presetId: string,
    setValue: (key: string, value: string) => void,
): void {
    const preset = getMailProviderPreset(presetId);
    setValue('mail_provider_preset', preset.id);
    setValue('mail_transport', preset.transport);

    if (preset.mode === 'smtp') {
        if (preset.host !== undefined) setValue('smtp_host', preset.host);
        if (preset.port !== undefined) setValue('smtp_port', preset.port);
        if (preset.encryption !== undefined) setValue('smtp_encryption', preset.encryption);
        if (preset.userHint) setValue('smtp_user', preset.userHint);
        if (preset.id === 'ses_smtp' && preset.regionDefault) {
            setValue('mail_api_region', preset.regionDefault);
            setValue('smtp_host', `email-smtp.${preset.regionDefault}.amazonaws.com`);
        }
    } else {
        if (preset.regionDefault) setValue('mail_api_region', preset.regionDefault);
    }
}
