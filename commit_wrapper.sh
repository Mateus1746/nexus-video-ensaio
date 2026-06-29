rm -rf /tmp/engine-headless-recorder-standalone
cp -r tools/Engine-Headless-Recorder /tmp/engine-headless-recorder-standalone
cd /tmp/engine-headless-recorder-standalone
git init
git checkout -b fix/rendering-pipeline-optimization
git add .
git commit -m "fix: rendering pipeline optimization metrics"
