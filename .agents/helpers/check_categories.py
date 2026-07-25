import json

with open(".agents/references/torn-api.json") as f:
    schema = json.load(f)

for path, obj in schema.get("paths", {}).items():
    if "user" in path.lower() or "cat" in path.lower():
        print("Path: " + path)

print("\n--- Params for paths ---")
for path, obj in schema.get("paths", {}).items():
    if "user" in path.lower() and "get" in obj:
        params = obj["get"].get("parameters", [])
        for p in params:
            if "cat" in p.get("name", "").lower():
                print("Path: " + path + " has cat param: " + str(p))

print("\n--- Selections / Categories ---")
for name, comp in schema.get("components", {}).get("schemas", {}).items():
    lower_name = name.lower()
    if "user" in lower_name and "selection" in lower_name:
        print("Schema: " + name)
        if "enum" in comp:
            print("Enum: " + str(comp["enum"]))
    if "categor" in lower_name:
        print("Schema Component: " + name)
        if "enum" in comp:
            print("Enum: " + str(comp["enum"]))
