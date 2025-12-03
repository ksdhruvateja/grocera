import React, { useState, useEffect } from 'react';
import './AdminMessages.css';

export default function AdminMessages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unread, read, replied, resolved
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [stats, setStats] = useState({});

  // Load messages from backend
  useEffect(() => {
    loadMessages();
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.error('No token found');
        setLoading(false);
        return;
      }

      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/admin/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      } else {
        console.error('Failed to load messages');
        setMessages([]);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/admin/messages/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.stats || {});
      }
    } catch (error) {
      console.error('Error loading message stats:', error);
    }
  };

  const updateMessageStatus = async (messageId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/admin/messages/${messageId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        setMessages(prev => 
          prev.map(message => 
            message._id === messageId ? { ...message, status: newStatus } : message
          )
        );
        loadStats(); // Refresh stats
      } else {
        throw new Error('Failed to update message status');
      }
    } catch (error) {
      console.error('Error updating message status:', error);
      alert('Error updating message status. Please try again.');
    }
  };

  const sendReply = async (messageId) => {
    if (!replyText.trim()) {
      alert('Please enter a reply message.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/admin/messages/${messageId}/reply`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ replyMessage: replyText })
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(prev => 
          prev.map(message => 
            message._id === messageId ? data.data : message
          )
        );
        setReplyText('');
        setSelectedMessage(null);
        loadStats(); // Refresh stats
        alert('Reply sent successfully!');
      } else {
        throw new Error('Failed to send reply');
      }
    } catch (error) {
      console.error('Error sending reply:', error);
      alert('Error sending reply. Please try again.');
    }
  };

  const filteredMessages = messages.filter(message => {
    const matchesFilter = filter === 'all' || message.status === filter;
    const customerName = `${message.firstName} ${message.lastName}`.toLowerCase();
    const matchesSearch = customerName.includes(searchTerm.toLowerCase()) ||
                         message.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         message.subject.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'unread': return '#e74c3c';
      case 'read': return '#f39c12';
      case 'replied': return '#3498db';
      case 'resolved': return '#27ae60';
      default: return '#95a5a6';
    }
  };

  const getInquiryTypeColor = (type) => {
    switch (type) {
      case 'general': return '#3498db';
      case 'order': return '#9b59b6';
      case 'delivery': return '#f39c12';
      case 'product': return '#27ae60';
      case 'complaint': return '#e74c3c';
      case 'compliment': return '#1abc9c';
      default: return '#95a5a6';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="admin-messages-container">
        <div className="loading-section">
          <div className="loading-spinner"></div>
          <p>Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-messages-container">
      <div className="messages-header">
        <h1>💬 Customer Messages</h1>
        
        {/* Statistics Cards */}
        <div className="stats-cards">
          <div className="stat-card">
            <h3>{stats.total || 0}</h3>
            <p>Total Messages</p>
          </div>
          <div className="stat-card unread">
            <h3>{stats.unread || 0}</h3>
            <p>Unread</p>
          </div>
          <div className="stat-card read">
            <h3>{stats.read || 0}</h3>
            <p>Read</p>
          </div>
          <div className="stat-card replied">
            <h3>{stats.replied || 0}</h3>
            <p>Replied</p>
          </div>
          <div className="stat-card resolved">
            <h3>{stats.resolved || 0}</h3>
            <p>Resolved</p>
          </div>
        </div>
        
        <div className="messages-controls">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search by name, email, or subject..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="filter-dropdown">
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">All Messages</option>
              <option value="unread">Unread</option>
              <option value="read">Read</option>
              <option value="replied">Replied</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
        </div>
      </div>

      {filteredMessages.length === 0 ? (
        <div className="no-messages">
          <p>No messages found.</p>
          {filter === 'all' && messages.length === 0 && (
            <p>Customer messages will appear here when they contact you.</p>
          )}
        </div>
      ) : (
        <div className="messages-grid">
          {filteredMessages.map(message => (
            <div key={message._id} className="message-card">
              <div className="message-header">
                <div className="message-info">
                  <h3>{message.firstName} {message.lastName}</h3>
                  <p className="message-email">{message.email}</p>
                  <p className="message-date">{formatDate(message.createdAt)}</p>
                </div>
                <div className="message-badges">
                  <span 
                    className="status-badge" 
                    style={{ backgroundColor: getStatusColor(message.status) }}
                  >
                    {message.status.toUpperCase()}
                  </span>
                  <span 
                    className="inquiry-badge" 
                    style={{ backgroundColor: getInquiryTypeColor(message.inquiryType) }}
                  >
                    {message.inquiryType.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="message-content">
                <h4>Subject: {message.subject}</h4>
                <div className="message-text">
                  <p>{message.message}</p>
                </div>
                
                {message.replyMessage && (
                  <div className="admin-reply">
                    <h5>Admin Reply:</h5>
                    <p>{message.replyMessage}</p>
                    <small>Replied on {formatDate(message.repliedAt)}</small>
                  </div>
                )}
              </div>

              <div className="message-actions">
                <select 
                  value={message.status} 
                  onChange={(e) => updateMessageStatus(message._id, e.target.value)}
                  className="status-select"
                >
                  <option value="unread">Mark as Unread</option>
                  <option value="read">Mark as Read</option>
                  <option value="replied">Replied</option>
                  <option value="resolved">Resolved</option>
                </select>
                
                {message.status !== 'replied' && (
                  <button 
                    onClick={() => setSelectedMessage(message._id)}
                    className="reply-btn"
                  >
                    Reply
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reply Modal */}
      {selectedMessage && (
        <div className="reply-modal-overlay" onClick={() => setSelectedMessage(null)}>
          <div className="reply-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Reply to Message</h3>
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Type your reply here..."
              rows="6"
            />
            <div className="modal-actions">
              <button onClick={() => setSelectedMessage(null)} className="cancel-btn">
                Cancel
              </button>
              <button onClick={() => sendReply(selectedMessage)} className="send-btn">
                Send Reply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}