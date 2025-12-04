## ChatWidget React Query Integration

### Location
`src/components/layout/ChatWidget.jsx`

---

## ✅ React Query Mutation Implementation

### Hook Used
```jsx
const sendMessageMutation = useMutation({
  mutationFn: async (payload) => { ... },
  onSuccess: (data) => { ... },
  onError: (error) => { ... }
});
```

### Mutation Flow

1. **User Types Message** → Input field captures text
2. **User Clicks Send** → Form submission triggered
3. **handleSendMessage** Called:
   - Validates input (not empty)
   - Adds user message to UI immediately
   - Calls `sendMessageMutation.mutate(payload)`
4. **Mutation Executes**:
   - Calls API endpoint: `POST /api/admin/messages`
   - Logs request in console: 🚀 `Sending message mutation`
   - On success: ✅ Logs response, adds bot confirmation
   - On error: ❌ Logs error, displays error message in chat

---

## 📊 Mutation States

### `sendMessageMutation.isPending`
- Button is disabled
- Input field is disabled
- Spinner icon shown in send button
- "⏳ Sending..." message appears in chat

### `sendMessageMutation.isError`
- Error message displays in red box
- Shows error details with AlertCircle icon
- User can retry

### `sendMessageMutation.isSuccess`
- Success toast notification appears
- Bot confirmation message added to chat

---

## 🔍 Console Logging

When you send a message, check the browser console (F12) for:

```
🚀 Sending message mutation: {
  firstName: "Chat User",
  lastName: "Widget",
  email: "chat-widget@zippyyy.com",
  subject: "Chat Widget Message",
  message: "Your message text",
  inquiryType: "general",
  timestamp: "2025-12-04T...",
  status: "unread"
}

✅ Message mutation success: { success: true, ... }
💾 Chat mutation cached in React Query: { ... }
```

Or on error:
```
❌ Chat mutation failed: API error: 500
```

---

## 🎯 React Query DevTools Integration

### To View the Mutation in DevTools:

1. Open browser to `http://localhost:3000`
2. Send a chat message
3. Press **`Ctrl + K`** to open React Query DevTools
4. Click on **Mutations** tab
5. You'll see:
   - **Mutation Name**: (unnamed mutation)
   - **Status**: `success` | `error` | `pending`
   - **Variables**: The payload sent
   - **Data**: The response received
   - **Error**: Error message if failed

### Example DevTools Entry:

```
Mutation (Unnamed)
├─ Status: success
├─ Variables: {
│   firstName: "Chat User",
│   lastName: "Widget",
│   message: "Hello"
│   ... other fields
├─ Data: { success: true, id: "..." }
└─ Last Updated: 12:34:56 PM
```

---

## 🛠️ UI Elements Tied to Mutation State

### Send Button
```jsx
<button
  disabled={sendMessageMutation.isPending || !inputValue.trim()}
  // Shows spinning icon when isPending=true
  // Shows send icon normally
>
  {sendMessageMutation.isPending ? '↻' : <Send />}
</button>
```

### Input Field
```jsx
<input
  disabled={sendMessageMutation.isPending}
  // Prevents typing while sending
/>
```

### Chat Messages
```jsx
{/* Displays while sending */}
{sendMessageMutation.isPending && (
  <ChatMessage>⏳ Sending...</ChatMessage>
)}

{/* Displays if error */}
{sendMessageMutation.isError && (
  <ChatMessage error>❌ Error: {...}</ChatMessage>
)}
```

---

## 📝 Payload Structure

When mutation fires, this payload is sent:

```javascript
{
  firstName: "Chat User",              // Static
  lastName: "Widget",                  // Static
  email: "chat-widget@zippyyy.com",    // From localStorage or default
  subject: "Chat Widget Message",      // Static
  message: "User's typed message",     // Dynamic - from input
  inquiryType: "general",              // Static
  timestamp: "2025-12-04T12:34:56Z",   // Current time ISO string
  status: "unread"                     // Static
}
```

---

## 🔗 API Endpoint

**POST** `/api/admin/messages`

Expected response:
```json
{
  "success": true,
  "message": "Message received",
  "id": "message-id-123"
}
```

---

## ✨ User Experience Flow

### Success Path
1. User types "Hello"
2. Click send
3. Message appears in chat (optimistic update)
4. Button shows spinner ↻
5. API called (visible in DevTools)
6. Response received
7. ✅ Success toast: "Message sent successfully!"
8. Bot message: "✅ Your message has been sent! Our team will respond shortly."
9. Button returns to normal

### Error Path
1. User types "Help"
2. Click send
3. Message appears in chat
4. Button shows spinner ↻
5. API called
6. Error response (e.g., 500)
7. ❌ Error toast: "Failed to send message"
8. Red error message: "❌ Failed to send message: API error: 500. Please try again."
9. User can retry by typing and sending again

---

## 🧪 Testing

### To Test the Mutation:

1. **Normal Flow**:
   - Type "Test message"
   - Click send
   - Check console for logs
   - Press Ctrl+K to see DevTools
   - Verify mutation shows as success

2. **Error Handling**:
   - Stop backend server (npm kill node)
   - Type message
   - Click send
   - Should show error message
   - Error visible in DevTools

3. **Network Inspection**:
   - Open DevTools → Network tab
   - Send message
   - Find POST `/api/admin/messages` request
   - View request/response body

---

## 📦 Dependencies Used

- `@tanstack/react-query` (v5) - useMutation hook
- `lucide-react` - AlertCircle, Send icons
- `react-hot-toast` - Toast notifications

---

## 🎨 CSS Classes

- `.message-content.error` - Red error styling
- `.spinner-icon` - Rotating spinner animation
- `.error-text` - Error message typography

---

## 🚀 Next Steps

To enhance this further:

1. **Add typing indicator**: Show "... is typing" when mutation pending
2. **Retry logic**: useMutation has built-in retry options
3. **Offline support**: React Query caches mutations automatically
4. **Real-time responses**: Add socket.io listeners for live bot replies
5. **Message history**: Persist messages to localStorage
6. **File uploads**: Extend mutation to handle attachments
