# Appwrite SDK Setup Guide

This document describes the migration from direct MariaDB/GORM to Appwrite Go SDK.

## ✅ Completed Changes

### 1. Dependencies
- **Removed**: `gorm.io/driver/mysql` and `gorm.io/gorm`
- **Added**: `github.com/appwrite/sdk-for-go v0.13.1`

### 2. Database Package
- **Created**: `server/database/appwrite.go` - Appwrite client wrapper
- **Updated**: `server/database/database.go` - Exported `GetEnv()` function
- **Kept**: Old GORM code for reference (can be removed later)

### 3. Main Application
- **Updated**: `server/main.go` to use Appwrite client instead of GORM
- **Removed**: Database migrations (Appwrite manages schema through dashboard)

## 🔧 Configuration

### Environment Variables

Update your `.env` file with Appwrite credentials:

```env
# Appwrite API Configuration
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your-project-id
APPWRITE_API_KEY=your-api-key
APPWRITE_DATABASE_ID=your-database-id

# Collection IDs
APPWRITE_COLLECTION_REPORTS=reports
APPWRITE_COLLECTION_FIGHTS=fights
APPWRITE_COLLECTION_PLAYERS=player_performances
APPWRITE_COLLECTION_STATUS=statuses
```

### Getting Appwrite Credentials

1. **Create Appwrite Project**
   - Go to [Appwrite Cloud](https://cloud.appwrite.io) or your self-hosted instance
   - Create a new project
   - Copy the **Project ID**

2. **Generate API Key**
   - Navigate to **Settings** → **API Keys**
   - Create a new API key with **Server** scope
   - Grant permissions for:
     - `databases.read`
     - `databases.write`
     - `collections.read`
     - `collections.write`
     - `documents.read`
     - `documents.write`
   - Copy the **API Key**

3. **Create Database**
   - Go to **Databases** section
   - Click **Create Database**
   - Name it (e.g., "logs" or "resonance")
   - Copy the **Database ID**

4. **Create Collections**
   You need to create 4 collections with the following schemas:

#### Collection: `reports`
```
Attributes:
- reportId (string, 255, required, unique)
- title (string, 500)
- owner (string, 255)
- startTime (datetime)
- endTime (datetime)
```

#### Collection: `fights`
```
Attributes:
- reportId (string, 255, required, indexed)
- fightId (integer, required)
- name (string, 255)
- startTime (datetime)
- endTime (datetime)
- duration (integer)
- boss (boolean, default: false)
- kill (boolean, default: false)

Relationships:
- Many-to-One with reports (reportId → reports.reportId)
```

#### Collection: `player_performances`
```
Attributes:
- fightId (string, 255, required, indexed)
- playerId (integer, required)
- name (string, 255)
- class (string, 100)
- damageTotal (integer, default: 0)
- damageDps (float, default: 0.0)
- healingTotal (integer, default: 0)
- healingHps (float, default: 0.0)

Relationships:
- Many-to-One with fights (fightId → fights.$id)
```

#### Collection: `statuses`
```
Attributes:
- reportId (string, 255, required, unique)
- status (string, 50, default: "processing")
- progress (integer, default: 0)
- message (string, text)

Relationships:
- One-to-One with reports (reportId → reports.reportId)
```

## 📝 Code Structure

### Appwrite Client (`server/database/appwrite.go`)

```go
// Global variables
var (
    Client     client.Client          // Appwrite client instance
    Databases  *databases.Databases   // Databases service
    DatabaseID string                 // Current database ID
    Collections CollectionIDs         // Collection ID mappings
)

// Initialize Appwrite
appwriteConfig := database.LoadAppwriteConfigFromEnv()
database.ConnectAppwrite(appwriteConfig)

// Access services
db := database.GetDatabases()
dbID := database.GetDatabaseID()
```

### Using Appwrite Databases Service

```go
import (
    "server/database"
    "github.com/appwrite/sdk-for-go/id"
)

// Create a document
doc, err := database.Databases.CreateDocument(
    database.DatabaseID,
    database.Collections.Reports,
    id.Unique(), // Auto-generate ID
    map[string]interface{}{
        "reportId": "r123",
        "title": "My Report",
        "owner": "user@example.com",
    },
)

// Get a document
doc, err := database.Databases.GetDocument(
    database.DatabaseID,
    database.Collections.Reports,
    documentId,
)

// List documents with query
docs, err := database.Databases.ListDocuments(
    database.DatabaseID,
    database.Collections.Reports,
    databases.WithListDocumentsQueries([]string{
        `equal("reportId", "r123")`,
    }),
)

// Update a document
doc, err := database.Databases.UpdateDocument(
    database.DatabaseID,
    database.Collections.Reports,
    documentId,
    map[string]interface{}{
        "title": "Updated Title",
    },
)

// Delete a document
err := database.Databases.DeleteDocument(
    database.DatabaseID,
    database.Collections.Reports,
    documentId,
)
```

## 🚀 Next Steps

### 1. Update Models (`server/models/report.go`)
Remove GORM tags and update for Appwrite document structure:

```go
type Report struct {
    ID        string    `json:"$id,omitempty"`
    ReportID  string    `json:"reportId"`
    Title     string    `json:"title"`
    Owner     string    `json:"owner"`
    StartTime time.Time `json:"startTime,omitempty"`
    EndTime   time.Time `json:"endTime,omitempty"`
    CreatedAt time.Time `json:"$createdAt,omitempty"`
    UpdatedAt time.Time `json:"$updatedAt,omitempty"`
}
```

### 2. Create Repository Layer
Create `server/repository/` with Appwrite CRUD operations:

```go
// server/repository/reports.go
package repository

import (
    "server/database"
    "server/models"
    "github.com/appwrite/sdk-for-go/id"
)

func CreateReport(report *models.Report) (*models.Report, error) {
    doc, err := database.Databases.CreateDocument(
        database.DatabaseID,
        database.Collections.Reports,
        id.Unique(),
        report,
    )
    if err != nil {
        return nil, err
    }

    // Convert doc to Report struct
    // ...
    return report, nil
}

func GetReport(reportId string) (*models.Report, error) {
    // Implementation
}

func ListReports() ([]models.Report, error) {
    // Implementation
}
```

### 3. Update Controllers
Replace in-memory store with repository calls:

```go
// server/controller/reports/reports.go
import "server/repository"

func UploadReport(c *gin.Context) {
    // ... file handling ...

    report := &models.Report{
        ReportID: id,
        Title:    title,
        Owner:    owner,
    }

    // Save to Appwrite
    savedReport, err := repository.CreateReport(report)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    c.JSON(http.StatusAccepted, savedReport)
}
```

### 4. Remove Old Code
Once migration is complete:
- Remove `server/database/database.go` (GORM code)
- Remove `server/models/store.go` (in-memory store)
- Update `go.mod` to remove unused GORM dependencies

## 🔍 Testing

### 1. Start the Server
```bash
cd server
go run .
```

Expected output:
```
Connected to Appwrite successfully
Database ID: your-database-id
Collections: Reports=reports, Fights=fights, Players=player_performances, Status=statuses
[GIN-debug] Listening and serving HTTP on localhost:8080
```

### 2. Test Endpoints
```bash
# Health check
curl http://localhost:8080/ping

# API test
curl http://localhost:8080/api/v1/test
```

### 3. Test Document Creation
```bash
curl -X POST http://localhost:8080/api/v1/reports/upload \
  -F "log=@test.log" \
  -F "title=Test Report" \
  -F "owner=test@example.com"
```

## 🐛 Troubleshooting

### "APPWRITE_PROJECT_ID is required"
- Ensure `.env` file exists in parent directory
- Check all Appwrite environment variables are set

### "Failed to connect to Appwrite"
- Verify API endpoint is correct
- Check API key has proper permissions
- Ensure project ID matches your Appwrite project

### "Collection not found"
- Verify collection IDs in `.env` match Appwrite dashboard
- Ensure collections are created in the specified database

### "Permission denied"
- Check API key permissions include database and document operations
- Verify collection permissions allow server-side access

## 📚 Resources

- [Appwrite Documentation](https://appwrite.io/docs)
- [Appwrite Go SDK](https://github.com/appwrite/sdk-for-go)
- [Appwrite Databases](https://appwrite.io/docs/products/databases)
- [Appwrite Collections](https://appwrite.io/docs/products/databases/collections)
- [Appwrite Queries](https://appwrite.io/docs/products/databases/queries)

## 🔄 Migration Checklist

- [x] Install Appwrite Go SDK
- [x] Create Appwrite client wrapper
- [x] Update main.go to use Appwrite
- [x] Configure environment variables
- [ ] Create Appwrite database and collections
- [ ] Update models for Appwrite documents
- [ ] Create repository layer
- [ ] Update controllers to use repositories
- [ ] Remove GORM code and in-memory store
- [ ] Test all endpoints
- [ ] Update API documentation
