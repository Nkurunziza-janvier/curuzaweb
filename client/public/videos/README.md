# Walkthrough video slot

The landing page "How it works" section loads:

```
client/public/videos/how-it-works.mp4
```

Until that file exists, the section shows a designed placeholder telling
visitors the walkthrough is coming (and nothing breaks). To go live:

1. Export your walkthrough video as `how-it-works.mp4` (16:9 recommended,
   under ~8 MB for fast load).
2. Save it here as `how-it-works.mp4` (same name, lowercase).
3. No code changes needed — the landing page picks it up automatically
   and shows native controls when playing.
