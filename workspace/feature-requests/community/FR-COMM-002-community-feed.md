---
id: FR-COMM-002
title: "Community feed: posts (text, image, emoji), comments, emoji reactions, media moderation, delete"
module: COMM
priority: MUST
status: ready_to_implement
verify: T
phase: R2
milestone: "Release 2 - Communities MVP"
slice: 2
owner: Stephen Cheng
created: 2026-06-29
shipped: null
memory_chain_hash: null
related_frs: [FR-COMM-001, FR-COMM-003]
depends_on: [FR-COMM-001]
blocks: [FR-COMM-003, FR-COMM-004]
source_pages:
  - "docs/SSL_NewFeatures_Requirements_Questionnaire_L4 (Updated).docx#P1 Communities/Forum"
  - "docs/SSL_NewFeatures_BudgetScope_R1_L4.docx#Communities first version (MVP)"
source_decisions:
  - DEC-SSL-240 (membership gating: a user must be a paying member to create a community or to post/comment; everyone can join an open community unless it is private)
  - DEC-SSL-242 (posts auto-delete 12 months from creation; no GDPR retention duty applies)
  - DEC-SSL-244 (media limits reuse the platform's existing gallery limits)
language: typescript
service: "ssl-be + ssl-fe-user"
new_files:
  - ssl-be/src/modules/community/community-post.model.ts
  - ssl-be/src/modules/community/community-post-comment.model.ts
  - ssl-be/src/modules/community/community-post.controller.ts
  - ssl-be/src/modules/community/community-post.resolver.ts
  - ssl-be/src/modules/community/community-post.test.ts
  - ssl-fe-user/src/modules/community/community-feed.tsx
  - ssl-fe-user/src/modules/community/component/community-post.tsx
  - ssl-fe-user/src/modules/community/community-feed.test.tsx
modified_files:
  - ssl-fe-user/src/modules/community/community.hook.tsx
allowed_tools:
  - file_read: "ssl-be/src/**, ssl-fe-user/src/**"
  - file_write: "ssl-be/src/modules/community/**, ssl-fe-user/src/modules/community/**"
  - bash: cd ssl-be && pnpm vitest run community-post
disallowed_tools:
  - accept a post or comment from a non-paying member or a non-member of the community (per DEC-SSL-240)
  - display post media whose ModerationMedia status is not APPROVED (per DEC-SSL-244)
  - delete a post or comment as someone who is neither its author nor a community moderator (per DEC-SSL-240)
effort_hours: 30
sub_tasks:
  - "4.0h: community-post.model.ts + community-post-comment.model.ts - schemas (communityId, authorId, content, mediaIds, reactions, deletedAt, expiresAt TTL) + writer/community virtuals"
  - "6.0h: community-post.controller.ts - createPost/addComment (isPaidMember + member guard), addReaction toggle/dedupe, deletePost+deleteComment author-or-moderator soft-delete, listFeed (newest-first, deletedAt null)"
  - "4.0h: media pipeline - route post mediaIds through ModerationMedia (entity = community post) + aiModerationCtr; gate display on status APPROVED; reuse gallery limits"
  - "3.0h: community-post.resolver.ts - Query communityFeed + Mutation createPost/addComment/addReaction/deletePost/deleteComment, audit emits"
  - "4.0h: community-feed.tsx + community-post.tsx - LexicalEditor + UploadMedia composer, CommentSection, ButtonLike reactions, InfiniteScroll, APPROVED-only media"
  - "2.0h: community.hook.tsx - useCommunityFeed / useCreatePost / useAddReaction / useDeletePost wiring over the new resolver"
  - "5.0h: community-post.test.ts (Vitest) - gating, media-hidden-until-APPROVED, reaction toggle dedupe, author+moderator delete, 12-month TTL, feed order"
  - "2.0h: community-feed.test.tsx - composer paid+member swap and reaction toggle note"
risk_if_skipped: "The community feed is the heart of the Communities MVP (DEC-SSL-240/242/244, SOW03 R2): without it a community from FR-COMM-001 is an empty shell with no posts, comments, or reactions, so the MVP has nothing for members to do. Without a server-side post/comment gate a forged GraphQL mutation from a free or non-member account writes content the product says is paid-and-member only, breaking the membership upsell. Without routing post media through ModerationMedia + AI moderation, unreviewed images appear in the feed on an adult platform, the exact failure the existing pipeline exists to prevent. Without the 12-month TTL the platform keeps post data past the agreed retention. This FR is the greenfield community post + comment + reaction store plus the feed UI that consumes FR-COMM-001's Community/CommunityMember."
---

## §1 - Description (BCP-14 normative)

The community feed **MUST** let members post text, images, and emoji into a community, comment and react, run all post media through the existing moderation pipeline, and support author-or-moderator delete, with every gate enforced on the server per DEC-SSL-240/242/244. The contract:

1. Creating a post or a comment **MUST** be restricted to users who are both a paying member, gated by `authnCtr.isPaidMember(context)`, and a member of the target community (a `CommunityMember` row from FR-COMM-001); a free user, a logged-out user, or a paid non-member **MUST** be rejected, and this check **MUST** run on the server in the controller, not only in the UI (DEC-SSL-240).
2. A post **MUST** be able to carry text, images, and emoji together in one entry: `CommunityPost` holds `communityId`, `authorId`, `content` (the Lexical/text body, which can embed emoji), `mediaIds` (the moderated media references), `createdAt`, a soft-delete `deletedAt`, and an `expiresAt` retention stamp.
3. Every image attached to a post **MUST** be created as a `ModerationMedia` record (`entity` = the community-post upload entity, `entityId` = the post id, `status` defaulting to `PENDING`) and routed through the existing AI moderation queue (`aiModerationCtr.moderateImage`), and a post's media **MUST NOT** be displayed in the feed until its `ModerationMedia.status` is `APPROVED` (DEC-SSL-244).
4. Post media **MUST** reuse the platform's existing gallery media limits (the same per-file size and per-post count caps the gallery uploader enforces); the feature **MUST NOT** introduce its own divergent limits (DEC-SSL-244).
5. Commenting on a post **MUST** be supported via `CommunityPostComment` carrying `postId`, `authorId`, `content`, and a soft-delete `deletedAt`; comments inherit the same create gate as posts (§1 #1).
6. A post **MUST** support emoji reactions that toggle per user: a `(post, user, emoji)` triple is unique, adding a reaction the user already holds for that emoji removes it, and the same user **MUST NOT** be able to stack duplicate reactions of the same emoji on the same post (deduped per `(post, user, emoji)`).
7. A post or a comment **MUST** be deletable by its author or by a community moderator (a user whose id is in the community's `ownerIds` from FR-COMM-001); deletion **MUST** be a soft-delete that sets `deletedAt`, and an entry with a non-null `deletedAt` **MUST** be excluded from the feed (DEC-SSL-240).
8. A post **MUST** auto-delete 12 months from creation through a MongoDB TTL index on `expiresAt` (`expiresAt` set to `createdAt + 365 days`, `expireAfterSeconds: 0`); no GDPR retention duty applies and no extra retention machinery is required (DEC-SSL-242).
9. The feed **MUST** be served newest-first with pagination (`communityFeed(communityId, page, limit)` sorted by `createdAt` descending) and **MUST** hydrate, per post, the author profile, the reaction counts, and the comment count.
10. All gating, ownership, and visibility rules above **MUST** be enforced on the server in the controller and resolver; a forged client request that bypasses the UI **MUST** be rejected with a 403-class response (DEC-SSL-240).

---

## §2 - Why this design (rationale for humans)

**Why a first-class post + comment store instead of reusing conversation/message (§1 #2, #5)?** The platform's comment store (`message.model.ts`) is keyed on `conversationId`/`recipientId` and built for one-to-one and profile-comment threads. A community feed needs `communityId` scoping, per-post media references, per-post reaction aggregation, and a 12-month TTL. Modelling `CommunityPost` and `CommunityPostComment` explicitly makes those queryable and keeps the feed independent of the messaging tables. The soft-delete idiom (`deletedAt`) and the TTL idiom (`expiresAt` + `expireAfterSeconds`) are taken verbatim from `message.model.ts` so the conventions match the rest of the codebase.

**Why gate on both paid and membership, on the server (§1 #1, #10, DEC-SSL-240)?** DEC-SSL-240 says posting and commenting require a paying member, and the community gate from FR-COMM-001 says you must have joined. The composer-vs-CTA swap in the client is a courtesy, not a control: Apollo mutations are reachable directly, so a free or non-member account could call `createPost` while the UI hides the box. `authnCtr.isPaidMember(context)` already encodes the real paid rule (PAID/PROMO role plus an active membership window, falling back to free when expired), and a `CommunityMember` lookup encodes membership, so the resolver path reuses both as the one source of truth.

**Why route post media through ModerationMedia + AI moderation, hidden until APPROVED (§1 #3, DEC-SSL-244)?** This is an adult platform; unreviewed images cannot appear in a public-to-the-community feed. The existing pipeline (`ModerationMedia` with `status` PENDING/APPROVED/REJECTED and `aiModerationCtr.moderateImage`) is exactly the control already used for gallery and profile media. Creating a `ModerationMedia` row per attachment with `entity` set to the community-post entity and gating the feed render on `status === APPROVED` reuses that control rather than inventing a second moderation path.

**Why reuse the gallery limits (§1 #4, DEC-SSL-244)?** DEC-SSL-244 fixes media limits to the platform's existing gallery limits so a member sees one consistent rule across the product. The gallery uploader (`upload-media.tsx`) already enforces per-file size and a per-batch count cap; reusing those keeps the feed composer aligned and avoids a divergent limit the support team would have to explain.

**Why a per-user emoji toggle deduped per (post, user, emoji) (§1 #6)?** A reaction is a boolean per user per emoji, not a counter the user can inflate. Storing reactions deduped on `(post, user, emoji)` and toggling on repeat means a member reacting twice with the same emoji ends in the off state, the count reflects distinct users, and `ButtonLike`'s `isLiked`/`likeCount` map directly onto "did I react" and "how many reacted".

**Why author-or-moderator soft-delete (§1 #7, DEC-SSL-240)?** An author must be able to retract their own post or comment, and a community moderator (a `community.ownerIds` member) must be able to clean the feed. Soft-delete via `deletedAt` keeps the row for audit and possible recovery while removing it from every feed read, matching the `message.model.ts` deletion model.

**Why a TTL on expiresAt (§1 #8, DEC-SSL-242)?** DEC-SSL-242 fixes a 12-month post lifetime with no GDPR retention duty. A MongoDB TTL index on `expiresAt` makes expiry automatic and server-enforced, with no cron to maintain, exactly as `message.model.ts` already does for ephemeral messages.

---

## §3 - API contract

```typescript
// ssl-be/src/modules/community/community-post.model.ts
import { mongo } from '@cyberskill/shared/node/mongo';
import mongoose from 'mongoose';
import { E_ModerationMediaStatus } from '#modules/moderation/moderation-media/moderation-media.type.js';

// A reaction is one (userId, emoji) pair; unique per post (§1 #6)
const CommunityReactionSchema = mongo.createSchema({
    standalone: true,
    mongoose,
    schema: {
        userId: { type: String, required: true },
        emoji: { type: String, required: true },
    },
});

export const CommunityPostModel = mongo.createModel({
    mongoose,
    name: 'CommunityPost',
    schema: {
        communityId: { type: String, required: true },          // FR-COMM-001 Community.id
        authorId: { type: String, required: true },
        content: { type: String },                              // Lexical/text body, may embed emoji (§1 #2)
        mediaIds: { type: [String] },                           // ModerationMedia ids (§1 #3)
        statusMedia: { type: String, enum: Object.values(E_ModerationMediaStatus) },
        reactions: { type: [CommunityReactionSchema] },         // (§1 #6)
        deletedAt: { type: Date },                              // soft-delete (§1 #7), idiom from message.model.ts
        expiresAt: {                                            // 12-month TTL (§1 #8), idiom from message.model.ts
            type: Date,
            index: { expireAfterSeconds: 0, partialFilterExpression: { expiresAt: { $exists: true } } },
        },
    },
    virtuals: [
        { name: 'author', options: { ref: 'User', localField: 'authorId', foreignField: 'id', justOne: true } },
        { name: 'community', options: { ref: 'Community', localField: 'communityId', foreignField: 'id', justOne: true } },
    ],
});

CommunityPostModel.schema.index({ communityId: 1, createdAt: -1 }); // feed order (§1 #9)
```

```typescript
// ssl-be/src/modules/community/community-post-comment.model.ts (§1 #5)
export const CommunityPostCommentModel = mongo.createModel({
    mongoose,
    name: 'CommunityPostComment',
    schema: {
        postId: { type: String, required: true },
        authorId: { type: String, required: true },
        content: { type: String, required: true },
        deletedAt: { type: Date },                              // soft-delete (§1 #7)
    },
    virtuals: [
        { name: 'author', options: { ref: 'User', localField: 'authorId', foreignField: 'id', justOne: true } },
    ],
});
```

```typescript
// ssl-be/src/modules/community/community-post.controller.ts
const RETENTION_DAYS = 365; // DEC-SSL-242 (§1 #8)

export const communityPostCtr = {
    // §1 #1, #2, #3 - paid + member guard, then media moderation
    createPost: async (context, { communityId, content, mediaIds }) => {
        await assertPaidMemberOfCommunity(context, communityId);             // §1 #1, #10
        const author = await authnCtr.getUserFromSession(context);
        const expiresAt = date.getDate(RETENTION_DAYS * 24 * 60 * 60, 'sec'); // §1 #8
        const created = await CommunityPostModel.create({
            communityId, authorId: author.id, content, mediaIds,
            statusMedia: mediaIds?.length ? E_ModerationMediaStatus.PENDING : undefined,
            expiresAt,
        });
        if (mediaIds?.length) {
            await enqueuePostMediaModeration(context, created.id, mediaIds);  // §1 #3, ModerationMedia + aiModerationCtr
        }
        return { success: true, result: created };
    },

    addComment: async (context, { postId, content }) => {                    // §1 #5
        const post = await getLivePostOrThrow(postId);
        await assertPaidMemberOfCommunity(context, post.communityId);        // §1 #1, #10
        const author = await authnCtr.getUserFromSession(context);
        return { success: true, result: await CommunityPostCommentModel.create({ postId, authorId: author.id, content }) };
    },

    addReaction: async (context, { postId, emoji }) => {                     // §1 #6 toggle + dedupe
        const post = await getLivePostOrThrow(postId);
        await assertPaidMemberOfCommunity(context, post.communityId);
        const user = await authnCtr.getUserFromSession(context);
        const has = post.reactions?.some(r => r.userId === user.id && r.emoji === emoji);
        const update = has
            ? { $pull: { reactions: { userId: user.id, emoji } } }           // remove on repeat
            : { $addToSet: { reactions: { userId: user.id, emoji } } };      // add, deduped
        return { success: true, result: await CommunityPostModel.findOneAndUpdate({ id: postId }, update, { new: true }) };
    },

    deletePost: async (context, { postId }) => {                             // §1 #7 author-or-moderator soft-delete
        const post = await getLivePostOrThrow(postId);
        await assertAuthorOrModerator(context, post.communityId, post.authorId);
        return { success: true, result: await CommunityPostModel.findOneAndUpdate({ id: postId }, { deletedAt: new Date() }, { new: true }) };
    },

    deleteComment: async (context, { commentId }) => {                       // §1 #7
        const comment = await getLiveCommentOrThrow(commentId);
        const post = await getLivePostOrThrow(comment.postId);
        await assertAuthorOrModerator(context, post.communityId, comment.authorId);
        return { success: true, result: await CommunityPostCommentModel.findOneAndUpdate({ id: commentId }, { deletedAt: new Date() }, { new: true }) };
    },

    listFeed: async (context, { communityId, page = 1, limit = 10 }) => {    // §1 #9 newest-first, hydrate
        const res = await CommunityPostModel.paginate(
            { communityId, deletedAt: null },                                // exclude soft-deleted (§1 #7)
            { sort: { createdAt: -1 }, page, limit, populate: [{ path: 'author' }] },
        );
        // §1 #9 per-post hydration: reactionCount from the embedded reactions array (distinct users),
        // commentCount from a grouped count of live CommunityPostComment rows for the page's post ids.
        const ids = res.docs.map(p => p.id);
        const counts = await CommunityPostCommentModel.aggregate([
            { $match: { postId: { $in: ids }, deletedAt: null } },
            { $group: { _id: '$postId', n: { $sum: 1 } } },
        ]);
        const byPost = new Map(counts.map(c => [c._id, c.n]));
        res.docs = res.docs.map(p => ({ ...p, reactionCount: p.reactions?.length ?? 0, commentCount: byPost.get(p.id) ?? 0 }));
        return res;
    },
};
```

```graphql
# ssl-be/src/modules/community/community-post.resolver.ts (sketch)
type Query   { communityFeed(communityId: String!, page: Int, limit: Int): T_CommunityPostPage }
type Mutation {
    createPost(communityId: String!, content: String, mediaIds: [String!]): T_Return
    addComment(postId: String!, content: String!): T_Return
    addReaction(postId: String!, emoji: String!): T_Return
    deletePost(postId: String!): T_Return
    deleteComment(commentId: String!): T_Return
}
```

---

## §4 - Acceptance criteria

1. **Paid member of the community can post** - a paying member who has a `CommunityMember` row for the community calls `createPost` and the post is created and appears in `communityFeed`. (§1 #1) [verified by §5 `paid_member_can_post`]
2. **Free or non-member rejected server-side** - `createPost` and `addComment` from a free member, a logged-out caller, and a paid non-member each return a 403-class result and write nothing, with the gate failing in the controller even when the UI is bypassed. (§1 #1, #10) [verified by §5 `non_paid_or_non_member_rejected`]
3. **Text plus image plus emoji in one post** - a post created with `content` containing emoji and a non-empty `mediaIds` persists all three together and round-trips them on read. (§1 #2) [verified by §5 `post_carries_text_image_emoji`]
4. **Media hidden until APPROVED** - a post whose attached `ModerationMedia.status` is `PENDING` exposes no displayable media in the feed; once the status flips to `APPROVED` the media is included. (§1 #3) [verified by §5 `media_hidden_until_approved`]
5. **Gallery limits reused** - attaching media beyond the platform gallery per-post count or per-file size cap is rejected by the same limit the gallery enforces, with no feed-specific limit. (§1 #4) [verified by §5 `media_reuses_gallery_limits`]
6. **Comment create** - a paid member of the community calls `addComment` and the comment is created against `postId` and returned by the feed's comment hydration. (§1 #5) [verified by §5 `comment_create`]
7. **Reaction toggles and dedupes** - reacting with an emoji adds one `(post, user, emoji)` entry; reacting again with the same emoji removes it; a second identical add never produces a duplicate. (§1 #6) [verified by §5 `reaction_toggle_dedupe`]
8. **Author delete** - a post's author calls `deletePost`, the post's `deletedAt` is set, and it disappears from `communityFeed`. (§1 #7) [verified by §5 `author_can_delete`]
9. **Moderator delete** - a community moderator (a `community.ownerIds` member who is not the author) calls `deletePost` and `deleteComment` and both are soft-deleted; a caller who is neither author nor moderator is rejected. (§1 #7) [verified by §5 `moderator_can_delete_non_author_cannot`]
10. **12-month TTL** - a created post has `expiresAt` set to `createdAt + 365 days`, and the model declares a TTL index on `expiresAt` with `expireAfterSeconds: 0`. (§1 #8) [verified by §5 `post_expires_in_twelve_months`]
11. **Feed newest-first** - `communityFeed` returns posts sorted by `createdAt` descending, excludes soft-deleted posts, and hydrates author, reaction counts, and comment count per post. (§1 #9) [verified by §5 `feed_newest_first_hydrated`]

---

## §5 - Verification

```typescript
// ssl-be/src/modules/community/community-post.test.ts
import { describe, expect, it, vi } from 'vitest';

import { communityPostCtr } from './community-post.controller.js';
import { CommunityPostModel } from './community-post.model.js';
import { E_ModerationMediaStatus } from '#modules/moderation/moderation-media/moderation-media.type.js';

// Helpers stub authnCtr.isPaidMember / getUserFromSession and the CommunityMember + ownerIds
// lookups from FR-COMM-001 so each AC drives the controller guard in isolation.

describe('community feed - posts, comments, reactions, moderation, delete', () => {
    it('paid_member_can_post', async () => {                         // AC #1 (§1 #1)
        const ctx = ctxAsPaidMemberOf('c1');
        const res = await communityPostCtr.createPost(ctx, { communityId: 'c1', content: 'gm 🎉', mediaIds: [] });
        expect(res.success).toBe(true);
        const feed = await communityPostCtr.listFeed(ctx, { communityId: 'c1' });
        expect(feed.docs.map(p => p.id)).toContain(res.result.id);
    });

    it('non_paid_or_non_member_rejected', async () => {              // AC #2 (§1 #1, #10)
        await expect(communityPostCtr.createPost(ctxAsFreeMemberOf('c1'), { communityId: 'c1', content: 'x' })).rejects.toThrow(/403|paid|member/i);
        await expect(communityPostCtr.createPost(ctxAsLoggedOut(), { communityId: 'c1', content: 'x' })).rejects.toThrow(/403|auth/i);
        await expect(communityPostCtr.createPost(ctxAsPaidNonMemberOf('c1'), { communityId: 'c1', content: 'x' })).rejects.toThrow(/403|member/i);
        await expect(communityPostCtr.addComment(ctxAsFreeMemberOf('c1'), { postId: 'p1', content: 'x' })).rejects.toThrow(/403|paid|member/i);
    });

    it('post_carries_text_image_emoji', async () => {               // AC #3 (§1 #2)
        const ctx = ctxAsPaidMemberOf('c1');
        const res = await communityPostCtr.createPost(ctx, { communityId: 'c1', content: 'hello 😍', mediaIds: ['m1'] });
        const saved = await CommunityPostModel.findOne({ id: res.result.id });
        expect(saved.content).toContain('😍');
        expect(saved.mediaIds).toEqual(['m1']);
    });

    it('media_hidden_until_approved', async () => {                 // AC #4 (§1 #3)
        const ctx = ctxAsPaidMemberOf('c1');
        const res = await communityPostCtr.createPost(ctx, { communityId: 'c1', content: '', mediaIds: ['m1'] });
        expect(displayableMedia(await communityPostCtr.listFeed(ctx, { communityId: 'c1' }))).toEqual([]); // PENDING
        await approveMedia('m1');                                   // ModerationMedia.status -> APPROVED
        expect(displayableMedia(await communityPostCtr.listFeed(ctx, { communityId: 'c1' }))).toContain('m1');
    });

    it('media_reuses_gallery_limits', async () => {                 // AC #5 (§1 #4)
        const ctx = ctxAsPaidMemberOf('c1');
        await expect(communityPostCtr.createPost(ctx, { communityId: 'c1', content: '', mediaIds: tooManyForGallery() }))
            .rejects.toThrow(galleryLimitError());
    });

    it('comment_create', async () => {                             // AC #6 (§1 #5)
        const ctx = ctxAsPaidMemberOf('c1');
        const post = (await communityPostCtr.createPost(ctx, { communityId: 'c1', content: 'p' })).result;
        const res = await communityPostCtr.addComment(ctx, { postId: post.id, content: 'nice' });
        expect(res.success).toBe(true);
        expect(res.result.postId).toBe(post.id);
    });

    it('reaction_toggle_dedupe', async () => {                     // AC #7 (§1 #6)
        const ctx = ctxAsPaidMemberOf('c1');
        const post = (await communityPostCtr.createPost(ctx, { communityId: 'c1', content: 'p' })).result;
        let r = (await communityPostCtr.addReaction(ctx, { postId: post.id, emoji: '🔥' })).result;
        expect(r.reactions.filter(x => x.emoji === '🔥')).toHaveLength(1);   // added
        r = (await communityPostCtr.addReaction(ctx, { postId: post.id, emoji: '🔥' })).result;
        expect(r.reactions.filter(x => x.emoji === '🔥')).toHaveLength(0);   // toggled off, no dupe
    });

    it('author_can_delete', async () => {                          // AC #8 (§1 #7)
        const ctx = ctxAsPaidMemberOf('c1');
        const post = (await communityPostCtr.createPost(ctx, { communityId: 'c1', content: 'p' })).result;
        await communityPostCtr.deletePost(ctx, { postId: post.id });
        expect((await communityPostCtr.listFeed(ctx, { communityId: 'c1' })).docs.map(p => p.id)).not.toContain(post.id);
    });

    it('moderator_can_delete_non_author_cannot', async () => {     // AC #9 (§1 #7)
        const author = ctxAsPaidMemberOf('c1');
        const post = (await communityPostCtr.createPost(author, { communityId: 'c1', content: 'p' })).result;
        await expect(communityPostCtr.deletePost(ctxAsPaidMemberOf('c1', 'stranger'), { postId: post.id })).rejects.toThrow(/403/);
        await communityPostCtr.deletePost(ctxAsModeratorOf('c1'), { postId: post.id });          // ownerIds member
        const saved = await CommunityPostModel.findOne({ id: post.id });
        expect(saved.deletedAt).toBeTruthy();
    });

    it('post_expires_in_twelve_months', async () => {              // AC #10 (§1 #8)
        const ctx = ctxAsPaidMemberOf('c1');
        const post = (await communityPostCtr.createPost(ctx, { communityId: 'c1', content: 'p' })).result;
        const days = (new Date(post.expiresAt).getTime() - new Date(post.createdAt).getTime()) / 86400000;
        expect(Math.round(days)).toBe(365);
        expect(CommunityPostModel.schema.path('expiresAt').options.index.expireAfterSeconds).toBe(0);
    });

    it('feed_newest_first_hydrated', async () => {                 // AC #11 (§1 #9)
        const ctx = ctxAsPaidMemberOf('c1');
        const a = (await communityPostCtr.createPost(ctx, { communityId: 'c1', content: 'older' })).result;
        const b = (await communityPostCtr.createPost(ctx, { communityId: 'c1', content: 'newer' })).result;
        await communityPostCtr.addComment(ctx, { postId: b.id, content: 'hi' });
        await communityPostCtr.addReaction(ctx, { postId: b.id, emoji: '🔥' });
        const feed = await communityPostCtr.listFeed(ctx, { communityId: 'c1' });
        expect(feed.docs[0].id).toBe(b.id);                        // newest first
        expect(feed.docs.map(p => p.id).indexOf(a.id)).toBeGreaterThan(0);
        expect(feed.docs[0].author).toBeDefined();                 // hydrated author
        expect(feed.docs[0].reactionCount).toBe(1);                // hydrated reaction count
        expect(feed.docs[0].commentCount).toBe(1);                 // hydrated comment count
    });
});
```

ssl-fe-user note: `community-feed.test.tsx` renders `community-feed.tsx` and asserts (a) the composer (`LexicalEditor` + `UploadMedia`) is shown for a paid member of the community and replaced by an upgrade CTA for a free or non-member viewer, and (b) clicking `ButtonLike` calls `useAddReaction` once and reflects the toggled `isLiked`/`likeCount` state, mirroring `paid_member_can_post`, `non_paid_or_non_member_rejected`, and `reaction_toggle_dedupe`.

---

## §6 - Implementation skeleton

(The API contract in §3 is the skeleton.) The controller adds three cross-cutting concerns to the write paths: `assertPaidMemberOfCommunity` (`authnCtr.isPaidMember` + a `CommunityMember` lookup from FR-COMM-001), `enqueuePostMediaModeration` (one `ModerationMedia` row per attachment with `entity` = the community-post upload entity plus `aiModerationCtr.moderateImage`), and `assertAuthorOrModerator` (author id or a `community.ownerIds` member). The feed read filters `deletedAt: null` and the APPROVED-media projection in one query. The frontend `community-feed.tsx` composes `LexicalEditor` (text + emoji), `UploadMedia` (gallery-limited upload), `CommentSection`, `ButtonLike`, and `InfiniteScroll`, all already in `ssl-fe-user/src/shared/component`.

---

## §7 - Dependencies

- Upstream: **FR-COMM-001** (the `Community` and `CommunityMember` shape, `community.ownerIds` for moderator authority, the join/membership state the post/comment gate reads, and the `E_UploadEntity.COMMUNITY` discriminator FR-COMM-001 adds to `ssl-be/src/shared/typescript/entity.ts` - this FR consumes that member as the post-media `entity` and does not re-declare the enum file).
- Platform reuse: `authnCtr.isPaidMember` (paid gate), `ModerationMedia` + `aiModerationCtr` (media moderation), the gallery upload limits (`upload-media.tsx`), and the `deletedAt`/`expiresAt` idioms from `message.model.ts`.
- Related: **FR-COMM-003** (community discovery/search), which links into the feed but does not block it.
- Downstream: none directly; the feed is the leaf the MVP renders.

---

## §8 - Example payloads

```json
{ "kind": "community.post_created", "payload": { "postId": "p_123", "communityId": "c_1", "authorId": "u_9", "mediaCount": 2, "statusMedia": "PENDING" } }
```

```json
{ "kind": "community.reaction_toggled", "payload": { "postId": "p_123", "userId": "u_9", "emoji": "🔥", "state": "added" } }
```

```json
{ "kind": "community.post_deleted", "payload": { "postId": "p_123", "by": "u_owner", "asModerator": true } }
```

---

## §9 - Open questions

All resolved for the MVP. Deferred:
- Reactions are a flat emoji set in v1; a richer reaction palette or counts-by-emoji breakdown UI is a slice 2+ nicety and does not change the `(post, user, emoji)` model.
- Searching inside posts is explicitly later (DEC-SSL-243); v1 feed reads are by community only.
- Video attachments ride the same `ModerationMedia` path as images via `aiModerationCtr.moderateVideo` if enabled; the MVP feed ships image + text + emoji and treats video as an additive follow-up.

---

## §10 - Failure modes inventory

| Failure | Detection | Outcome | Recovery |
|---|---|---|---|
| Free member posts via forged mutation | `isPaidMember` guard in controller | 403-class, nothing written | upgrade to paid |
| Paid non-member posts | `CommunityMember` lookup (FR-COMM-001) | 403-class, nothing written | join the community |
| Logged-out caller posts/comments | `getUserFromSession` throws | 401/403-class | sign in |
| Unreviewed media shown in feed | APPROVED-only projection | media omitted until APPROVED | moderator/AI approves |
| Media exceeds platform limit | gallery limit reused | rejected at upload | resize/reduce count |
| Duplicate reaction stacked | `(post, user, emoji)` dedupe + toggle | single or zero, never dup | none (AC #7) |
| Non-author non-moderator deletes | `assertAuthorOrModerator` | 403-class | only author/moderator |
| Soft-deleted post still visible | `deletedAt: null` feed filter | excluded | none |
| Post outlives 12 months | TTL index on `expiresAt` | auto-removed | none (AC #10) |
| Feed out of order | `createdAt: -1` sort + compound index | newest-first | none |
| Reaction/comment on deleted post | `getLivePostOrThrow` (deletedAt null) | rejected | refresh feed |
| Reaction race (two devices) | `$addToSet`/`$pull` atomic update | converges, no dup | none |
| Media row orphaned if post create fails | post created before moderation enqueue | no orphan media | none |
| Client shows composer to non-member | server gate is source of truth | forged call still 403 | none (§1 #10) |

---

## §11 - Implementation notes

- The two load-bearing gates - paid (`authnCtr.isPaidMember`) and community membership (`CommunityMember` from FR-COMM-001) - are checked together in `assertPaidMemberOfCommunity` at the top of every write path, so no resolver can create content for a user who is not both, and a forged client request is rejected exactly like the guestbook gate in FR-GUEST-001.
- Post media reuses the existing moderation control end to end: one `ModerationMedia` row per attachment (`status` defaulting to `PENDING`, `entity` set to the community-post upload entity, `entityId` the post id) plus `aiModerationCtr.moderateImage`, and the feed projects only `APPROVED` media. This is the same pipeline gallery and profile media already use, so there is no second moderation path to keep in sync.
- The gallery limits are reused rather than re-specified (DEC-SSL-244): the composer drives `UploadMedia`, which already enforces the platform per-file size and per-batch count caps, so the feed cannot diverge from the gallery rule.
- Soft-delete (`deletedAt`) and the 12-month TTL (`expiresAt` + `expireAfterSeconds: 0`) are taken verbatim from `message.model.ts`, so deletion and expiry behave like the rest of the platform and need no bespoke cron.
- Reactions are stored as deduped `(userId, emoji)` subdocuments and toggled with atomic `$addToSet`/`$pull`, so concurrent reactions from two devices converge without duplicates and the count always reflects distinct users - which is what `ButtonLike` renders.
- Moderator authority is `community.ownerIds` membership (FR-COMM-001), not a new role, so the in-community admin model stays in one place and the full admin panel deferred to Phase 2 (DEC-SSL-246) can build on it later.
- The feed read does the visibility work in one query (`deletedAt: null`, newest-first, author populate), so the client never has to post-filter deleted posts and pagination stays stable under `InfiniteScroll`.

---

*End of FR-COMM-002.*
