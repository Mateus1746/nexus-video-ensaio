import json
import random
import os

def generate_crawler_data():
    layouts = ["split_screen", "floating_focus", "document_inspect"]

    # Mock data output
    data = {
        "metadata": {
            "source": "Vox Media",
            "author": "Johnny Harris Style",
            "logo": "vox_logo.png"
        },
        "annotations": [
            {"type": "highlight", "phrase": "unprecedented arms race"},
            {"type": "circle", "phrase": "military expenditure skyrocketed"},
            {"type": "highlight", "phrase": "global wealth was now heavily concentrated"}
        ],
        "layout": random.choice(layouts)
    }

    os.makedirs("pipeline", exist_ok=True)
    with open("pipeline/crawler_data.json", "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4)

    print("[Crawler] Dados coletados e salvos em pipeline/crawler_data.json")

if __name__ == "__main__":
    generate_crawler_data()
