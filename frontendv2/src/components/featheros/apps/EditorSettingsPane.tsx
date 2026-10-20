/*
This file is part of FeatherPanel.

Copyright (C) 2025 MythicalSystems Studios
Copyright (C) 2025 FeatherPanel Contributors
Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

See the LICENSE file or <https://www.gnu.org/licenses/>.
*/

'use client';

import { RotateCcw } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import {
    type EditorAutoSaveDelay,
    type EditorCursorStyle,
    type EditorRenderWhitespace,
    type FeatherOsEditorPrefs,
} from '../editorPrefs';
import { OsRange } from '../controls';

type Props = {
    prefs: FeatherOsEditorPrefs;
    setPrefs: (patch: Partial<FeatherOsEditorPrefs>) => void;
    resetPrefs: () => void;
};

function CheckRow({
    checked,
    onChange,
    label,
    hint,
}: {
    checked: boolean;
    onChange: (v: boolean) => void;
    label: string;
    hint?: string;
}) {
    return (
        <label className='fos-editor-pref-row' title={hint}>
            <input
                type='checkbox'
                className='fos-editor-check'
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
            />
            <span className='fos-editor-pref-label'>{label}</span>
        </label>
    );
}

function SelectRow({
    label,
    value,
    onChange,
    options,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    options: { value: string; label: string }[];
}) {
    return (
        <label className='fos-editor-pref-row fos-editor-pref-row-select'>
            <span className='fos-editor-pref-label'>{label}</span>
            <select
                className='fos-editor-pref-select'
                value={value}
                onChange={(e) => onChange(e.target.value)}
                aria-label={label}
            >
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
        </label>
    );
}

export function EditorSettingsPane({ prefs, setPrefs, resetPrefs }: Props) {
    const { t } = useTranslation();

    return (
        <div className='fos-editor-settings fos-scroll'>
            <div className='fos-editor-sidebar-heading'>
                <span>{t('featheros.editor.settings')}</span>
                <button
                    type='button'
                    onClick={resetPrefs}
                    title={t('featheros.editor.reset_settings')}
                    aria-label={t('featheros.editor.reset_settings')}
                >
                    <RotateCcw size={13} />
                </button>
            </div>

            <section className='fos-editor-pref-group'>
                <h3>{t('featheros.editor.prefs_saving')}</h3>
                <CheckRow
                    checked={prefs.autoSave}
                    onChange={(autoSave) => setPrefs({ autoSave })}
                    label={t('featheros.editor.auto_save')}
                    hint={t('featheros.editor.auto_save_hint')}
                />
                <SelectRow
                    label={t('featheros.editor.auto_save_delay')}
                    value={String(prefs.autoSaveDelayMs)}
                    onChange={(v) => setPrefs({ autoSaveDelayMs: Number(v) as EditorAutoSaveDelay })}
                    options={[
                        { value: '1000', label: t('featheros.editor.delay_1s') },
                        { value: '2000', label: t('featheros.editor.delay_2s') },
                        { value: '5000', label: t('featheros.editor.delay_5s') },
                        { value: '10000', label: t('featheros.editor.delay_10s') },
                    ]}
                />
                <CheckRow
                    checked={prefs.formatOnSave}
                    onChange={(formatOnSave) => setPrefs({ formatOnSave })}
                    label={t('featheros.editor.format_on_save')}
                    hint={t('featheros.editor.format_on_save_hint')}
                />
            </section>

            <section className='fos-editor-pref-group'>
                <h3>{t('featheros.editor.prefs_display')}</h3>
                <label className='fos-editor-pref-row fos-editor-pref-row-select'>
                    <span className='fos-editor-pref-label'>{t('featheros.editor.font_size')}</span>
                    <div className='fos-editor-pref-range'>
                        <OsRange
                            min={11}
                            max={22}
                            value={prefs.fontSize}
                            onChange={(v) => setPrefs({ fontSize: v })}
                            aria-label={t('featheros.editor.font_size')}
                        />
                        <span className='fos-editor-pref-value'>{prefs.fontSize}</span>
                    </div>
                </label>
                <CheckRow
                    checked={prefs.fontLigatures}
                    onChange={(fontLigatures) => setPrefs({ fontLigatures })}
                    label={t('featheros.editor.font_ligatures')}
                />
                <CheckRow
                    checked={prefs.wordWrap}
                    onChange={(wordWrap) => setPrefs({ wordWrap })}
                    label={t('featheros.editor.word_wrap')}
                />
                <CheckRow
                    checked={prefs.minimap}
                    onChange={(minimap) => setPrefs({ minimap })}
                    label={t('featheros.editor.minimap')}
                />
                <CheckRow
                    checked={prefs.lineNumbers}
                    onChange={(lineNumbers) => setPrefs({ lineNumbers })}
                    label={t('featheros.editor.line_numbers')}
                />
                <CheckRow
                    checked={prefs.stickyScroll}
                    onChange={(stickyScroll) => setPrefs({ stickyScroll })}
                    label={t('featheros.editor.sticky_scroll')}
                    hint={t('featheros.editor.sticky_scroll_hint')}
                />
                <CheckRow
                    checked={prefs.rulers}
                    onChange={(rulers) => setPrefs({ rulers })}
                    label={t('featheros.editor.rulers')}
                    hint={t('featheros.editor.rulers_hint')}
                />
                <CheckRow
                    checked={prefs.bracketPairColorization}
                    onChange={(bracketPairColorization) => setPrefs({ bracketPairColorization })}
                    label={t('featheros.editor.bracket_colors')}
                />
                <CheckRow
                    checked={prefs.smoothCaret}
                    onChange={(smoothCaret) => setPrefs({ smoothCaret })}
                    label={t('featheros.editor.smooth_caret')}
                />
            </section>

            <section className='fos-editor-pref-group'>
                <h3>{t('featheros.editor.prefs_editing')}</h3>
                <SelectRow
                    label={t('featheros.editor.tab_size')}
                    value={String(prefs.tabSize)}
                    onChange={(v) => setPrefs({ tabSize: Number(v) as 2 | 4 | 8 })}
                    options={[
                        { value: '2', label: '2' },
                        { value: '4', label: '4' },
                        { value: '8', label: '8' },
                    ]}
                />
                <CheckRow
                    checked={prefs.insertSpaces}
                    onChange={(insertSpaces) => setPrefs({ insertSpaces })}
                    label={t('featheros.editor.insert_spaces')}
                />
                <SelectRow
                    label={t('featheros.editor.render_whitespace')}
                    value={prefs.renderWhitespace}
                    onChange={(v) => setPrefs({ renderWhitespace: v as EditorRenderWhitespace })}
                    options={[
                        { value: 'none', label: t('featheros.editor.whitespace_none') },
                        { value: 'selection', label: t('featheros.editor.whitespace_selection') },
                        { value: 'all', label: t('featheros.editor.whitespace_all') },
                    ]}
                />
                <SelectRow
                    label={t('featheros.editor.cursor_style')}
                    value={prefs.cursorStyle}
                    onChange={(v) => setPrefs({ cursorStyle: v as EditorCursorStyle })}
                    options={[
                        { value: 'line', label: t('featheros.editor.cursor_line') },
                        { value: 'block', label: t('featheros.editor.cursor_block') },
                        { value: 'underline', label: t('featheros.editor.cursor_underline') },
                    ]}
                />
            </section>
        </div>
    );
}
