# Frontend components

## Canonical imports

| Need                                                                                  | Import from                       |
| ------------------------------------------------------------------------------------- | --------------------------------- |
| Button, Input, Textarea, PageHeader, PageCard, ResourceCard, EmptyState, FormSection  | `@/components/featherui/*`        |
| Dialog, AlertDialog, ConfirmDialog, Sheet, Checkbox, Tabs, Switch, Table, PickerSheet | `@/components/ui/*`               |
| Select (native)                                                                       | `@/components/ui/select-native`   |
| Headless select                                                                       | `@/components/ui/headless-select` |

Do **not** import `@/components/ui/button`, `@/components/ui/input`, or `@/components/ui/textarea` in new code.
Those modules re-export featherui for backward compatibility only.

Do **not** import `@/components/ui/headless-modal` or raw `@headlessui/react` Dialog for new modals — use `Dialog` / `AlertDialog` / `ConfirmDialog` / `Sheet`.

Prefer `ConfirmDialog` for destructive confirms instead of ad-hoc Dialog shells or `window.confirm`.
Prefer `FormSection` for wizard/create form shells instead of hand-rolled `backdrop-blur-3xl` glass cards.
Prefer `PickerSheet` for admin searchable pickers.
