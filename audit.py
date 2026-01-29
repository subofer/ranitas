import os
import re
import subprocess
import sys
import time
from multiprocessing import Pool, cpu_count

# --- ESTÉTICA MATRIX/CYBERPUNK ---
G = "\033[38;5;46m"  # Verde
R = "\033[38;5;196m" # Rojo
B = "\033[38;5;51m"  # Cyan
Y = "\033[38;5;226m" # Amarillo
W = "\033[1m\033[37m" # Blanco Bold
BOLD = "\033[1m"
RESET = "\033[0m"

EXTENSIONS = {'.py', '.jsx', '.js', '.tsx'}
IGNORE_DIRS = {'venv', '__pycache__', 'node_modules', '.git', 'dist', 'build', '.next'}

def get_file_stats(path):
    """Extrae ADN técnico del archivo."""
    try:
        size = os.path.getsize(path) / 1024  # KB
        with open(path, 'r', encoding='utf-8', errors='ignore') as f:
            lines = f.readlines()
            content = "".join(lines)
            if path.endswith('.py'):
                funcs = len(re.findall(r'^def\s+', content, re.M))
                classes = len(re.findall(r'^class\s+', content, re.M))
            else:
                funcs = len(re.findall(r'function|const\s+\w+\s*=\s*\([^)]*\)\s*=>', content))
                classes = len(re.findall(r'class\s+', content))
            return len(lines), round(size, 1), funcs, classes
    except: return 0, 0, 0, 0

def check_mention(args):
    """Búsqueda paralela con Grep."""
    name, origin_path, all_files = args
    cmd = ['grep', '-rIwl', name, '.']
    try:
        output = subprocess.check_output(cmd, text=True, stderr=subprocess.DEVNULL).splitlines()
        # Filtrar: solo archivos fuera del origen y que no estén en carpetas ignoradas
        others = [f for f in output if os.path.abspath(f) != os.path.abspath(origin_path) 
                  and not any(x in f for x in IGNORE_DIRS)]
        return name, len(others)
    except subprocess.CalledProcessError:
        return name, 0

def main():
    os.system('clear')
    all_files = []
    for root, dirs, filenames in os.walk('.'):
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
        for f in filenames:
            if any(f.endswith(ext) for ext in EXTENSIONS):
                all_files.append(os.path.join(root, f))

    dead_list = []
    
    print(f"{G}{BOLD}>>> KERNEL AUDIT ACTIVE | TARGETS: {len(all_files)} FILES{RESET}\n")
    time.sleep(1)

    for file_path in all_files:
        ln, sz, fn, cl = get_file_stats(file_path)
        
        # PANEL DE TELEMETRÍA DEL ARCHIVO
        print(f"{W} ANALYZING:{RESET} {B}{file_path}{RESET}")
        print(f" {W}├─ DNA:{RESET} {ln} lines | {sz} KB | {fn} funcs | {cl} classes")
        
        defs = []
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                for i, line in enumerate(f, 1):
                    # Regex para Python o JS/JSX
                    reg = r'^(?:def|class)\s+([a-zA-Z_]\w*)' if file_path.endswith('.py') else r'(?:export\s+)?(?:function|class|const|let|var)\s+([a-zA-Z_]\w*)'
                    m = re.search(reg, line)
                    if m: defs.append((m.group(1), i))
        except: pass

        if defs:
            # Procesamiento en paralelo para este archivo
            with Pool(cpu_count()) as pool:
                tasks = [(d[0], file_path, all_files) for d in defs]
                results = pool.map(check_mention, tasks)
                
                for (name, count), (_, line_num) in zip(results, defs):
                    # Filtro de seguridad
                    if name in {'main', 'app', 'router', 'get', 'post'} or len(name) < 3:
                        continue
                    
                    if count > 0:
                        status = f"{G}[ALIVE ({count})]{RESET}"
                    else:
                        status = f"{R}[DEAD]{RESET}"
                        dead_list.append((file_path, line_num, name))
                    
                    # El desfile de nombres pasando hacia abajo
                    sys.stdout.write(f" {W}│  └─{RESET} {status} {W}L{line_num:<4}{RESET} | {name}\n")
                    sys.stdout.flush()
                    time.sleep(0.002) # Velocidad de flujo
        
        print(f" {W}└─ PROCESS COMPLETE{RESET}\n")

    # REPORTE FINAL ESTILO MATRIX
    print(f"\n{Y}{'='*80}{RESET}")
    print(f"{BOLD}{W}>>> AUDIT TERMINATED. {len(dead_list)} CANDIDATES FOR DELETION FOUND.{RESET}")
    print(f"{Y}{'='*80}{RESET}")
    
    for f, l, n in dead_list:
        print(f"{R}DEATH ROW:{RESET} {f}:{l} -> {W}{n}{RESET}")

if __name__ == "__main__":
    main()