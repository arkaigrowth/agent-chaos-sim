/* WebSocket Integration Module
 * Provides real-time communication for chaos testing system
 * Handles evaluation progress streaming, live updates, and multi-client synchronization
 */

class ChaosWebSocketManager {
  constructor() {
    this.connections = new Map();
    this.rooms = new Map(); // For grouping connections by evaluation runs
    this.messageQueue = new Map(); // Queue messages for offline clients
    this.heartbeatInterval = 30000; // 30 seconds
    this.maxQueueSize = 1000;
    this.reconnectAttempts = new Map();
    this.maxReconnectAttempts = 5;

    this.eventHandlers = {
      'evaluation.start': this.handleEvaluationStart.bind(this),
      'evaluation.progress': this.handleEvaluationProgress.bind(this),
      'evaluation.complete': this.handleEvaluationComplete.bind(this),
      'evaluation.error': this.handleEvaluationError.bind(this),
      'case.start': this.handleCaseStart.bind(this),
      'case.complete': this.handleCaseComplete.bind(this),
      'batch.progress': this.handleBatchProgress.bind(this),
      'system.alert': this.handleSystemAlert.bind(this)
    };

    this.init();
  }

  init() {
    // Initialize WebSocket server (in real implementation, this would be server-side)
    this.setupEventTarget();
    this.startHeartbeat();
    console.log('WebSocket Manager initialized');
  }

  setupEventTarget() {
    // For browser environments, simulate WebSocket with EventTarget
    this.eventTarget = new EventTarget();
    this.messageEventTarget = new EventTarget();
  }

  /**
   * Create a new WebSocket connection
   * @param {Object} options - Connection options
   * @returns {Object} Connection info
   */
  createConnection(options = {}) {
    const connectionId = this.generateConnectionId();
    const connection = {
      id: connectionId,
      clientId: options.clientId || this.generateClientId(),
      subscriptions: new Set(),
      lastSeen: Date.now(),
      metadata: {
        userAgent: options.userAgent || 'Unknown',
        ip: options.ip || '127.0.0.1',
        connectedAt: new Date().toISOString()
      },
      state: 'connected',
      messageQueue: []
    };

    this.connections.set(connectionId, connection);
    
    // Auto-cleanup on disconnect
    setTimeout(() => {
      this.cleanupConnection(connectionId);
    }, 300000); // 5 minutes timeout

    return {
      connectionId,
      clientId: connection.clientId,
      subscriptionUrl: `ws://localhost:8080/v1/stream/${connectionId}`,
      heartbeatInterval: this.heartbeatInterval
    };
  }

  /**
   * Subscribe connection to specific events or runs
   * @param {string} connectionId - Connection ID
   * @param {Object} subscription - Subscription details
   */
  subscribe(connectionId, subscription) {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error('Connection not found');
    }

    const subId = this.generateSubscriptionId();
    const sub = {
      id: subId,
      type: subscription.type, // 'run', 'suite', 'system', 'all'
      target: subscription.target, // specific run/suite ID
      filters: subscription.filters || {},
      createdAt: Date.now()
    };

    connection.subscriptions.add(sub);

    // Join appropriate rooms
    if (subscription.type === 'run') {
      this.joinRoom(connectionId, `run:${subscription.target}`);
    } else if (subscription.type === 'suite') {
      this.joinRoom(connectionId, `suite:${subscription.target}`);
    } else if (subscription.type === 'system') {
      this.joinRoom(connectionId, 'system');
    }

    return subId;
  }

  /**
   * Unsubscribe from events
   * @param {string} connectionId - Connection ID
   * @param {string} subscriptionId - Subscription ID to remove
   */
  unsubscribe(connectionId, subscriptionId) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    connection.subscriptions = new Set(
      [...connection.subscriptions].filter(sub => sub.id !== subscriptionId)
    );
  }

  /**
   * Join a message room
   * @param {string} connectionId - Connection ID
   * @param {string} roomId - Room to join
   */
  joinRoom(connectionId, roomId) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set());
    }
    this.rooms.get(roomId).add(connectionId);
  }

  /**
   * Leave a message room
   * @param {string} connectionId - Connection ID
   * @param {string} roomId - Room to leave
   */
  leaveRoom(connectionId, roomId) {
    if (this.rooms.has(roomId)) {
      this.rooms.get(roomId).delete(connectionId);
      if (this.rooms.get(roomId).size === 0) {
        this.rooms.delete(roomId);
      }
    }
  }

  /**
   * Broadcast message to all connections in room
   * @param {string} roomId - Target room
   * @param {Object} message - Message to send
   */
  broadcastToRoom(roomId, message) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const enhancedMessage = {
      ...message,
      timestamp: new Date().toISOString(),
      room: roomId,
      id: this.generateMessageId()
    };

    for (const connectionId of room) {
      this.sendToConnection(connectionId, enhancedMessage);
    }
  }

  /**
   * Send message to specific connection
   * @param {string} connectionId - Target connection
   * @param {Object} message - Message to send
   */
  sendToConnection(connectionId, message) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    if (connection.state === 'connected') {
      // In real implementation, send via WebSocket
      this.deliverMessage(connection, message);
    } else {
      // Queue message for delivery when reconnected
      this.queueMessage(connectionId, message);
    }
  }

  /**
   * Deliver message to connection
   * @param {Object} connection - Connection object
   * @param {Object} message - Message to deliver
   */
  deliverMessage(connection, message) {
    // Simulate WebSocket message delivery
    this.messageEventTarget.dispatchEvent(new CustomEvent('message', {
      detail: {
        connectionId: connection.id,
        clientId: connection.clientId,
        message
      }
    }));
    
    connection.lastSeen = Date.now();
  }

  /**
   * Queue message for offline connection
   * @param {string} connectionId - Connection ID
   * @param {Object} message - Message to queue
   */
  queueMessage(connectionId, message) {
    if (!this.messageQueue.has(connectionId)) {
      this.messageQueue.set(connectionId, []);
    }

    const queue = this.messageQueue.get(connectionId);
    if (queue.length >= this.maxQueueSize) {
      queue.shift(); // Remove oldest message
    }
    
    queue.push({
      ...message,
      queuedAt: Date.now()
    });
  }

  /**
   * Send queued messages when connection reconnects
   * @param {string} connectionId - Reconnected connection ID
   */
  sendQueuedMessages(connectionId) {
    const queue = this.messageQueue.get(connectionId);
    if (!queue || queue.length === 0) return;

    const connection = this.connections.get(connectionId);
    if (!connection) return;

    for (const message of queue) {
      this.deliverMessage(connection, {
        ...message,
        redelivered: true,
        originalTimestamp: message.timestamp,
        redeliveredAt: new Date().toISOString()
      });
    }

    this.messageQueue.delete(connectionId);
  }

  // Event Handlers

  handleEvaluationStart(data) {
    const message = {
      type: 'evaluation.start',
      runId: data.runId,
      suite: data.suite,
      estimatedDuration: data.estimatedDuration,
      totalCases: data.totalCases
    };
    
    this.broadcastToRoom(`run:${data.runId}`, message);
    this.broadcastToRoom(`suite:${data.suiteId}`, message);
  }

  handleEvaluationProgress(data) {
    const message = {
      type: 'evaluation.progress',
      runId: data.runId,
      progress: data.progress,
      currentCase: data.currentCase,
      completedCases: data.completedCases,
      totalCases: data.totalCases,
      estimatedTimeRemaining: data.estimatedTimeRemaining
    };

    this.broadcastToRoom(`run:${data.runId}`, message);
  }

  handleEvaluationComplete(data) {
    const message = {
      type: 'evaluation.complete',
      runId: data.runId,
      results: data.results,
      duration: data.duration,
      overallScore: data.overallScore,
      passedGate: data.passedGate
    };

    this.broadcastToRoom(`run:${data.runId}`, message);
    this.broadcastToRoom(`suite:${data.suiteId}`, message);
    
    // Cleanup room after completion
    setTimeout(() => {
      this.rooms.delete(`run:${data.runId}`);
    }, 300000); // 5 minutes
  }

  handleEvaluationError(data) {
    const message = {
      type: 'evaluation.error',
      runId: data.runId,
      error: data.error,
      context: data.context
    };

    this.broadcastToRoom(`run:${data.runId}`, message);
    this.broadcastToRoom('system', message);
  }

  handleCaseStart(data) {
    const message = {
      type: 'case.start',
      runId: data.runId,
      caseIndex: data.caseIndex,
      caseName: data.caseName,
      scenario: data.scenario
    };

    this.broadcastToRoom(`run:${data.runId}`, message);
  }

  handleCaseComplete(data) {
    const message = {
      type: 'case.complete',
      runId: data.runId,
      caseIndex: data.caseIndex,
      caseName: data.caseName,
      result: data.result,
      passed: data.passed
    };

    this.broadcastToRoom(`run:${data.runId}`, message);
  }

  handleBatchProgress(data) {
    const message = {
      type: 'batch.progress',
      batchId: data.batchId,
      completedRuns: data.completedRuns,
      totalRuns: data.totalRuns,
      progress: data.progress,
      failedRuns: data.failedRuns
    };

    this.broadcastToRoom(`batch:${data.batchId}`, message);
  }

  handleSystemAlert(data) {
    const message = {
      type: 'system.alert',
      severity: data.severity, // 'info', 'warning', 'error', 'critical'
      title: data.title,
      description: data.description,
      actionRequired: data.actionRequired || false
    };

    this.broadcastToRoom('system', message);
  }

  // Utility Methods

  startHeartbeat() {
    setInterval(() => {
      this.sendHeartbeat();
      this.cleanupStaleConnections();
    }, this.heartbeatInterval);
  }

  sendHeartbeat() {
    const heartbeatMessage = {
      type: 'heartbeat',
      timestamp: new Date().toISOString(),
      serverTime: Date.now()
    };

    for (const [connectionId] of this.connections) {
      this.sendToConnection(connectionId, heartbeatMessage);
    }
  }

  cleanupStaleConnections() {
    const staleThreshold = Date.now() - (this.heartbeatInterval * 3); // 3 missed heartbeats
    
    for (const [connectionId, connection] of this.connections) {
      if (connection.lastSeen < staleThreshold) {
        this.cleanupConnection(connectionId);
      }
    }
  }

  cleanupConnection(connectionId) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    // Remove from all rooms
    for (const [roomId, room] of this.rooms) {
      if (room.has(connectionId)) {
        this.leaveRoom(connectionId, roomId);
      }
    }

    // Remove connection
    this.connections.delete(connectionId);
    
    // Keep message queue for potential reconnection
    setTimeout(() => {
      this.messageQueue.delete(connectionId);
    }, 3600000); // 1 hour
  }

  generateConnectionId() {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateSubscriptionId() {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public API Methods

  /**
   * Emit an event to be handled by the WebSocket system
   * @param {string} eventType - Type of event
   * @param {Object} data - Event data
   */
  emit(eventType, data) {
    const handler = this.eventHandlers[eventType];
    if (handler) {
      handler(data);
    } else {
      console.warn(`No handler for event type: ${eventType}`);
    }
  }

  /**
   * Listen for messages on a connection (client-side)
   * @param {string} connectionId - Connection to listen on
   * @param {Function} callback - Message handler
   * @returns {Function} Unsubscribe function
   */
  onMessage(connectionId, callback) {
    const handler = (event) => {
      if (event.detail.connectionId === connectionId) {
        callback(event.detail.message);
      }
    };

    this.messageEventTarget.addEventListener('message', handler);
    
    return () => {
      this.messageEventTarget.removeEventListener('message', handler);
    };
  }

  /**
   * Get connection statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      totalConnections: this.connections.size,
      activeRooms: this.rooms.size,
      queuedMessages: Array.from(this.messageQueue.values())
        .reduce((sum, queue) => sum + queue.length, 0),
      roomStats: Object.fromEntries(
        Array.from(this.rooms.entries()).map(([roomId, connections]) => [
          roomId, 
          connections.size
        ])
      )
    };
  }

  /**
   * Handle connection reconnection
   * @param {string} oldConnectionId - Previous connection ID
   * @param {Object} options - Reconnection options
   * @returns {Object} New connection info
   */
  reconnect(oldConnectionId, options = {}) {
    const oldConnection = this.connections.get(oldConnectionId);
    if (oldConnection) {
      // Transfer subscriptions to new connection
      const newConnection = this.createConnection({
        ...options,
        clientId: oldConnection.clientId
      });
      
      // Restore subscriptions
      for (const subscription of oldConnection.subscriptions) {
        this.subscribe(newConnection.connectionId, subscription);
      }
      
      // Send queued messages
      this.sendQueuedMessages(newConnection.connectionId);
      
      // Cleanup old connection
      this.cleanupConnection(oldConnectionId);
      
      return newConnection;
    } else {
      return this.createConnection(options);
    }
  }
}

// Integration with enhanced evaluation system
if (typeof window !== 'undefined' && window.enhancedEvals) {
  const wsManager = new ChaosWebSocketManager();
  
  // Integrate with enhanced evaluation system
  window.chaosWebSocket = wsManager;
  
  // Hook into evaluation events
  const originalStreamEvalResults = window.enhancedEvals.streamEvalResults;
  window.enhancedEvals.streamEvalResults = async function* (...args) {
    const stream = originalStreamEvalResults.apply(this, args);
    
    for await (const event of stream) {
      // Broadcast to WebSocket clients
      switch (event.type) {
        case 'start':
          wsManager.emit('evaluation.start', {
            runId: event.streamId,
            suite: event.suite,
            totalCases: event.totalCases,
            suiteId: event.suite // Assuming suite name as ID for now
          });
          break;
        case 'progress':
          wsManager.emit('evaluation.progress', {
            runId: event.streamId,
            progress: event.overallProgress,
            currentCase: event.caseIndex,
            completedCases: event.caseIndex,
            totalCases: event.totalCases || 1
          });
          break;
        case 'complete':
          wsManager.emit('evaluation.complete', {
            runId: event.streamId,
            results: event.results,
            duration: event.duration,
            overallScore: event.results.overall_score,
            passedGate: event.results.passed_gate,
            suiteId: event.results.suite
          });
          break;
        case 'error':
          wsManager.emit('evaluation.error', {
            runId: event.streamId,
            error: event.error,
            context: { timestamp: event.timestamp }
          });
          break;
      }
      
      yield event;
    }
  };
  
  console.log('WebSocket integration enabled');
}

// Export for Node.js environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ChaosWebSocketManager;
}