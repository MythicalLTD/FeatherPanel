# Events: Spells

15 events in this category.

### `featherpanel:admin:spells:spell:created`

- **Method:** `onSpellCreated`
- **Emitted:** yes
- **Callback docs:** array spell data.
- **Data keys:** `created_by`, `spell`

**Source files**

- `backend/app/Controllers/Admin/SpellsController.php`

### `featherpanel:admin:spells:spell:deleted`

- **Method:** `onSpellDeleted`
- **Emitted:** yes
- **Callback docs:** int spell id, array spell data.
- **Data keys:** `deleted_by`, `spell`

**Source files**

- `backend/app/Controllers/Admin/SpellsController.php`

### `featherpanel:admin:spells:spell:exported`

- **Method:** `onSpellExported`
- **Emitted:** no (defined only)
- **Callback docs:** int spell id, array export data.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:admin:spells:spell:not:found`

- **Method:** `onSpellNotFound`
- **Emitted:** no (defined only)
- **Callback docs:** int spell id, string error message.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:admin:spells:spell:retrieved`

- **Method:** `onSpellRetrieved`
- **Emitted:** no (defined only)
- **Callback docs:** int spell id, array spell data.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:admin:spells:by:realm:retrieved`

- **Method:** `onSpellsByRealmRetrieved`
- **Emitted:** no (defined only)
- **Callback docs:** int realm id, array spells.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:admin:spells:error`

- **Method:** `onSpellsError`
- **Emitted:** no (defined only)
- **Callback docs:** string error message, array context.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:admin:spells:spells:imported`

- **Method:** `onSpellsImported`
- **Emitted:** no (defined only)
- **Callback docs:** array import data, array results.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:admin:spells:reordered`

- **Method:** `onSpellsReordered`
- **Emitted:** yes
- **Callback docs:** int realm id, array spells, array reordered_by.
- **Data keys:** `realm_id`, `reordered_by`, `spells`

**Source files**

- `backend/app/Controllers/Admin/SpellsController.php`

### `featherpanel:admin:spells:retrieved`

- **Method:** `onSpellsRetrieved`
- **Emitted:** no (defined only)
- **Callback docs:** array spells list.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:admin:spells:spell:updated`

- **Method:** `onSpellUpdated`
- **Emitted:** yes
- **Callback docs:** int spell id, array old data, array new data.
- **Data keys:** `spell`, `updated_by`, `updated_data`

**Source files**

- `backend/app/Controllers/Admin/SpellsController.php`

### `featherpanel:admin:spells:variable:created`

- **Method:** `onSpellVariableCreated`
- **Emitted:** yes
- **Callback docs:** int spell id, array variable data.
- **Data keys:** `spell_id`, `variable`

**Source files**

- `backend/app/Controllers/Admin/SpellsController.php`

### `featherpanel:admin:spells:variable:deleted`

- **Method:** `onSpellVariableDeleted`
- **Emitted:** yes
- **Callback docs:** int variable id, array variable data.
- **Data keys:** `variable`

**Source files**

- `backend/app/Controllers/Admin/SpellsController.php`

### `featherpanel:admin:spells:variables:retrieved`

- **Method:** `onSpellVariablesRetrieved`
- **Emitted:** no (defined only)
- **Callback docs:** int spell id, array variables.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:admin:spells:variable:updated`

- **Method:** `onSpellVariableUpdated`
- **Emitted:** yes
- **Callback docs:** int variable id, array old data, array new data.
- **Data keys:** `updated_data`, `variable`

**Source files**

- `backend/app/Controllers/Admin/SpellsController.php`

