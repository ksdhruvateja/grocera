import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { MessageCircle, X, Send, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import './ChatWidget.css';

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, text: '👋 Hello! How can we help you today?', sender: 'bot', timestamp: new Date() }
  ]);
  const [inputValue, setInputValue] = useState('');

  // React Query Mutation for sending chat messages
  const sendMessageMutation = useMutation({
    mutationFn: async (payload) => {
      console.log('🚀 Sending message mutation:', payload);
      
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/admin/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Message mutation success:', data);
      return data;
    },
    onSuccess: (data) => {
      console.log('💾 Chat mutation cached in React Query:', data);
      
      // Add bot response on success
      const botMessage = {
        id: messages.length + 2,
        text: '✅ Your message has been sent! Our team will respond shortly.',
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
      toast.success('Message sent successfully!');
    },
    onError: (error) => {
      console.error('❌ Chat mutation failed:', error.message);
      
      // Add error message
      const errorMessage = {
        id: messages.length + 2,
        text: `❌ Failed to send message: ${error.message}. Please try again.`,
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      toast.error('Failed to send message');
    }
  });

  const handleSendMessage = (e) => {
    e.preventDefault();
    
    if (!inputValue.trim()) return;
    if (sendMessageMutation.isPending) return;

    const messageText = inputValue;

    // Add user message immediately
    const userMessage = {
      id: messages.length + 1,
      text: messageText,
      sender: 'user',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');

    // Call mutation
    sendMessageMutation.mutate({
      firstName: 'Chat User',
      lastName: 'Widget',
      email: localStorage.getItem('userEmail') || 'chat-widget@zippyyy.com',
      subject: 'Chat Widget Message',
      message: messageText,
      inquiryType: 'general',
      timestamp: new Date().toISOString(),
      status: 'unread'
    });
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="chat-widget-container">
      {/* Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="chat-button"
          aria-label="Open chat"
        >
          <MessageCircle size={24} />
          <span className="chat-badge">💬</span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="chat-window">
          {/* Header */}
          <div className="chat-header">
            <h3>Zippyyy Support</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="close-button"
              aria-label="Close chat"
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages Container */}
          <div className="chat-messages">
            {messages.map((msg) => (
              <div key={msg.id} className={`chat-message ${msg.sender}`}>
                <div className="message-content">
                  <p>{msg.text}</p>
                  <span className="message-time">{formatTime(msg.timestamp)}</span>
                </div>
              </div>
            ))}
            
            {/* Loading indicator */}
            {sendMessageMutation.isPending && (
              <div className="chat-message bot">
                <div className="message-content">
                  <p>⏳ Sending...</p>
                </div>
              </div>
            )}

            {/* Error state indicator */}
            {sendMessageMutation.isError && (
              <div className="chat-message bot">
                <div className="message-content error">
                  <p className="error-text">
                    <AlertCircle size={14} style={{ display: 'inline', marginRight: '4px' }} />
                    Error: {sendMessageMutation.error?.message || 'Unknown error'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Input Form */}
          <form onSubmit={handleSendMessage} className="chat-form">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type your message..."
              disabled={sendMessageMutation.isPending}
              className="chat-input"
            />
            <button
              type="submit"
              disabled={sendMessageMutation.isPending || !inputValue.trim()}
              className="send-button"
              aria-label="Send message"
              title={sendMessageMutation.isPending ? 'Sending...' : 'Send message'}
            >
              {sendMessageMutation.isPending ? (
                <span className="spinner-icon">↻</span>
              ) : (
                <Send size={18} />
              )}
            </button>
          </form>

          {/* Debug Button - Test Chat Request */}
          <button
            onClick={() => {
              console.log('🧪 Debug: Triggering test chat request');
              sendMessageMutation.mutate({
                firstName: 'Debug',
                lastName: 'Tester',
                email: 'debug@test.com',
                subject: 'Debug Test Message',
                message: 'test from debug button',
                inquiryType: 'general',
                timestamp: new Date().toISOString(),
                status: 'unread'
              });
            }}
            disabled={sendMessageMutation.isPending}
            className="debug-button"
            title="Test mutation in React Query DevTools"
          >
            Test Chat Request 🧪
          </button>
        </div>
      )}
    </div>
  );
};

export default ChatWidget;
