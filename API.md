# API Reference - Resonance Logs

This document outlines the API for the Resonance Logs platform, a service for uploading, parsing, and analyzing game combat logs, similar to FFLogs.

## Architecture Overview

The system consists of three main parts:
1.  **Desktop Client (Resonance Meter)**: The application that captures combat logs and uploads them to the backend.
2.  **Backend API (Go)**: A Go-based API server that handles log uploads, processing, and data retrieval.
3.  **Frontend (Next.js)**: A web application for viewing reports, fights, and rankings.

### Log Processing Flow

1.  **Upload**: The desktop client uploads a raw log file to a dedicated endpoint. The API accepts the log, assigns it a unique `reportId`, and places it in a processing queue (e.g., RabbitMQ, Redis Stream).
2.  **Processing**: A background worker consumes from the queue, parses the log file, and transforms the data into a structured format.
3.  **Storage**: The parsed data (fights, players, events, stats) is stored in a database (e.g., PostgreSQL) for efficient querying.
4.  **Retrieval**: The frontend application uses the API to query for reports, fights, and player data.

## API Endpoints

All endpoints are prefixed with `/api/v1`.

### Reports

#### `POST /reports`

Upload a new combat log. The request should be `multipart/form-data`.

-   **Body**:
    -   `log`: The raw log file.
-   **Headers**:
    -   `X-API-Key`: The user's API key for authentication.
-   **Success Response (`202 Accepted`)**:
    -   Indicates the log has been accepted for processing.
    -   The response body contains the report ID and a URL to check the processing status.

    ```json
    {
      "reportId": "aB3fG7kL9pQ",
      "statusUrl": "/api/v1/reports/aB3fG7kL9pQ/status"
    }
    ```

#### `GET /reports/{reportId}`

Retrieve the metadata for a specific report once it has been processed.

-   **Parameters**:
    -   `reportId` (string): The unique ID of the report.
-   **Success Response (`200 OK`)**:

    ```json
    {
      "reportId": "aB3fG7kL9pQ",
      "title": "Example Raid - 2025-11-02",
      "owner": "PlayerName",
      "startTime": "2025-11-02T20:00:00Z",
      "endTime": "2025-11-02T21:00:00Z",
      "fights": [
        {
          "id": 1,
          "name": "Boss 1",
          "startTime": "2025-11-02T20:05:00Z",
          "endTime": "2025-11-02T20:10:00Z",
          "duration": 300000,
          "boss": true,
          "kill": true
        }
      ]
    }
    ```

#### `GET /reports/{reportId}/status`

Check the processing status of a report.

-   **Parameters**:
    -   `reportId` (string): The unique ID of the report.
-   **Success Response (`200 OK`)**:

    ```json
    {
      "status": "processing", // or "completed", "failed"
      "progress": 50, // percentage
      "message": "Parsing fight 5 of 10"
    }
    ```

### Fights

#### `GET /reports/{reportId}/fights/{fightId}`

Retrieve detailed information for a specific fight within a report.

-   **Parameters**:
    -   `reportId` (string): The unique ID of the report.
    -   `fightId` (integer): The ID of the fight within the report.
-   **Success Response (`200 OK`)**:

    ```json
    {
      "id": 1,
      "name": "Boss 1",
      "duration": 300000,
      "players": [
        {
          "id": 101,
          "name": "Player 1",
          "class": "Warrior",
          "damage": {
            "total": 500000,
            "dps": 1666.67
          },
          "healing": {
            "total": 50000,
            "hps": 166.67
          }
        }
      ]
    }
    ```

### Characters

#### `GET /characters/{characterName}/{server}`

Retrieve information and recent reports for a specific character.

-   **Parameters**:
    -   `characterName` (string): The name of the character.
    -   `server` (string): The server/realm of the character.
-   **Success Response (`200 OK`)**:

    ```json
    {
      "name": "Player 1",
      "server": "ServerName",
      "class": "Warrior",
      "recent_reports": [
        {
          "reportId": "aB3fG7kL9pQ",
          "title": "Example Raid",
          "date": "2025-11-02"
        }
      ]
    }
    ```

## Data Models

### Report

-   `reportId`: string (unique)
-   `title`: string
-   `owner`: string (user who uploaded)
-   `startTime`: datetime
-   `endTime`: datetime
-   `fights`: array of FightSummary

### Fight

-   `id`: integer
-   `name`: string
-   `duration`: integer (ms)
-   `players`: array of PlayerPerformance
-   `events`: array of CombatEvent (for detailed replay)

### PlayerPerformance

-   `id`: integer
-   `name`: string
-   `class`: string
-   `damage`: object { total, dps, skills: [...] }
-   `healing`: object { total, hps, skills: [...] }
-   `buffs`: array of BuffUptime

### CombatEvent

-   `timestamp`: integer (ms from fight start)
-   `source`: string (player/enemy ID)
-   `target`: string (player/enemy ID)
-   `ability`: string (skill ID)
-   `type`: string ('damage', 'heal', 'buff', 'debuff')
-   `amount`: integer

## Authentication

-   All upload requests must be authenticated using an `X-API-Key` header.
-   API keys can be generated by users from their profile page on the website.
-   Read requests (`GET`) are generally public, unless a report is marked as private by the owner.
