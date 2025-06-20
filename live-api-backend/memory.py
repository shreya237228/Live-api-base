import json
import os

MEMORY_FILE = os.path.join(os.path.dirname(__file__), "memory_store.json")

DEFAULT_MEMORY = {
    "enabled": False,
    "preferences": {},
    "context": {},
    "knowledge": {}
}

def load_memory():
    if not os.path.exists(MEMORY_FILE):
        return DEFAULT_MEMORY.copy()
    try:
        with open(MEMORY_FILE, "r") as f:
            return json.load(f)
    except Exception:
        return DEFAULT_MEMORY.copy()

def save_memory(mem):
    with open(MEMORY_FILE, "w") as f:
        json.dump(mem, f)

def enable_memory():
    mem = load_memory()
    mem["enabled"] = True
    save_memory(mem)
    return mem

def disable_memory():
    mem = load_memory()
    mem["enabled"] = False
    save_memory(mem)
    return mem

def clear_memory():
    mem = load_memory()
    enabled = mem.get("enabled", False)
    mem = DEFAULT_MEMORY.copy()
    mem["enabled"] = enabled
    save_memory(mem)
    return mem

def get_memory_status():
    return load_memory()

def set_preference(key, value):
    mem = load_memory()
    mem["preferences"][key] = value
    save_memory(mem)
    return mem

def get_preference(key):
    mem = load_memory()
    return mem["preferences"].get(key) 