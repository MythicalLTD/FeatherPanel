# Events: Chatbot

2 events in this category.

### `featherpanel:chatbot:conversation:delete`

- **Method:** `onConversationDeleted`
- **Emitted:** yes
- **Callback docs:** string user uuid, int conversation id.
- **Data keys:** `conversation_id`, `user_uuid`

**Source files**

- `backend/app/Controllers/User/ChatbotController.php`
- `backend/app/Controllers/User/VdsChatbotController.php`

### `featherpanel:chatbot:conversation:memory:update`

- **Method:** `onConversationMemoryUpdated`
- **Emitted:** yes
- **Callback docs:** string user uuid, int conversation id, string memory.
- **Data keys:** `conversation_id`, `memory`, `user_uuid`

**Source files**

- `backend/app/Controllers/User/ChatbotController.php`
- `backend/app/Controllers/User/VdsChatbotController.php`

