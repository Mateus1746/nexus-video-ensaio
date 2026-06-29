import re

with open("tools/Engine-Headless-Recorder/src/node/record_video.js", "r") as f:
    content = f.read()

# Replace puppeteer launch options to remove swiftshader and enable full GPU
pattern = r"browser = await puppeteer\.launch\(\{(.*?)\}\);"

new_options = """browser = await puppeteer.launch({
      headless: 'new',
      protocolTimeout: 0,
      args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--use-gl=angle', // Force WebGL on headless
          '--enable-webgl',
          '--ignore-gpu-blocklist',
          '--disable-dev-shm-usage',
      ],
      env: {
          ...process.env,
          __NV_PRIME_RENDER_OFFLOAD: '1' // If nvidia is available
      },
      defaultViewport: { width: VIEWPORT_W, height: VIEWPORT_H }
    });"""

# There are multiple occurrences of puppeteer.launch
content = re.sub(r"browser = await puppeteer\.launch\(\{(.*?)\}\);", new_options, content, flags=re.DOTALL)

with open("tools/Engine-Headless-Recorder/src/node/record_video.js", "w") as f:
    f.write(content)
