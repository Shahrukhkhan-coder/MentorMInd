# MentorMind Security Specification (Phase 3: Community Hub)

## Data Invariants
1. **PII Isolation**: `/users/{userId}` remains strictly readable by `isOwner(userId)` or `isAdmin()`. Community posts and comments store only `authorName` and `authorRole` (no emails).
2. **Community Post Integrity**:
   - Posts must have `authorId == request.auth.uid`, `status == 'published'`, `upvoterIds.size() == 0`, and `commentsCount == 0` on creation.
   - `allow list` restricts non-admins to `resource.data.status == 'published'` (hidden posts are only visible to Admins).
   - Non-author users may only update `upvoterIds` or `commentsCount` (cannot overwrite post title/content/status).
   - Only the post author or `isAdmin()` can edit post content or delete the post; only `isAdmin()` can change `status` to `'hidden'`.
3. **Community Comment Master Gate**:
   - Comments under `/community_posts/{postId}/comments/{commentId}` verify `exists()` and `status == 'published'` on the parent post during creation, and enforce `authorId == request.auth.uid` and `postId == postId`.
   - Only the comment author or `isAdmin()` can delete a comment.
4. **Community PDF Attachment Integrity**:
   - Files under `/community_files/{fileId}` must have `mimeType == 'application/pdf'`, `sizeBytes <= 3670016` (~3.5 MB), `chunkCount` between 1 and 8, and `uploaderId == request.auth.uid`.
   - Chunks under `/community_files/{fileId}/chunks/{chunkIndex}` verify the parent file exists and is owned by `request.auth.uid`.
   - Community posts linking an `attachmentFileId` must reference an existing `/community_files/{fileId}` owned by the post author.

## The "Dirty Dozen" Payloads (Phase 3 Additions)
1. **Author Spoofing**: User A creates a community post, comment, or PDF attachment with `authorId`/`uploaderId: userB`.
2. **Pre-Inflated Upvotes**: User creates a post with `upvoterIds: ['a', 'b', 'c']` or `commentsCount: 99`.
3. **Content Vandalism**: User B tries to modify `title` or `content` of User A's community post.
4. **Moderator Spoofing**: Non-admin user tries to set `status: 'hidden'` on another user's post.
5. **Hidden Post Scraping**: Non-admin user tries to list or get a post with `status: 'hidden'`.
6. **Orphaned Comment**: User tries to create a comment under a non-existent or hidden `postId`.
7. **Non-PDF / Oversized Upload**: User tries to upload an executable/HTML file (`mimeType: 'text/html'`) or a >3.5 MB file to `/community_files/{fileId}`.
8. **Foreign File Hijacking**: User A tries to link User B's `attachmentFileId` or inject chunks into User B's `/community_files/{fileId}`.
