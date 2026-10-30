# Private plant photos

Plant photos are stored separately from public catalogue media. Uploading, replacing and removing a photo requires ownership. Each display-image and thumbnail GET/HEAD request authenticates the caller and checks current plant visibility, including accepted contacts, sharing expiry and revocation. Photo URLs contain no access tokens. Responses use `Cache-Control: private, no-store` and `X-Content-Type-Options: nosniff`.

The server generates a display JPEG up to 1280 pixels on its longest edge and a thumbnail up to 320 pixels. It removes EXIF/GPS metadata, normalizes orientation and discards the original upload. Stored variants are bounded to 300 KiB and 40 KiB. Uploads are limited to 5 MiB and processing is bounded in a separate process. JPEG and PNG input are supported; the mobile picker requests compatible JPEG output.

The backend keeps one current cover image per plant. A replacement commits its files and database reference before the previous image's files are removed. Database deletion creates a durable cleanup receipt; failed filesystem cleanup is retried. A periodic sweep catches old directories left by interrupted uploads. Removing a plant or account also schedules its image files for deletion. Journal attachments are not implemented.

Older photos saved only on an owner's phone are not uploaded automatically. The image editor offers an explicit upload choice. If an older full-resolution file exceeds the upload or pixel limit, choosing the image again from the gallery lets the picker resize it before upload. A failed wizard upload retains the source and retries against the already-created plant rather than creating a second plant.

## Photo framing API

Photo metadata includes `framing: {focal_x, focal_y, zoom}` and `framing_revision`. The focal coordinates are finite numbers between 0 and 1 in the stored, orientation-normalized image; `(0.5, 0.5)` is its center. Zoom ranges from 1 to 4. The mobile views use one common framing canvas, with the wide plant tile showing its middle band. The server retains both complete resized variants so the owner can adjust the framing later without uploading the image again.

All following operations require the plant owner and use `/plant-instances/<plant_id>/photo/`:

- `GET` returns `{"framing_supported": true}`, including before the first photo upload. This read-only capability check does not consume the photo-write throttle. New clients check it before uploading a framed image; an older backend returning 405 must not receive that replacement upload.
- `PUT` accepts optional multipart `framing` containing a JSON object alongside `photo`, `upload_key` and `expected_photo_id`. An omitted framing uses centered coordinates and zoom 1, preserving compatibility with older clients.
- `PATCH` accepts JSON containing `framing`, the current UUID in `expected_photo_id`, and `expected_framing_revision`. It returns updated photo metadata. Reframing keeps the photo UUID, URLs and stored bytes unchanged; only coordinates, the framing revision and the plant update timestamp change.
- `PUT` and `DELETE` also accept optional `expected_framing_revision` to guard against changes since the editor opened. Stale edits return `photo_conflict` (409); invalid coordinates return `invalid_photo` (400). An exact PATCH retry acknowledges an already-saved framing without incrementing the revision again.

Deploy migration `plant_instances.0007_plantimage_framing` before enabling framing saves in a new mobile build. Existing photo rows receive centered defaults and revision 0 without modifying their files. Framing is returned with owner and shared-plant metadata; recipients cannot change it. The existing deployment pipeline runs migrations before starting the new backend services.

## Deployment and persistent storage

The deployment script automatically creates `/opt/app/docker-compose.private-media.json`. This non-secret Compose overlay mounts the project-scoped `<project>_private_media` Docker volume at `/app/private-media` in the backend application services. It remains on the VPS after the temporary image-pinning overlay is removed, so subsequent deployments reuse the same files. It is not mounted into Caddy or Traefik and must never be exposed through a public `/media/` file-server mapping.

Use the same overlay for manual service recreation and recovery:

```sh
cd /opt/app
docker compose -f docker-compose.prod.yml -f docker-compose.private-media.json up -d
```

Production upload handling requires the private storage path to be a mounted filesystem. This prevents uploads from silently being saved into an ephemeral container layer if a manual restart omits the overlay. Local development may disable the mount requirement; the checked-in development Compose stack already mounts a private volume.

The production environment example lists configurable upload, per-account, global and minimum-free-space limits. Defaults reserve a 100 MiB photo allowance per account, a 2 GiB global photo allowance and at least 1 GiB free on the storage filesystem. Adjust these after checking the VPS's actual available space; Docker images, the database and operating-system data need separate room.

The Caddy example limits photo endpoint request bodies to 6 MB, allowing multipart overhead around the server's 5 MiB file limit. Merge that matcher into the existing live site configuration, validate it with `caddy validate`, and reload Caddy. For Traefik, apply an equivalent request-body limit to the photo route using its buffering middleware. Backend streaming upload limits remain enforced independently.

## Backups and recovery

Back up PostgreSQL and the private Docker volume to an encrypted off-server destination. A database-only backup cannot recover the photo bytes. Preserve the existing public catalogue-media backup separately. Coordinate database and media snapshots so current image records and their files can be restored together, then test a restore before treating the backup as reliable.

Backups have their own retention: removing a photo from the live application does not instantly remove it from older retained backups. The media volume is application data and must be excluded from image/volume pruning. The backend deployment's image cleanup already leaves data volumes untouched.

Private mobile images use a bounded memory cache scoped to the authentication session. Logout clears it; foregrounding and periodic authenticated HEAD requests recheck access. Cached bytes do not grant server access, and a former recipient's saved screenshots or exported copies cannot be remotely recalled.
