# Bug Case: CARD-932 Avatar Save Latency Optimization

## Symptom
Saving a profile avatar upload took 1.5 to 5+ seconds to complete.

## Root Cause Analysis via OpenTelemetry / Jaeger
Tracing analysis (`service=ssl-be-local`, Trace ID `8da736ddb5bfeae48723516ec48b83ec`) revealed three primary bottlenecks:
1. **Missing MongoDB Indexes**: `mongoose.Follow.find` and `mongoose.Follow.countDocuments` executed 1,237ms COLLSCANs during profile queries because `follows` lacked `{ followId: 1, isDel: 1 }` and `{ userId: 1, isDel: 1 }` indexes.
2. **Uncompressed 3MB+ Image Exports**: Frontend `canvas.toBlob` exported cropped avatars at `0.98` JPEG quality, generating ~3MB payloads. This delayed Bunny Storage CDN upload and AWS Rekognition AI moderation network calls (`aiModerationCtr.moderateImage`).
3. **Redundant Database Mutations**: Clicking Save when only changing the avatar ran `UpdateUser` mutation and duplicate `refetchUser` / `refetchGalleries` queries.

## Resolution
1. **MongoDB Indexing**: Created indexes `{ followId: 1, isDel: 1 }`, `{ userId: 1, isDel: 1 }` on `follows` collection and `{ uploadedById: 1, isDel: 1 }` on `galleries` collection.
2. **Frontend Canvas Compression**: Updated `canvas.toBlob` in `image-upload-watermark.tsx` to export at `0.85` quality, reducing payload size by ~90% (3MB $\rightarrow$ ~180KB).
3. **Redundant Mutation Skipping**: Updated `handleSubmit` in `profile.tsx` to skip `UpdateUser` when no form fields changed, and deduplicated `refetchGalleries` in `profile-header.tsx`.
