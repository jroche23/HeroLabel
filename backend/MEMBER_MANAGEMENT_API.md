# Organization Member Management API Documentation

## Overview
Complete backend system for organization member management with role-based permissions.

## Role Hierarchy

From highest to lowest permission level:
1. **OWNER** - Full access to everything
2. **ADMINISTRATOR** - Full access except organization management and usage/license management
3. **MANAGER** - Limited to assigned workspaces and own projects
4. **REVIEWER** - Can review and label tasks
5. **ANNOTATOR** - Can only label and view own/assigned tasks

## Role Permissions Matrix

| Permission | OWNER | ADMINISTRATOR | MANAGER | REVIEWER | ANNOTATOR |
|------------|-------|---------------|---------|----------|-----------|
| Manage Organization | ✓ | ✗ | ✗ | ✗ | ✗ |
| Manage All Workspaces | ✓ | ✓ | ✗ | ✗ | ✗ |
| Manage All Projects | ✓ | ✓ | ✗ | ✗ | ✗ |
| View Activity Log | ✓ | ✓ | ✗ | ✗ | ✗ |
| Manage Usage & License | ✓ | ✗ | ✗ | ✗ | ✗ |
| View Usage & License | ✓ | ✓ | ✗ | ✗ | ✗ |
| Manage Permissions | ✓ | ✓ | ✗ | ✗ | ✗ |
| Approve Invitations | ✓ | ✓ | ✗ | ✗ | ✗ |
| Manage Assigned Workspaces | ✓ | ✓ | ✓ | ✗ | ✗ |
| View All Projects | ✓ | ✓ | ✓ | ✗ | ✗ |
| Manage Own Projects | ✓ | ✓ | ✓ | ✗ | ✗ |
| Review Tasks | ✓ | ✓ | ✓ | ✓ | ✗ |
| Update Annotated Tasks | ✓ | ✓ | ✓ | ✓ | ✗ |
| Label Tasks | ✓ | ✓ | ✓ | ✓ | ✓ |
| View All Tasks | ✓ | ✓ | ✗ | ✗ | ✗ |
| View Assigned Tasks | ✓ | ✓ | ✓ | ✓ | ✓ |
| View Own Tasks | ✓ | ✓ | ✓ | ✓ | ✓ |

## API Endpoints

### Organization Management

#### Create Organization
```bash
POST /api/organizations
```

Creates a new organization with the authenticated user as the owner.

**Request Body:**
```json
{
  "name": "My Organization"
}
```

**Response:**
```json
{
  "data": {
    "id": "cmlcf3xru0000m2p8wc5p4hpr",
    "name": "My Organization",
    "createdAt": "2026-02-07T14:36:51.295Z",
    "updatedAt": "2026-02-07T14:36:51.295Z",
    "members": [
      {
        "id": "member-id",
        "organizationId": "cmlcf3xru0000m2p8wc5p4hpr",
        "userId": "user-id",
        "role": "OWNER",
        "status": "active",
        "createdAt": "2026-02-07T14:36:51.295Z",
        "updatedAt": "2026-02-07T14:36:51.295Z",
        "user": {
          "id": "user-id",
          "name": "John Doe",
          "email": "john@example.com",
          "image": null
        }
      }
    ]
  }
}
```

#### List User's Organizations
```bash
GET /api/organizations
```

Returns all organizations the authenticated user is a member of.

**Response:**
```json
{
  "data": [
    {
      "id": "org-id",
      "name": "My Organization",
      "createdAt": "2026-02-07T14:36:51.295Z",
      "updatedAt": "2026-02-07T14:36:51.295Z",
      "role": "OWNER",
      "memberSince": "2026-02-07T14:36:51.295Z"
    }
  ]
}
```

#### Get Organization Details
```bash
GET /api/organizations/:orgId
```

Returns organization details with all members.

**Response:**
```json
{
  "data": {
    "id": "org-id",
    "name": "My Organization",
    "createdAt": "2026-02-07T14:36:51.295Z",
    "updatedAt": "2026-02-07T14:36:51.295Z",
    "members": [
      {
        "id": "member-id",
        "organizationId": "org-id",
        "userId": "user-id",
        "role": "OWNER",
        "status": "active",
        "createdAt": "2026-02-07T14:36:51.295Z",
        "updatedAt": "2026-02-07T14:36:51.295Z",
        "user": {
          "id": "user-id",
          "name": "John Doe",
          "email": "john@example.com",
          "image": null
        }
      }
    ]
  }
}
```

### Member Management

#### List Organization Members
```bash
GET /api/organizations/:orgId/members
```

Returns all members of an organization. Requires membership in the organization.

**Response:**
```json
{
  "data": [
    {
      "id": "member-id",
      "organizationId": "org-id",
      "userId": "user-id",
      "role": "OWNER",
      "status": "active",
      "createdAt": "2026-02-07T14:36:51.295Z",
      "updatedAt": "2026-02-07T14:36:51.295Z",
      "user": {
        "id": "user-id",
        "name": "John Doe",
        "email": "john@example.com",
        "image": null
      }
    }
  ]
}
```

#### Invite Member
```bash
POST /api/organizations/:orgId/members/invite
```

Sends an invitation to join the organization. Requires `approveInvitations` permission (OWNER or ADMINISTRATOR).

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "role": "MANAGER"
}
```

**Response:**
```json
{
  "data": {
    "id": "invitation-id",
    "organizationId": "org-id",
    "email": "newuser@example.com",
    "role": "MANAGER",
    "invitedBy": "inviter-user-id",
    "status": "pending",
    "token": "invitation-token",
    "expiresAt": "2026-02-14T14:36:51.295Z",
    "createdAt": "2026-02-07T14:36:51.295Z",
    "inviter": {
      "id": "inviter-user-id",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "organization": {
      "id": "org-id",
      "name": "My Organization"
    }
  }
}
```

**Permission Rules:**
- Only OWNER and ADMINISTRATOR can invite members
- Cannot invite roles higher than own role
- Cannot invite if user is already a member
- Cannot create duplicate pending invitations

#### Update Member Role
```bash
PUT /api/organizations/:orgId/members/:memberId
```

Updates a member's role. Requires `managePermissions` permission (OWNER or ADMINISTRATOR).

**Request Body:**
```json
{
  "role": "ADMINISTRATOR"
}
```

**Response:**
```json
{
  "data": {
    "id": "member-id",
    "organizationId": "org-id",
    "userId": "user-id",
    "role": "ADMINISTRATOR",
    "status": "active",
    "createdAt": "2026-02-07T14:36:51.295Z",
    "updatedAt": "2026-02-07T14:36:51.295Z",
    "user": {
      "id": "user-id",
      "name": "Jane Smith",
      "email": "jane@example.com",
      "image": null
    }
  }
}
```

**Permission Rules:**
- Only OWNER and ADMINISTRATOR can update roles
- Cannot update roles higher than own role
- Cannot update own role
- Can only promote/demote to roles at or below own level

#### Remove Member
```bash
DELETE /api/organizations/:orgId/members/:memberId
```

Removes a member from the organization. Requires `managePermissions` permission (OWNER or ADMINISTRATOR).

**Response:** `204 No Content`

**Permission Rules:**
- Only OWNER and ADMINISTRATOR can remove members
- Can only remove members with lower role (not equal)
- Cannot remove self
- Cannot remove the last owner

### Invitation Management

#### Get Pending Invitations
```bash
GET /api/invitations/pending
```

Returns all pending invitations for the authenticated user's email.

**Response:**
```json
{
  "data": [
    {
      "id": "invitation-id",
      "organizationId": "org-id",
      "email": "user@example.com",
      "role": "MANAGER",
      "invitedBy": "inviter-user-id",
      "status": "pending",
      "token": "invitation-token",
      "expiresAt": "2026-02-14T14:36:51.295Z",
      "createdAt": "2026-02-07T14:36:51.295Z",
      "organization": {
        "id": "org-id",
        "name": "My Organization"
      },
      "inviter": {
        "id": "inviter-user-id",
        "name": "John Doe",
        "email": "john@example.com"
      }
    }
  ]
}
```

#### Accept Invitation
```bash
POST /api/invitations/:token/accept
```

Accepts an invitation to join an organization.

**Response:**
```json
{
  "data": {
    "id": "member-id",
    "organizationId": "org-id",
    "userId": "user-id",
    "role": "MANAGER",
    "status": "active",
    "createdAt": "2026-02-07T14:36:51.295Z",
    "updatedAt": "2026-02-07T14:36:51.295Z",
    "user": {
      "id": "user-id",
      "name": "Jane Smith",
      "email": "jane@example.com",
      "image": null
    },
    "organization": {
      "id": "org-id",
      "name": "My Organization",
      "createdAt": "2026-02-07T14:36:51.295Z",
      "updatedAt": "2026-02-07T14:36:51.295Z"
    }
  }
}
```

**Validation:**
- Invitation must match user's email
- Invitation must be in "pending" status
- Invitation must not be expired
- User must not already be a member

#### List Organization Invitations
```bash
GET /api/organizations/:orgId/invitations
```

Returns all pending invitations for an organization. Requires `approveInvitations` permission.

**Response:**
```json
{
  "data": [
    {
      "id": "invitation-id",
      "organizationId": "org-id",
      "email": "newuser@example.com",
      "role": "MANAGER",
      "invitedBy": "inviter-user-id",
      "status": "pending",
      "token": "invitation-token",
      "expiresAt": "2026-02-14T14:36:51.295Z",
      "createdAt": "2026-02-07T14:36:51.295Z",
      "inviter": {
        "id": "inviter-user-id",
        "name": "John Doe",
        "email": "john@example.com"
      }
    }
  ]
}
```

## Error Responses

All error responses follow this format:

```json
{
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE"
  }
}
```

Common error codes:
- `UNAUTHORIZED` (401) - Not authenticated
- `FORBIDDEN` (403) - Insufficient permissions
- `NOT_FOUND` (404) - Resource not found
- `CONFLICT` (409) - Resource already exists or conflict
- `GONE` (410) - Resource expired

## Authentication

All endpoints require authentication via Better Auth. Include session cookies in requests.

## Testing with cURL

Note: To test with cURL, you need a valid session token from Better Auth. The system uses cookie-based authentication.

Example with session cookie:
```bash
curl -X POST "$BACKEND_URL/api/organizations" \
  -H "Content-Type: application/json" \
  -H "Cookie: better-auth.session_token=YOUR_SESSION_TOKEN" \
  -d '{"name":"My Organization"}'
```

## Database Schema

### Organization
- `id`: String (CUID)
- `name`: String
- `createdAt`: DateTime
- `updatedAt`: DateTime

### OrganizationMember
- `id`: String (CUID)
- `organizationId`: String
- `userId`: String
- `role`: Enum (OWNER, ADMINISTRATOR, MANAGER, REVIEWER, ANNOTATOR)
- `status`: String (active, inactive)
- `createdAt`: DateTime
- `updatedAt`: DateTime
- Unique constraint: `[organizationId, userId]`

### MemberInvitation
- `id`: String (CUID)
- `organizationId`: String
- `email`: String
- `role`: Enum (OWNER, ADMINISTRATOR, MANAGER, REVIEWER, ANNOTATOR)
- `invitedBy`: String (userId)
- `status`: String (pending, accepted, expired)
- `token`: String (unique, for accepting invitation)
- `expiresAt`: DateTime
- `createdAt`: DateTime

## Implementation Files

- **Schema**: `/backend/prisma/schema.prisma`
- **Type Definitions**: `/backend/src/types.ts`
- **Permission Utils**: `/backend/src/utils/permissions.ts`
- **API Routes**: `/backend/src/routes/members.ts`
- **Mount Point**: `/backend/src/index.ts`
