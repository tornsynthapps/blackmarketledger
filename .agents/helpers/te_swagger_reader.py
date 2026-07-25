import yaml
import sys
import os

def read_swagger(file_path):
    if not os.path.exists(file_path):
        print(f"Error: File not found: {file_path}")
        return

    try:
        with open(file_path, 'r') as f:
            data = yaml.safe_load(f)
    except Exception as e:
        print(f"Error parsing YAML: {e}")
        return

    print(f"\n{'='*60}")
    print(f"Swagger API: {data.get('info', {}).get('title', 'Unknown')}")
    print(f"Version: {data.get('info', {}).get('version', 'Unknown')}")
    print(f"{'='*60}\n")

    paths = data.get('paths', {})
    for path, methods in paths.items():
        for method, details in methods.items():
            print(f"[{method.upper()}] {path}")
            print(f"Description: {details.get('description', details.get('summary', 'No description'))}")
            
            parameters = details.get('parameters', [])
            if parameters:
                print("Parameters:")
                for param in parameters:
                    if '$ref' in param:
                        # Simple resolution for local refs
                        ref_path = param['$ref'].split('/')
                        ref_data = data
                        for part in ref_path[1:]:
                            ref_data = ref_data.get(part, {})
                        p_name = ref_data.get('name', 'unknown')
                        p_in = ref_data.get('in', 'unknown')
                        p_req = ref_data.get('required', False)
                        print(f"  - {p_name} ({p_in}){' [REQUIRED]' if p_req else ''}")
                    else:
                        p_name = param.get('name', 'unknown')
                        p_in = param.get('in', 'unknown')
                        p_req = param.get('required', False)
                        print(f"  - {p_name} ({p_in}){' [REQUIRED]' if p_req else ''}")
            
            # Response summary
            responses = details.get('responses', {})
            if '200' in responses:
                print("Response (200):")
                content = responses['200'].get('content', {}).get('application/json', {})
                schema = content.get('schema', {})
                if schema:
                    print(f"  Schema Type: {schema.get('type', 'Unknown')}")
                    if 'properties' in schema:
                        props = schema['properties'].keys()
                        print(f"  Properties: {', '.join(props)}")
            
            print("-" * 40)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        # Default to the Torn Exchange swagger if no argument provided
        default_path = os.path.join(os.path.dirname(__file__), "../../references/swagger-endpoints/torn-exchange.yml")
        if os.path.exists(default_path):
            read_swagger(default_path)
        else:
            print("Usage: python te_swagger_reader.py <swagger_file_path>")
    else:
        read_swagger(sys.argv[1])
