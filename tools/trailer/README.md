# Instagram trailer

This folder makes a vertical 1080×1920, 30 fps trailer (about 34 s) from the real game, for Instagram Reels and Stories.

1. **Frames:** `record.mjs` plays a scripted run of the production build in headless Chromium. The page clock is faked and every frame is a screenshot, so the motion is smooth on any machine. Expect about an hour with software rendering.
2. **Music:** `music.py` synthesizes an original, royalty-free backing track (no samples, no copyrighted music).
3. **Video:** ffmpeg joins the frames and the music into an H.264/AAC MP4.

```bash
npm run build
node tools/trailer/record.mjs /tmp/trailer-frames          # needs Playwright + Chromium
N=$(ls /tmp/trailer-frames | wc -l)
python3 tools/trailer/music.py /tmp/trailer-music.wav $(python3 -c "print($N/30)")
ffmpeg -y -framerate 30 -i /tmp/trailer-frames/%05d.jpg -i /tmp/trailer-music.wav \
  -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -profile:v high -level 4.1 \
  -c:a aac -b:a 160k -shortest -movflags +faststart stem-is-for-you-trailer.mp4
```

To change the story, edit the scenes in `record.mjs`. Each scene sets a caption with `caption(html, top)` and records with `rec(seconds, eachFrame)`. Captions sit in the top part of the frame, because Instagram covers the bottom with its own buttons and text.
