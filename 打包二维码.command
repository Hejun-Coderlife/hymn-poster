#!/bin/bash
cd "$(dirname "$0")" && node tools/build_qr.js
echo; read -n 1 -s -r -p "按任意键关闭"
