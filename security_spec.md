# MentorMind Security Specification

## Data Invariants
1. Students can only read and write their own profile, lessons, and performance data.
2. Lessons cannot be modified by the student once created (except for status).
3. Quiz scores are set by the "system" (simulated by the frontend for this case, but ideally validated).
4. Users cannot modify their `userId` or `email` once set.

## The "Dirty Dozen" Payloads (Red Team Test Cases)

1. **Identity Theft**: User A tries to read User B's profile.
2. **Profile Spoofing**: User A tries to update User B's grade.
3. **Admin Privilege Escalation**: User A tries to set `isAdmin: true` on their profile.
4. **Lesson Poisoning**: User A tries to inject malicious scripts into a lesson content field.
5. **Score Injection**: User A tries to set their score to 100 on a quiz they haven't taken.
6. **Relational Break**: Creating a lesson referencing a subject that doesn't exist in their profile.
7. **Timestamp Tampering**: Setting `createdAt` to a future date.
8. **Bulk Data Scraping**: Authenticated user trying to list all users.
9. **Orphaned Writes**: Creating a progress report for a non-existent user.
10. **Immutable Field Write**: Attempting to change the `subject` of an existing lesson.
11. **Huge Payload**: Attempting to write a 2MB string into a concept name.
12. **Status Bypass**: Changing a lesson status from 'completed' back to 'pending'.

## Test Runner Plan
Using `firestore.rules.test.ts` to mock operations and verify denials.
