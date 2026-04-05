import subprocess
import os
import secrets
import sys

def get_key():
    """Lee una sola tecla del terminal sin esperar a Enter (compatible Windows/Linux)."""
    if os.name == 'nt':
        import msvcrt
        ch = msvcrt.getch()
        if ch in (b'\x00', b'\xe0'): # Prefijo de flechas en Windows
            return msvcrt.getch()
        return ch
    else:
        import termios
        import tty
        fd = sys.stdin.fileno()
        old_settings = termios.tcgetattr(fd)
        try:
            tty.setraw(sys.stdin.fileno())
            ch = sys.stdin.read(1)
            if ch == '\x1b': # Secuencia de escape (flechas en Linux)
                ch = sys.stdin.read(2)
            return ch
        finally:
            termios.tcsetattr(fd, termios.TCSADRAIN, old_settings)

def pick(title, options):
    """Muestra un menú seleccionable con cursor."""
    idx = 0
    while True:
        clear_screen()
        print_header(title)
        for i, opt in enumerate(options):
            if i == idx:
                print(f" \033[1;36m>\033[0m {opt}") # Cursor Cian brillante
            else:
                print(f"   {opt}")
        
        print(f"\n[W/S] Arriba/Abajo | [Enter] Seleccionar")
        
        k = get_key()
        # Teclas: Up(Windows: b'H', Linux: '[A'), Down(Win: b'P', Linux: '[B'), Enter(b'\r', '\r', '\n')
        if k in (b'H', '[A', 'w', 'W'): idx = (idx - 1) % len(options)
        elif k in (b'P', '[B', 's', 'S'): idx = (idx + 1) % len(options)
        elif k in (b'\r', '\r', '\n', b'\n'): return idx

def clear_screen():
    os.system('cls' if os.name == 'nt' else 'clear')

def print_header(title):
    print(f"\n{'='*50}")
    print(f" {title}")
    print(f"{'='*50}")

def check_or_create_env_file():
    """Checks for a .env file and creates it with secure defaults if not found."""
    if not os.path.exists('.env'):
        print("[!] '.env' file not found. Creating a new one with secure defaults.")
        
        # Default DB credentials (as defined in docker-compose)
        db_user = "postgres"
        db_password = "postgres"
        # Generate a secure, random 64-character hex secret for JWT
        jwt_secret = secrets.token_hex(32)

        with open('.env', 'w') as f:
            f.write(f"# Database Credentials\n")
            f.write(f"POSTGRES_USER={db_user}\n")
            f.write(f"POSTGRES_PASSWORD={db_password}\n\n")
            f.write(f"# JWT Secret Key\n")
            f.write(f"JWT_SECRET={jwt_secret}\n")
            f.write(f"\n# IA Service\n")
            f.write(f"OPENROUTER_API_KEY=your_openrouter_key_here\n")
            f.write(f"OPENROUTER_MODEL=openai/gpt-4o-mini\n")
            f.write(f"OPENROUTER_SITE_URL=http://localhost:12000\n")
            f.write(f"OPENROUTER_APP_NAME=Orbit\n")
            f.write(f"CORS_ALLOWED_ORIGINS=http://localhost:12000\n")
            f.write(f"CORS_ALLOW_CREDENTIALS=true\n")
            f.write(f"HTTP_TIMEOUT_SECONDS=20\n")
            f.write(f"MEMORY_DB_PATH=/data/agent_memory.db\n")
            f.write(f"GMAIL_SERVICE_URL=http://gmail-service:8082\n")
            f.write(f"TOKEN_VAULT_URL=http://auth-service:8080\n")
            f.write(f"DOC_SERVICE_URL=http://doc-service:9002\n")
            f.write(f"CODE_SERVICE_URL=http://code-service:9003\n")
            f.write(f"CODE_EXEC_TIMEOUT_SECONDS=5\n")
            f.write(f"CODE_MAX_CHARS=12000\n")
            f.write(f"CODE_MAX_OUTPUT_CHARS=4000\n")
            f.write(f"CODE_MAX_MEMORY_MB=128\n")
            f.write(f"CODE_MAX_STDIN_CHARS=4000\n")
            f.write(f"CODE_MAX_SQL_RESULT_ROWS=200\n")
            f.write(f"CODE_MAX_SQL_STATEMENTS=30\n")
            f.write(f"CODE_STRICT_MODE=true\n")
            f.write(f"CODE_PYTHON_ALLOWED_IMPORTS=math,statistics,decimal,datetime,time,json,csv,sqlite3,collections,itertools,functools,fractions,random,re,typing,pathlib,openpyxl\n")
            f.write(f"CODE_JS_ALLOWED_MODULES=\n")
            f.write(f"CODE_PYTHON_BLOCK_PATTERNS=\n")
            f.write(f"CODE_JS_BLOCK_PATTERNS=\n")
            f.write(f"CODE_SQL_BLOCK_PATTERNS=\n")
            f.write(f"CODE_SNIPPETS_DB_PATH=/data/snippets.db\n")
            f.write(f"EXCEL_SERVICE_URL=http://excel-service:9004\n")
            f.write(f"MINI_MAPS_SERVICE_URL=http://mini-maps-service:9005\n")
            f.write(f"\n# Integrations - Delivery Apps\n")
            f.write(f"CONNECTOR_DELIVERY_ENABLED=false\n")
            f.write(f"DELIVERY_API_URL=\n")
            f.write(f"DELIVERY_API_KEY=\n")
            f.write(f"\n# Integrations - Messaging (WhatsApp / Telegram)\n")
            f.write(f"CONNECTOR_WHATSAPP_ENABLED=false\n")
            f.write(f"WHATSAPP_PROVIDER=\n")
            f.write(f"WHATSAPP_API_URL=\n")
            f.write(f"WHATSAPP_ACCESS_TOKEN=\n")
            f.write(f"WHATSAPP_PHONE_NUMBER_ID=\n")
            f.write(f"CONNECTOR_TELEGRAM_ENABLED=false\n")
            f.write(f"TELEGRAM_BOT_TOKEN=\n")
            f.write(f"TELEGRAM_API_URL=https://api.telegram.org\n")
            f.write(f"\n# Integrations - Reservations\n")
            f.write(f"CONNECTOR_RESERVATIONS_ENABLED=false\n")
            f.write(f"RESERVATIONS_API_URL=\n")
            f.write(f"RESERVATIONS_API_KEY=\n")
            f.write(f"\n# Integrations - Public Transport\n")
            f.write(f"CONNECTOR_TRANSPORT_ENABLED=false\n")
            f.write(f"PUBLIC_TRANSPORT_API_URL=\n")
            f.write(f"PUBLIC_TRANSPORT_API_KEY=\n")
            f.write(f"\n# Integrations - Brokers\n")
            f.write(f"CONNECTOR_BROKER_ENABLED=false\n")
            f.write(f"BROKER_API_URL=\n")
            f.write(f"BROKER_API_KEY=\n")
            f.write(f"BROKER_API_SECRET=\n")
            f.write(f"\n# Integrations - Banking\n")
            f.write(f"CONNECTOR_BANK_ENABLED=false\n")
            f.write(f"BANK_API_URL=\n")
            f.write(f"BANK_API_KEY=\n")
            f.write(f"BANK_API_SECRET=\n")
            f.write(f"\n# OAuth2 Credentials\n")
            f.write(f"GOOGLE_CLIENT_ID=placeholder\n")
            f.write(f"GOOGLE_CLIENT_SECRET=placeholder\n")
            f.write(f"GITHUB_CLIENT_ID=placeholder\n")
            f.write(f"GITHUB_CLIENT_SECRET=placeholder\n")
            f.write(f"FACEBOOK_CLIENT_ID=placeholder\n")
            f.write(f"FACEBOOK_CLIENT_SECRET=placeholder\n")
            f.write(f"LINKEDIN_CLIENT_ID=placeholder\n")
            f.write(f"LINKEDIN_CLIENT_SECRET=placeholder\n")
        
        print("[+] A new '.env' file has been created. Please DO NOT commit this file to version control.")
    else:
        # Fix existing .env file if it has empty OAuth credentials
        fix_empty_oauth_credentials()

def check_or_create_frontend_env():
    """Checks for frontend/.env and creates it if not found, and adds it to .gitignore."""
    frontend_dir = "frontend"
    env_path = os.path.join(frontend_dir, ".env")
    
    # Create frontend dir if it doesn't exist
    if not os.path.exists(frontend_dir):
        os.makedirs(frontend_dir, exist_ok=True)
    
    if not os.path.exists(env_path):
        with open(env_path, "w") as f:
            f.write("VITE_API_URL=http://localhost:12001\n")
            f.write("VITE_IA_URL=http://localhost:12002\n")
            f.write("VITE_GMAIL_URL=http://localhost:12003\n")
            f.write("VITE_DOC_URL=http://localhost:12004\n")
            f.write("VITE_EXCEL_URL=http://localhost:12005\n")
            f.write("VITE_CODE_URL=http://localhost:12006\n")
            f.write("VITE_MINI_MAPS_URL=http://localhost:12007\n")
            f.write("VITE_DELIVERY_URL=\n")
            f.write("VITE_RESERVATIONS_URL=\n")
            f.write("VITE_TRANSPORT_URL=\n")
            f.write("VITE_BROKER_URL=\n")
            f.write("VITE_BANK_URL=\n")
            f.write("VITE_TELEGRAM_URL=\n")
            f.write("VITE_WHATSAPP_URL=\n")
        print(f"Created {env_path} with default values.")
    
    # Ensure ignored in root .gitignore
    add_to_gitignore("frontend/.env")

def check_or_create_ia_env():
    """Checks for IA-service/.env and creates it if not found, and adds it to .gitignore."""
    ia_dir = "IA-service"
    env_path = os.path.join(ia_dir, ".env")
    
    # Create IA-service dir if it doesn't exist
    if not os.path.exists(ia_dir):
        os.makedirs(ia_dir, exist_ok=True)
    
    if not os.path.exists(env_path):
        with open(env_path, "w") as f:
            f.write("OPENROUTER_API_KEY=your_api_key_here\n")
            f.write("TOKEN_VAULT_URL=http://localhost:12001\n")
        print(f"Created {env_path} with default values.")
    
    # Ensure ignored in root .gitignore
    add_to_gitignore("IA-service/.env")

def add_to_gitignore(entry):
    """Adds a pattern to .gitignore if it doesn't exist."""
    gitignore_path = ".gitignore"
    if os.path.exists(gitignore_path):
        with open(gitignore_path, "r") as f:
            content = f.read()
        if entry not in content:
            with open(gitignore_path, "a") as f:
                f.write(f"\n{entry}\n")
            print(f"Added {entry} to .gitignore")
    else:
        with open(gitignore_path, "w") as f:
            f.write(f"{entry}\n")

def fix_empty_oauth_credentials():
    """Scans .env and replaces empty OAuth keys with 'placeholder' to prevent boot errors."""
    oauth_keys = [
        "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET",
        "GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET",
        "FACEBOOK_CLIENT_ID", "FACEBOOK_CLIENT_SECRET",
        "LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET"
    ]
    
    try:
        with open('.env', 'r') as f:
            lines = f.readlines()
        
        modified = False
        new_lines = []
        for line in lines:
            key_part = line.split('=')[0].strip()
            val_part = line.split('=')[1].strip() if '=' in line else ''
            
            if key_part in oauth_keys and not val_part:
                new_lines.append(f"{key_part}=placeholder\n")
                modified = True
            else:
                new_lines.append(line)
        
        if modified:
            with open('.env', 'w') as f:
                f.writelines(new_lines)
            print("[*] Fixed empty OAuth credentials in .env file.")
            
    except Exception as e:
        print(f"[!] Warning: Could not check/fix .env file: {e}")
 
def run_command(command):
    """Runs a command and shows the status in the terminal."""
    print(f"\n[*] Executing: {command}")
    try:
        process = subprocess.Popen(command, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        stdout, stderr = process.communicate()
        if process.returncode == 0:
            print(f"[+] Success:\n{stdout}")
        else:
            print(f"[-] Error:\n{stderr}")
    except FileNotFoundError:
        print("[-] Error: Command not found. Please ensure Docker is installed.")
    except Exception as e:
        print(f"[-] An unexpected error occurred: {e}")
    input("\nPress Enter to continue...")

def start_service(service_name):
    """Starts a specific service using docker compose."""
    command = f"docker compose up -d --build {service_name}"
    run_command(command)

def stop_service(service_name):
    """Stops a specific service using docker compose."""
    command = f"docker compose stop {service_name}"
    run_command(command)

def start_all_services():
    """Starts all services using docker compose."""
    command = "docker compose up -d --build"
    run_command(command)
    
def stop_all_services():
    """Stops all running services."""
    command = "docker compose down"
    run_command(command)

def build_service(service_name):
    """Builds a specific service using docker compose."""
    command = f"docker compose build {service_name}"
    run_command(command)

SERVICES = [
    ("Auth Service", "auth-service"),
    ("IA Service", "ia-service"),
    ("Gmail Service", "gmail-service"),
    ("Doc Service", "doc-service"),
    ("Excel Service", "excel-service"),
    ("Code Service", "code-service"),
    ("Mini Maps", "mini-maps-service"),
    ("Frontend", "frontend")
]

def menu_build_service():
    options = [label for label, _ in SERVICES] + ["Back"]
    choice = pick("Build Service", options)
    if choice < len(SERVICES):
        build_service(SERVICES[choice][1])

def menu_service_control(action="start"):
    options = [label for label, _ in SERVICES] + ["Back"]
    choice = pick(f"{action.capitalize()} Service", options)
    if choice < len(SERVICES):
        if action == "start": start_service(SERVICES[choice][1])
        else: stop_service(SERVICES[choice][1])

def update_env_variable(file_path, key):
    clear_screen()
    print_header(f"Updating: {key}")
    new_val = input(f"Enter new value for {key} (Leave empty to cancel): ").strip()
    if not new_val: return

    lines = []
    if os.path.exists(file_path):
        with open(file_path, 'r') as f:
            lines = f.readlines()

    found = False
    new_lines = []
    for line in lines:
        if line.startswith(f"{key}="):
            new_lines.append(f"{key}={new_val}\n")
            found = True
        else: new_lines.append(line)

    if not found:
        new_lines.append(f"{key}={new_val}\n")

    with open(file_path, 'w') as f:
        f.writelines(new_lines)
    print(f"\n[+] {key} updated in {file_path}")
    input("\nPress Enter to continue...")

def menu_configure_secrets():
    root_vars = [
        "OPENROUTER_API_KEY", "JWT_SECRET", "POSTGRES_PASSWORD",
        "GRAFANA_ADMIN_PASSWORD", "OPENROUTER_MODEL"
    ]
    frontend_vars = [
        "VITE_API_URL", "VITE_IA_URL", "VITE_GMAIL_URL", "VITE_DOC_URL",
        "VITE_EXCEL_URL", "VITE_CODE_URL", "VITE_MINI_MAPS_URL"
    ]
    ia_vars = [
        "OPENROUTER_API_KEY", "TOKEN_VAULT_URL"
    ]
    
    while True:
        options = [
            "Update Root .env (OpenRouter, JWT, etc.)",
            "Update Frontend .env",
            "Update IA-service .env",
            "Back"
        ]
        choice = pick("Configure Secrets", options)
        if choice == 3: break
        
        if choice == 0:
            path = ".env"
            vars_list = root_vars
        elif choice == 1:
            path = os.path.join("frontend", ".env")
            vars_list = frontend_vars
        else:
            path = os.path.join("IA-service", ".env")
            vars_list = ia_vars
        
        var_choice = pick(f"Select variable in {path}", vars_list + ["Back"])
        if var_choice == len(vars_list):
            continue
        
        key = vars_list[var_choice]
        update_env_variable(path, key)

def main_loop():
    check_or_create_env_file()
    check_or_create_frontend_env()
    check_or_create_ia_env()
    
    options = [
        "Start All Services",
        "Stop All Services",
        "Build Single Service",
        "Start Single Service",
        "Stop Single Service",
        "Configure Secrets (.env)",
        "Show Service URLs",
        "Exit"
    ]

    while True:
        choice = pick("Orbit Service Manager (Interactive TUI)", options)
        
        if choice == 0: start_all_services()
        elif choice == 1: stop_all_services()
        elif choice == 2: menu_build_service()
        elif choice == 3: menu_service_control("start")
        elif choice == 4: menu_service_control("stop")
        elif choice == 5: menu_configure_secrets()
        elif choice == 6:
            clear_screen()
            print_header("Service URLs")
            print("- Frontend: http://localhost:12000")
            print("- Auth API: http://localhost:12001")
            print("- IA Docs:   http://localhost:12002/docs")
            print("- Gmail API: http://localhost:12003")
            input("\nPress Enter to continue...")
        elif choice == 7:
            print("Goodbye!")
            break

if __name__ == "__main__":
    main_loop()
