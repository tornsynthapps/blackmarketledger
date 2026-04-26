import json
import sys

def get_endpoint_data(json_file, endpoint):
    try:
        with open(json_file, 'r') as f:
            data = json.load(f)
    except Exception as e:
        print(f"Error loading JSON: {e}")
        return

    paths = data.get('paths', {})
    if endpoint in paths:
        print(f"Data for endpoint {endpoint}:")
        print(json.dumps(paths[endpoint], indent=4))
    else:
        print(f"Endpoint {endpoint} not found.")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python read_torn_api.py <json_file> <endpoint>")
    else:
        get_endpoint_data(sys.argv[1], sys.argv[2])
