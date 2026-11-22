#!/bin/bash
# Surgical rebuild of steps 3-5 of build-video.sh (tail + hold + concat), reusing main.mp4/body.mp4.
set -euo pipefail
cd "$(dirname "$0")"
CODE="ebgtn94a"
FONT="JetBrainsMono-Bold.ttf"
CARD="makefun-card-9x16-transparent.webm"
DT=""
PREFIX=""
for i in 1 2 3 4 5 6 7 8; do
  PREFIX="${CODE:0:$i}"
  START=$(python3 -c "print(f'{1.433 + ($i - 1) * 0.11:.3f}')")
  DT="${DT}drawtext=fontfile=${FONT}:text='${PREFIX}':fontsize=62:fontcolor=0x191419:x=210:y=1240:enable='gte(t,${START})',"
done
DT=${DT%,}
ffmpeg -y -v error -i tail-src.mp4 -i "$CARD" -filter_complex "\
[0:v]split=2[clean][b0];\
[b0]boxblur=28:2,eq=saturation=0.5,format=yuva420p,fade=t=in:st=0:d=0.8:alpha=1[blur];\
[clean][blur]overlay=0:0[washed];\
[washed][1:v]overlay=0:0[carded];\
[carded]drawbox=x=208:y=1230:w=9:h=82:color=white:t=fill:enable='gte(t,1.433)',${DT}[out]" -map "[out]" -c:v libx264 -pix_fmt yuv420p -crf 19 -an tail.mp4
ffmpeg -y -v error -sseof -0.1 -i tail.mp4 -frames:v 1 lastframe.png
ffmpeg -y -v error -loop 1 -t 1.6 -i lastframe.png -vf "fps=30,scale=1080:1920" -c:v libx264 -pix_fmt yuv420p -crf 19 -an hold.mp4
printf "file 'body.mp4'\nfile 'tail.mp4'\nfile 'hold.mp4'\n" > concat.txt
ffmpeg -y -v error -f concat -safe 0 -i concat.txt -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 \
  -c:v libx264 -pix_fmt yuv420p -crf 20 -c:a aac -b:a 64k -shortest -movflags +faststart ../video.mp4
ffprobe -v error -show_entries format=duration -show_entries stream=width,height,codec_name -of default=noprint_wrappers=1 ../video.mp4
ffmpeg -y -v error -ss 48.4 -i ../video.mp4 -frames:v 1 frame-d-card.png
echo REBUILD-OK
