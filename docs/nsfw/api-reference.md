# NSFW Content Classification API Reference

NSFW fields extend existing feed endpoints; no public NSFW-only endpoint is
added.

## Create Post

`POST /v1/feed`

Optional input:

```json
{
  "authorNsfwCategories": ["nudity", "sensitive"]
}
```

Maximum five enum values. Unknown categories return `400`. Unknown fields such
as `nsfwStatus` are stripped. Client per-media NSFW fields are not trusted.

## Create Comment

`POST /v1/feed/posts/:postId/comments`

Accepts the same optional `authorNsfwCategories` field with the same validation.

## Feed Post Response

```json
{
  "nsfw": {
    "status": "pending",
    "categories": [],
    "source": null
  },
  "media": [
    {
      "type": "image",
      "url": "https://...",
      "nsfw": false,
      "nsfwCategories": []
    }
  ]
}
```

`status` is `none | pending | flagged`; `source` is `author | system | null`.
Quoted post previews carry the same top-level NSFW object.

## Comment Response

Comment list, create, and edit DTOs include the same `nsfw` object. No response
removes or tombstones a row because of NSFW status.

## Report Priority Re-scan

`POST /v1/reports` retains its existing contract. A newly inserted
`nudity_sexual_content` report against a post/comment currently at `none`
best-effort queues a priority scan in addition to normal moderation auto-hide
work. Report response shape is unchanged.
