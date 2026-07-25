import json
import sys

def search_endpoints(json_file, query):
    try:
        with open(json_file, 'r') as f:
            data = json.load(f)
    except Exception as e:
        print(f"Error loading JSON: {e}")
        return

    paths = data.get('paths', {})
    for path in paths:
        if query in path:
            print(path)

if __name__ == "__main__":
    search_endpoints(sys.argv[1], sys.argv[2])
