# Wings API Documentation

Welcome to the comprehensive Wings API documentation. This documentation is organized into multiple files for better navigation and reference.

## 📚 Documentation Index

### Core Documentation
- **[Authentication & Setup](authentication.md)** - Authentication methods, tokens, and initial setup
- **[Error Handling](error-handling.md)** - Complete error codes, responses, and troubleshooting
- **[Rate Limiting & Security](security.md)** - Rate limiting, security considerations, and best practices

### API Endpoints

#### System Management
- **[System Endpoints](system-endpoints.md)** - System information, utilization, Docker management
- **[Configuration Management](configuration.md)** - Dynamic configuration updates and settings

#### Server Management
- **[Server Operations](server-operations.md)** - Server lifecycle, power management, logs
- **[Server Management](server-management.md)** - Server creation, deletion, and listing

#### File System
- **[File Management](file-management.md)** - File operations, directory management, search
- **[File Upload/Download](file-transfer.md)** - File upload, download, and transfer operations

#### Backup & Recovery
- **[Backup Management](backup-management.md)** - Backup creation, restoration, and management

#### Transfer Operations
- **[Server Transfers](server-transfers.md)** - Inter-node server transfers and migration

#### Real-time Communication
- **[WebSocket API](websocket-api.md)** - Real-time console access and server control

### Advanced Topics
- **[Token System](token-system.md)** - JWT tokens, authentication, and security
- **[Middleware System](middleware.md)** - Request processing and validation
- **[Downloader System](downloader.md)** - Remote file downloading capabilities

## 🚀 Quick Start

1. **Read [Authentication & Setup](authentication.md)** to understand how to authenticate with the API
2. **Review [Error Handling](error-handling.md)** to understand response codes and error messages
3. **Choose your endpoint category** from the list above
4. **Use the examples** provided in each documentation file

## 📋 API Overview

The Wings API is a RESTful API that provides comprehensive control over game servers and system resources. All endpoints require authentication using Bearer tokens.

### Base URL
```
http://YOUR_SERVER:8080
```

### Authentication
All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer YOUR_AUTH_TOKEN
```

### Response Format
All API responses are in JSON format and include:
- Request ID for debugging (`X-Request-Id` header)
- Standard HTTP status codes
- Detailed error messages when applicable

## 🔧 Development

### Testing Endpoints
Use the provided curl examples in each documentation file to test endpoints.

### Common Headers
```bash
-H "Authorization: Bearer YOUR_AUTH_TOKEN"
-H "Content-Type: application/json"
```

### Request ID Tracking
All responses include an `X-Request-Id` header for debugging:
```
X-Request-Id: 550e8400-e29b-41d4-a716-446655440000
```

## 📖 Additional Resources

- **Error Codes**: See [Error Handling](error-handling.md) for complete error reference
- **Rate Limits**: See [Security](security.md) for rate limiting information
- **WebSocket Events**: See [WebSocket API](websocket-api.md) for real-time events

## 🤝 Contributing

When adding new endpoints or modifying existing ones, please update the corresponding documentation files to maintain consistency.

---

**Last Updated**: 30 Juni
**API Version**: Pelican's ()