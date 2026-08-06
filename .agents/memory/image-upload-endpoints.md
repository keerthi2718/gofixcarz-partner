---
name: Image upload endpoints
description: Which upload method to use for job photos vs garage logos
---

**Job photos** → `POST /jobs/upload-photo` (multipart/form-data)
- Field key: `photo`
- Response: `{ success: true, data: { url: "https://storage.gofixcarz.com/jobs/..." } }`
- The returned `url` is stored directly in the job's `photos[]` array
- Use `ImageService.uploadJobPhoto(fileUri)` → returns URL string
- This is the only documented photo upload endpoint in the Postman collection

**Garage logos** → 2-step pre-signed URL flow
- Step 1: `POST /images/upload-url` `{ file_name, content_type }` → `{ upload_url, object_key }`
- Step 2: PUT binary blob to `upload_url` (NO Authorization header — S3 rejects it)
- Step 3: `POST /garage/logo` `{ object_key }` → updated GarageResponse
- Use `ImageService.uploadToS3(fileUri, 'logo')` → returns object_key, then GarageService handles step 3

**Why the difference:** The Postman API contract documents `/jobs/upload-photo` but not
`/images/upload-url`. The pre-signed URL flow (`/images/upload-url`) may or may not exist
on the production API. For job photos, always use the documented multipart endpoint.

**Important:** `photos[]` in job create/update bodies stores URL strings (not object_keys).
S3 pre-signed PUT must ONLY send `Content-Type` header — never add Authorization or
Transfer-Encoding (causes 403 SignatureDoesNotMatch).
