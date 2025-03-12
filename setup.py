#!/usr/bin/env python3

import os
import subprocess
import sys
import json

# Funktion för att köra kommandon och hantera fel
def run_command(command, error_message="Kommando misslyckades", cwd=None):
    try:
        subprocess.run(command, shell=True, check=True, text=True, cwd=cwd)
    except subprocess.CalledProcessError as e:
        print(f"{error_message}: {e}")
        sys.exit(1)

# Kontrollera att npm finns
print("Kontrollerar om npm finns...")
result = subprocess.run("npm -v", shell=True, capture_output=True, text=True)
if result.returncode != 0:
    print("npm kunde inte hittas. Installera Node.js och npm först.")
    sys.exit(1)

# Uppdatera npm
print("Uppdaterar npm till senaste versionen...")
run_command("npm install -g npm", "Kunde inte uppdatera npm")

# Kontrollera att client-mappen finns
client_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "client")
if not os.path.isdir(client_dir):
    print(f"Kunde inte hitta client-mappen: {client_dir}")
    sys.exit(1)

# Installera projektberoenden i client-mappen
print("Installerar projektberoenden i client-mappen...")
run_command("npm install", "Kunde inte installera projektberoenden", cwd=client_dir)




# Installera shadcn/ui
print("Installerar shadcn...")

# Läs in components.json för att hämta komponenter
components_json_path = os.path.join(client_dir, "shadcn-components.json")
try:
    with open(components_json_path, 'r') as f:
        components = json.load(f).get("components", [])
        if components:
            print("Komponenter i components.json:")
            for component in components:
                print(f"  - {component}")
        else:
            print("Inga komponenter hittades i components.json")

except Exception as e:
    print(f"Kunde inte läsa components.json: {e}")


# Installera alla komponenter från components.json
if components:
    components_str = " ".join(components)
    print(f"Installerar komponenter: {components_str}")
    run_command(f"npx shadcn add {components_str} --yes", "Kunde inte installera komponenterna", cwd=client_dir)


print("Installation och konfiguration klar!")
print("Starta projektet med: cd client && npm run dev")