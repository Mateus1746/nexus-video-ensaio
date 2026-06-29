import json
import random
import os

def generate_mock_script():
    layouts = ["split_screen", "floating_focus", "document_inspect"]
    vehicles = ["The Washington Post", "The New York Times", "Vox", "BBC News"]
    authors = ["John Doe", "Jane Smith", "Alex Johnson"]

    scenes = [
        {
            "id": "scene_01_intro",
            "title": "The Dawn of the New Crisis",
            "text": "In recent years, global escalation has reached unprecedented levels, fundamentally shifting the geopolitical landscape.",
            "source": {
                "vehicle": random.choice(vehicles),
                "author": random.choice(authors),
                "date": "2026-06-13",
                "logo": "assets/icon_newspaper.png"
            },
            "layout": random.choice(layouts),
            "annotations": [
                {
                    "type": "highlight",
                    "text": "unprecedented levels"
                },
                {
                    "type": "circle",
                    "text": "geopolitical landscape"
                }
            ]
        },
        {
            "id": "scene_02_economics",
            "title": "Economic Fallout",
            "text": "The price of power is measured not just in dollars, but in the reshaping of society itself. Markets are reacting violently.",
            "source": {
                "vehicle": random.choice(vehicles),
                "author": random.choice(authors),
                "date": "2026-06-14",
                "logo": "assets/icon_newspaper.png"
            },
            "layout": random.choice(layouts),
            "annotations": [
                {
                    "type": "highlight",
                    "text": "reshaping of society itself"
                }
            ]
        }
    ]

    os.makedirs("pipeline", exist_ok=True)
    with open("pipeline/master_script.json", "w") as f:
        json.dump(scenes, f, indent=2)
    print("Generated mock master_script.json in pipeline/")

if __name__ == "__main__":
    generate_mock_script()
