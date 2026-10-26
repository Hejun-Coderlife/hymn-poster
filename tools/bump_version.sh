#!/bin/bash
# 推送前跑一下：给 index.html 里的脚本链接换新版本号，手机浏览器才不会用缓存的旧脚本（Pages 缓存 10 分钟）
cd "$(dirname "$0")/.." && V=$(date +%Y%m%d%H%M) && perl -pi -e 's#(<script src="[^"?]+\.js)(\?v=\d+)?"#$1?v='"$V"'"#' index.html && echo "版本号 $V"
