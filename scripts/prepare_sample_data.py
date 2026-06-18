import argparse
import json
from pathlib import Path


def load_json(path):
    if not path.exists():
        print(f"Missing: {path}")
        return []

    with open(path, "r", encoding="utf-8") as file:
        data = json.load(file)

    if isinstance(data, list):
        return data

    return []


def write_sample(input_path, output_path, limit):
    rows = load_json(input_path)
    sample = rows[:limit]

    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, "w", encoding="utf-8") as file:
        json.dump(sample, file, indent=2, ensure_ascii=False)

    print(f"Created {output_path} | rows: {len(sample)}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, help="Source frontend/data folder")
    parser.add_argument("--output", required=True, help="Destination frontend/data folder")
    parser.add_argument("--limit", type=int, default=50)

    args = parser.parse_args()

    input_dir = Path(args.input)
    output_dir = Path(args.output)

    mapping = {
        "playback_buses.json": "sample_playback_buses.json",
        "latest_buses.json": "sample_latest_buses.json",
        "metro_playback.json": "sample_metro_playback.json",
        "metro_latest.json": "sample_metro_latest.json"
    }

    for source_name, sample_name in mapping.items():
        write_sample(
            input_dir / source_name,
            output_dir / sample_name,
            args.limit
        )


if __name__ == "__main__":
    main()
