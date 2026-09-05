/**
 * WebSocket Service for Real-Time Museum Ticket Booking
 * Location: frontend/src/services/webSocketService.js
 */

import SockJS from 'sockjs-client';
import StompJs from '@stomp/stompjs';

class WebSocketService {
  constructor() {
    this.stompClient = null;
    this.connected = false;
    this.subscriptions = {};
  }

  /**
   * Connect to WebSocket server and setup STOMP client
   * @param {string} wsUrl - WebSocket URL (default: ws://localhost:9090/ws)
   * @param {function} onConnect - Callback when connected
   * @param {function} onError - Callback on error
   */
  connect(wsUrl = 'ws://localhost:8080/ws', onConnect = null, onError = null) {
    this.stompClient = new StompJs.Client({
      brokerURL: wsUrl,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      debug: (msg) => {
        console.log('[WebSocket Debug]', msg);
      }
    });

    this.stompClient.onConnect = () => {
      this.connected = true;
      console.log('✅ WebSocket Connected');
      
      if (onConnect) {
        onConnect();
      }

      // Subscribe to all update topics
      this.subscribeToUpdates();
    };

    this.stompClient.onStompError = (frame) => {
      console.error('❌ WebSocket Error:', frame.body);
      this.connected = false;
      
      if (onError) {
        onError(frame);
      }
    };

    this.stompClient.onDisconnect = () => {
      this.connected = false;
      console.log('⚠️ WebSocket Disconnected');
    };

    this.stompClient.activate();
  }

  /**
   * Subscribe to all museum-related update topics
   */
  subscribeToUpdates() {
    // Subscribe to general updates
    this.subscribe('/topic/updates', (message) => {
      console.log('📢 General Update:', message.body);
      // Dispatch to React state management (Redux/Context)
      window.dispatchEvent(
        new CustomEvent('websocket:update', { detail: message.body })
      );
    }, 'general-updates');

    // Subscribe to museum updates
    this.subscribe('/topic/museum-updates', (message) => {
      console.log('🏛️ Museum Update:', message.body);
      window.dispatchEvent(
        new CustomEvent('websocket:museum-update', { detail: message.body })
      );
    }, 'museum-updates');

    // Subscribe to booking updates
    this.subscribe('/topic/booking-updates', (message) => {
      console.log('🎫 Booking Update:', message.body);
      window.dispatchEvent(
        new CustomEvent('websocket:booking-update', { detail: message.body })
      );
    }, 'booking-updates');

    // Subscribe to ticket updates
    this.subscribe('/topic/ticket-updates', (message) => {
      console.log('✅ Ticket Update:', message.body);
      window.dispatchEvent(
        new CustomEvent('websocket:ticket-update', { detail: message.body })
      );
    }, 'ticket-updates');
  }

  /**
   * Subscribe to a specific topic
   * @param {string} topic - Topic to subscribe to (e.g., '/topic/updates')
   * @param {function} callback - Function to call when message received
   * @param {string} id - Unique subscription ID
   */
  subscribe(topic, callback, id = topic) {
    if (!this.stompClient || !this.connected) {
      console.warn('⚠️ WebSocket not connected. Cannot subscribe to', topic);
      return;
    }

    if (this.subscriptions[id]) {
      this.subscriptions[id].unsubscribe();
    }

    this.subscriptions[id] = this.stompClient.subscribe(topic, callback);
    console.log(`✅ Subscribed to ${topic}`);
  }

  /**
   * Unsubscribe from a topic
   * @param {string} id - Subscription ID
   */
  unsubscribe(id) {
    if (this.subscriptions[id]) {
      this.subscriptions[id].unsubscribe();
      delete this.subscriptions[id];
      console.log(`✅ Unsubscribed from ${id}`);
    }
  }

  /**
   * Send a message to the server
   * @param {string} destination - Message destination (e.g., '/app/chat')
   * @param {object} body - Message body
   */
  send(destination, body = {}) {
    if (!this.stompClient || !this.connected) {
      console.error('⚠️ WebSocket not connected. Cannot send message.');
      return;
    }

    this.stompClient.publish({
      destination: destination,
      body: JSON.stringify(body)
    });
    
    console.log(`📤 Message sent to ${destination}`, body);
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    if (this.stompClient) {
      this.stompClient.deactivate();
      this.connected = false;
      console.log('✅ WebSocket Disconnected');
    }
  }

  /**
   * Check if connected
   */
  isConnected() {
    return this.connected && this.stompClient?.connected;
  }

  /**
   * Get subscription count
   */
  getSubscriptionCount() {
    return Object.keys(this.subscriptions).length;
  }
}

// Export singleton instance
export default new WebSocketService();