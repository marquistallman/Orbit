#!/usr/bin/env python3
import argparse
import os
import platform
import shlex
import shutil
import socket
import subprocess
import sys
import time
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent
ENV_FILES = [ROOT / '.env', ROOT / '.env.local', ROOT / 'frontend' / '.env', ROOT / 'IA-service' / '.env']
SERVICE_PORT_VARS = {
    'auth': 'AUTH_PORT',
    'ia': 'IA_PORT',
    'gmail': 'GMAIL_PORT',
    'doc': 'DOC_PORT',
    'excel': 'EXCEL_PORT',
    'code': 'CODE_PORT',
    'mini_maps': 'MINI_MAPS_PORT',
    'frontend': 'FRONTEND_PORT',
}
DEFAULT_PORTS = {
    'auth': 8081,
    'ia': 5000,
    'gmail': 8082,
    'doc': 9002,
    'excel': 9004,
    'code': 9003,
    'mini_maps': 9005,
    'frontend': 5173,
}
INFRA_PORTS = {
    5432: 'Postgres',
    6379: 'Redis',
    9090: 'Prometheus',
    3000: 'Grafana',
}
PORT_ENV_BLACKLIST = {
    'PORT',
    'SERVER_PORT',
    'SPRING_PORT',
    'VITE_PORT',
    'IA_PORT',
    'GMAIL_PORT',
    'CODE_PORT',
    'DOC_PORT',
    'EXCEL_PORT',
    'MINI_MAPS_PORT',
}
DOCKER_INFRA = ['postgres', 'redis', 'prometheus', 'grafana']

try:
    from rich.console import Console
    from rich.prompt import Prompt
    from rich.progress import Progress, SpinnerColumn, TextColumn
    from rich.table import Table
except ImportError:
    Console = None
    Prompt = None
    Progress = None
    Table = None

console = Console() if Console else None

SERVICE_DEFINITIONS = [
    {
        'id': 'auth',
        'name': 'Auth Service',
        'cwd': ROOT / 'auth-service',
        'ports': lambda: [int(os.environ.get('AUTH_PORT', '8081'))],
        'command': lambda: get_auth_command(),
        'health': lambda: f'http://127.0.0.1:{os.environ.get("AUTH_PORT", "8081")}/actuator/health',
    },
    {
        'id': 'ia',
        'name': 'IA Service',
        'cwd': ROOT / 'IA-service',
        'ports': lambda: [int(os.environ.get('IA_PORT', '5000'))],
        'command': lambda: [sys.executable, '-m', 'uvicorn', 'main:app', '--host', '0.0.0.0', '--port', os.environ.get('IA_PORT', '5000')],
        'health': lambda: f'http://127.0.0.1:{os.environ.get("IA_PORT", "5000")}/health',
    },
    {
        'id': 'gmail',
        'name': 'Gmail Service',
        'cwd': ROOT / 'Gmail-service',
        'ports': lambda: [int(os.environ.get('GMAIL_PORT', '8082'))],
        'command': lambda: ['go', 'run', '.'],
        'health': lambda: f'http://127.0.0.1:{os.environ.get("GMAIL_PORT", "8082")}',
    },
    {
        'id': 'doc',
        'name': 'Doc Service',
        'cwd': ROOT / 'IA-service' / 'service' / 'doc-service',
        'ports': lambda: [int(os.environ.get('DOC_PORT', '9002'))],
        'command': lambda: [sys.executable, '-m', 'uvicorn', 'main:app', '--host', '0.0.0.0', '--port', os.environ.get('DOC_PORT', '9002')],
        'health': lambda: f'http://127.0.0.1:{os.environ.get("DOC_PORT", "9002")}',
    },
    {
        'id': 'excel',
        'name': 'Excel Service',
        'cwd': ROOT / 'IA-service' / 'service' / 'excel-service',
        'ports': lambda: [int(os.environ.get('EXCEL_PORT', '9004'))],
        'command': lambda: [sys.executable, '-m', 'uvicorn', 'main:app', '--host', '0.0.0.0', '--port', os.environ.get('EXCEL_PORT', '9004')],
        'health': lambda: f'http://127.0.0.1:{os.environ.get("EXCEL_PORT", "9004")}',
    },
    {
        'id': 'code',
        'name': 'Code Service',
        'cwd': ROOT / 'IA-service' / 'service' / 'code-service',
        'ports': lambda: [int(os.environ.get('CODE_PORT', '9003'))],
        'command': lambda: [sys.executable, '-m', 'uvicorn', 'main:app', '--host', '0.0.0.0', '--port', os.environ.get('CODE_PORT', '9003')],
        'health': lambda: f'http://127.0.0.1:{os.environ.get("CODE_PORT", "9003")}',
    },
    {
        'id': 'mini_maps',
        'name': 'Mini Maps Service',
        'cwd': ROOT / 'IA-service' / 'service' / 'mini-maps-service',
        'ports': lambda: [int(os.environ.get('MINI_MAPS_PORT', '9005'))],
        'command': lambda: [sys.executable, '-m', 'uvicorn', 'main:app', '--host', '0.0.0.0', '--port', os.environ.get('MINI_MAPS_PORT', '9005')],
        'health': lambda: f'http://127.0.0.1:{os.environ.get("MINI_MAPS_PORT", "9005")}',
    },
    {
        'id': 'frontend',
        'name': 'Frontend',
        'cwd': ROOT / 'frontend',
        'ports': lambda: [int(os.environ.get('FRONTEND_PORT', '5173'))],
        'command': lambda: ['npm', 'run', 'dev', '--', '--host', '0.0.0.0', '--port', os.environ.get('FRONTEND_PORT', '5173')],
        'health': lambda: f'http://127.0.0.1:{os.environ.get("FRONTEND_PORT", "5173")}',
    },
]


def get_auth_command():
    port = os.environ.get('AUTH_PORT', '8081')
    if platform.system() == 'Windows':
        return ['mvnw.cmd', 'spring-boot:run', f'-Dserver.port={port}']
    return ['./mvnw', 'spring-boot:run', f'-Dserver.port={port}']


def command_exists(name):
    return shutil.which(name) is not None


def docker_compose_program():
    if command_exists('docker-compose'):
        return ['docker-compose']
    if command_exists('docker'):
        return ['docker', 'compose']
    return None


def sanitize_env(env):
    for key in list(env.keys()):
        upper_key = key.upper()
        if upper_key in PORT_ENV_BLACKLIST or upper_key.endswith('_PORT'):
            del env[key]
    return env


def load_env_file(path):
    env = {}
    if not path.exists():
        return env
    for raw in path.read_text(encoding='utf-8').splitlines():
        line = raw.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        key, value = line.split('=', 1)
        env[key.strip()] = value.strip()
    return env


def find_free_port(start_port=8000):
    port = start_port
    while True:
        if not is_port_in_use(port):
            return port
        port += 1


def assign_ports():
    for service, var in SERVICE_PORT_VARS.items():
        if var not in os.environ:
            default = DEFAULT_PORTS[service]
            free_port = find_free_port(default)
            os.environ[var] = str(free_port)


def merged_env():
    env = os.environ.copy()
    for path in ENV_FILES:
        env.update(load_env_file(path))
    return sanitize_env(env)


def is_port_in_use(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(0.4)
        return sock.connect_ex(('127.0.0.1', port)) == 0


def list_port_conflicts():
    conflicts = []
    for var in SERVICE_PORT_VARS.values():
        port_str = os.environ.get(var)
        if port_str:
            try:
                port = int(port_str)
                if is_port_in_use(port):
                    conflicts.append(port)
            except ValueError:
                pass
    return conflicts


def ensure_env_files():
    assign_ports()  # Assign free ports if not set
    root_env = ROOT / '.env'
    local_env = ROOT / '.env.local'
    frontend_env = ROOT / 'frontend' / '.env'
    ia_env = ROOT / 'IA-service' / '.env'

    if not root_env.exists():
        port_lines = '\n'.join(f'{var}={os.environ[var]}' for var in SERVICE_PORT_VARS.values() if var in os.environ)
        root_env.write_text(
            f'# Root Orbit environment defaults\n'
            f'{port_lines}\n'
            'POSTGRES_USER=postgres\n'
            'POSTGRES_PASSWORD=postgres\n'
            'JWT_SECRET=change-me\n'
            'OPENROUTER_API_KEY=\n'
            'OPENROUTER_MODEL=openai/gpt-4o-mini\n'
            f'OPENROUTER_SITE_URL=http://localhost:{os.environ.get("FRONTEND_PORT", "5173")}\n'
            'OPENROUTER_APP_NAME=Orbit\n'
            f'CORS_ALLOWED_ORIGINS=http://localhost:{os.environ.get("FRONTEND_PORT", "5173")}\n'
            'CORS_ALLOW_CREDENTIALS=true\n'
            'HTTP_TIMEOUT_SECONDS=20\n'
            'MEMORY_DB_PATH=/data/agent_memory.db\n'
            'USAGE_DB_PATH=/data/usage.db\n'
            'DEFAULT_PLAN=free\n'
            'ALLOW_ANONYMOUS_USER=true\n'
            'PLAN_ADMIN_API_KEY=change-me-plan-admin-key\n'
            f'GMAIL_SERVICE_URL=http://localhost:{os.environ.get("GMAIL_PORT", "8082")}\n'
            'TOKEN_VAULT_URL=http://localhost:8080\n'
            f'DOC_SERVICE_URL=http://localhost:{os.environ.get("DOC_PORT", "9002")}\n'
            f'CODE_SERVICE_URL=http://localhost:{os.environ.get("CODE_PORT", "9003")}\n'
            f'EXCEL_SERVICE_URL=http://localhost:{os.environ.get("EXCEL_PORT", "9004")}\n'
            f'MINI_MAPS_SERVICE_URL=http://localhost:{os.environ.get("MINI_MAPS_PORT", "9005")}\n'
            'CODE_EXEC_TIMEOUT_SECONDS=5\n'
            'CODE_MAX_CHARS=12000\n'
            'CODE_MAX_OUTPUT_CHARS=4000\n'
            'CODE_MAX_MEMORY_MB=128\n'
            'CODE_MAX_STDIN_CHARS=4000\n'
            'CODE_MAX_SQL_RESULT_ROWS=200\n'
            'CODE_MAX_SQL_STATEMENTS=30\n'
            'CODE_STRICT_MODE=true\n'
            'CODE_PYTHON_ALLOWED_IMPORTS=math,statistics,decimal,datetime,time,json,csv,sqlite3,collections,itertools,functools,fractions,random,re,typing,pathlib,openpyxl\n'
            'CODE_JS_ALLOWED_MODULES=\n'
            'CODE_PYTHON_BLOCK_PATTERNS=\n'
            'CODE_JS_BLOCK_PATTERNS=\n'
            'CODE_SQL_BLOCK_PATTERNS=\n'
            'CODE_SNIPPETS_DB_PATH=/data/snippets.db\n'
            'CONNECTOR_DELIVERY_ENABLED=false\n'
            'DELIVERY_API_URL=\n'
            'DELIVERY_API_KEY=\n'
            'CONNECTOR_WHATSAPP_ENABLED=false\n'
            'WHATSAPP_PROVIDER=\n'
            'WHATSAPP_API_URL=\n'
            'WHATSAPP_ACCESS_TOKEN=\n'
            'WHATSAPP_PHONE_NUMBER_ID=\n'
            'CONNECTOR_TELEGRAM_ENABLED=false\n'
            'TELEGRAM_BOT_TOKEN=\n'
            'TELEGRAM_API_URL=https://api.telegram.org\n'
            'TELEGRAM_API_ID=\n'
            'TELEGRAM_API_HASH=\n'
            'TELEGRAM_SESSION_DB_PATH=/data/telegram_sessions.db\n'
            'CONNECTOR_RESERVATIONS_ENABLED=false\n'
            'RESERVATIONS_API_URL=\n'
            'RESERVATIONS_API_KEY=\n'
            'CONNECTOR_TRANSPORT_ENABLED=false\n'
            'PUBLIC_TRANSPORT_API_URL=\n'
            'PUBLIC_TRANSPORT_API_KEY=\n'
            'CONNECTOR_BROKER_ENABLED=false\n'
            'BROKER_API_URL=\n'
            'BROKER_API_KEY=\n'
            'BROKER_API_SECRET=\n'
            'CONNECTOR_BANK_ENABLED=false\n'
            'BANK_API_URL=\n'
            'BANK_API_KEY=\n'
            'BANK_API_SECRET=\n'
            'GOOGLE_CLIENT_ID=placeholder\n'
            'GOOGLE_CLIENT_SECRET=placeholder\n'
            'GITHUB_CLIENT_ID=placeholder\n'
            'GITHUB_CLIENT_SECRET=placeholder\n'
            'FACEBOOK_CLIENT_ID=placeholder\n'
            'FACEBOOK_CLIENT_SECRET=placeholder\n'
            'LINKEDIN_CLIENT_ID=placeholder\n'
            'LINKEDIN_CLIENT_SECRET=placeholder\n'
            f'APP_FRONTEND_URL=http://localhost:{os.environ.get("FRONTEND_PORT", "5173")}\n'
            'CLOUDFLARE_TUNNEL_HOSTNAME=\n'
            f'CORS_ALLOWED_ORIGINS=http://localhost:{os.environ.get("FRONTEND_PORT", "5173")}\n'
            'GRAFANA_ADMIN_PASSWORD=change-me\n'
            'SPRING_JPA_DDL_AUTO=update\n',
            encoding='utf-8',
        )
        if console:
            console.print('[green]Created root .env default file.[/green]')

    if not local_env.exists():
        local_env.write_text('# Local overrides for sensitive values. Do not commit.\n', encoding='utf-8')
        if console:
            console.print('[green]Created .env.local placeholder file.[/green]')


def config_env():
    """Interactive environment configuration."""
    env = merged_env()
    local_env_path = ROOT / '.env.local'
    frontend_env = ROOT / 'frontend' / '.env'
    ia_env = ROOT / 'IA-service' / '.env'

    if console:
        console.print('[bold blue]Orbit Environment Configuration[/bold blue]')
        console.print('Configure your environment variables interactively.\n')

    # Load existing .env.local if exists
    local_env = load_env_file(local_env_path)

    # Critical vars to configure
    config_vars = [
        ('POSTGRES_USER', 'PostgreSQL username', 'postgres'),
        ('POSTGRES_PASSWORD', 'PostgreSQL password', 'postgres'),
        ('JWT_SECRET', 'JWT secret key (generate with openssl rand -hex 64)', 'change-me'),
        ('GOOGLE_CLIENT_ID', 'Google OAuth Client ID', 'placeholder'),
        ('GOOGLE_CLIENT_SECRET', 'Google OAuth Client Secret', 'placeholder'),
        ('OPENROUTER_API_KEY', 'OpenRouter API Key', ''),
        ('TELEGRAM_API_ID', 'Telegram API ID', ''),
        ('TELEGRAM_API_HASH', 'Telegram API Hash', ''),
        ('APP_FRONTEND_URL', 'Frontend public URL', f'http://localhost:{os.environ.get("FRONTEND_PORT", "5173")}'),
        ('CLOUDFLARE_TUNNEL_HOSTNAME', 'Cloudflare tunnel hostname (optional)', ''),
        ('GRAFANA_ADMIN_PASSWORD', 'Grafana admin password', 'change-me'),
    ]

    for var, desc, default in config_vars:
        current = local_env.get(var, env.get(var, default))
        if Prompt:
            new_value = Prompt.ask(f'{desc} [{var}]', default=current)
        else:
            new_value = input(f'{desc} [{var}] (current: {current}): ') or current
        local_env[var] = new_value

    # Write back to .env.local
    content = '# Local overrides for sensitive values. Do not commit.\n'
    for key, value in local_env.items():
        content += f'{key}={value}\n'

    local_env_path.write_text(content, encoding='utf-8')

    if console:
        console.print('[green]Configuration saved to .env.local[/green]')
    else:
        print('Configuration saved to .env.local')

    if not frontend_env.exists():
        frontend_env.write_text(
            'VITE_API_URL=http://localhost:8081\n'
            'VITE_IA_URL=http://localhost:5000\n'
            'VITE_GMAIL_URL=http://localhost:8082\n'
            'VITE_DOC_URL=http://localhost:9002\n'
            'VITE_EXCEL_URL=http://localhost:9004\n'
            'VITE_CODE_URL=http://localhost:9003\n'
            'VITE_MINI_MAPS_URL=http://localhost:9005\n'
            'VITE_DELIVERY_URL=\n'
            'VITE_RESERVATIONS_URL=\n'
            'VITE_TRANSPORT_URL=\n'
            'VITE_BROKER_URL=\n'
            'VITE_BANK_URL=\n'
            'VITE_TELEGRAM_URL=\n'
            'VITE_WHATSAPP_URL=\n',
            encoding='utf-8',
        )
        if console:
            console.print('[green]Created frontend/.env default file.[/green]')

    if not ia_env.exists():
        ia_env.write_text('OPENROUTER_API_KEY=\nTOKEN_VAULT_URL=http://localhost:8080\n', encoding='utf-8')
        if console:
            console.print('[green]Created IA-service/.env default file.[/green]')


def run_command(args, cwd=None, env=None, capture_output=False):
    try:
        result = subprocess.run(
            args,
            cwd=str(cwd) if cwd else None,
            env=env,
            text=True,
            check=False,
            stdout=subprocess.PIPE if capture_output else None,
            stderr=subprocess.STDOUT if capture_output else None,
        )
        return result.returncode, result.stdout if capture_output else None
    except FileNotFoundError:
        return 127, None


def bootstrap_python():
    if not command_exists('pip') and not command_exists('pip3'):
        raise RuntimeError('pip is required to bootstrap Python packages')
    result, _ = run_command([sys.executable, '-m', 'pip', 'install', '--upgrade', 'pip'], capture_output=False)
    if result != 0:
        raise RuntimeError('Failed to upgrade pip')

    requirements = [
        ROOT / 'IA-service' / 'requirements.txt',
        ROOT / 'IA-service' / 'service' / 'doc-service' / 'requirements.txt',
        ROOT / 'IA-service' / 'service' / 'excel-service' / 'requirements.txt',
        ROOT / 'IA-service' / 'service' / 'code-service' / 'requirements.txt',
        ROOT / 'IA-service' / 'service' / 'mini-maps-service' / 'requirements.txt',
    ]
    for path in requirements:
        if path.exists():
            result, _ = run_command([sys.executable, '-m', 'pip', 'install', '-r', str(path)], capture_output=False)
            if result != 0:
                raise RuntimeError(f'Failed to install Python requirements from {path}')


def bootstrap_frontend():
    frontend_dir = ROOT / 'frontend'
    if not frontend_dir.exists():
        return
    if not command_exists('npm'):
        raise RuntimeError('npm is required for frontend dependencies')
    args = ['npm', 'ci'] if (frontend_dir / 'package-lock.json').exists() else ['npm', 'install']
    result, _ = run_command(args, cwd=frontend_dir, capture_output=False)
    if result != 0:
        raise RuntimeError('Failed to install frontend dependencies')


def bootstrap_gmail():
    gmail_dir = ROOT / 'Gmail-service'
    if not gmail_dir.exists():
        return
    if not command_exists('go'):
        raise RuntimeError('Go is required for Gmail service')
    result, _ = run_command(['go', 'mod', 'download'], cwd=gmail_dir, capture_output=False)
    if result != 0:
        raise RuntimeError('Failed to download Gmail Go modules')


def bootstrap_auth():
    auth_dir = ROOT / 'auth-service'
    if not auth_dir.exists():
        return
    mvnw_path = auth_dir / 'mvnw'
    if not mvnw_path.exists():
        raise RuntimeError('mvnw not found in auth-service directory')
    # Make mvnw executable
    if platform.system() != 'Windows':
        result, _ = run_command(['chmod', '+x', str(mvnw_path)], capture_output=True)
        if result != 0:
            raise RuntimeError('Failed to make mvnw executable')
    # Use mvnw directly
    result, _ = run_command(['./mvnw', '-q', '-B', '-DskipTests', 'dependency:resolve'], cwd=auth_dir, capture_output=False)
    if result != 0:
        raise RuntimeError('Failed to resolve auth-service Maven dependencies')


def install_package_candidates(cmd, candidates, manager_cmd):
    """Try installing a command using different package name candidates."""
    for pkg in candidates:
        if manager_cmd == 'apt':
            result, _ = run_command(['sudo', 'apt-get', 'install', '-y', pkg], capture_output=True)
        elif manager_cmd == 'yum':
            result, _ = run_command(['sudo', 'yum', 'install', '-y', pkg], capture_output=True)
        elif manager_cmd == 'brew':
            result, _ = run_command(['brew', 'install', pkg], capture_output=True)
        else:
            return False
        if result == 0 and command_exists(cmd):
            return True
    return False


def bootstrap_system():
    """Install system dependencies if possible."""
    system = platform.system()
    if system == 'Linux':
        # Prefer apt-get, fallback to apt then yum.
        pkg_manager = None
        if command_exists('apt-get'):
            pkg_manager = 'apt'
        elif command_exists('apt'):
            pkg_manager = 'apt'
        elif command_exists('yum'):
            pkg_manager = 'yum'

        if pkg_manager == 'apt':
            run_command(['sudo', 'apt-get', 'update'], capture_output=True)
            commands = {
                'python3': ['python3'],
                'pip3': ['python3-pip'],
                'java': ['openjdk-21-jdk', 'default-jdk'],
                'go': ['golang-go', 'golang'],
                'node': ['nodejs'],
                'npm': ['npm'],
                'tmux': ['tmux'],
                'psql': ['postgresql'],
                'redis-server': ['redis-server'],
                'prometheus': ['prometheus'],
                'grafana-server': ['grafana'],
            }
            for cmd, candidates in commands.items():
                if not command_exists(cmd):
                    installed = install_package_candidates(cmd, candidates, 'apt')
                    if not installed and console:
                        console.print(f'[yellow]Warning: Could not install {cmd} via apt. You may need to install it manually.[/yellow]')
        elif pkg_manager == 'yum':
            commands = {
                'python3': ['python3'],
                'pip3': ['python3-pip'],
                'java': ['java-21-openjdk'],
                'go': ['golang'],
                'node': ['nodejs'],
                'npm': ['npm'],
                'tmux': ['tmux'],
                'psql': ['postgresql-server'],
                'redis-server': ['redis'],
                'prometheus': ['prometheus'],
                'grafana-server': ['grafana'],
            }
            for cmd, candidates in commands.items():
                if not command_exists(cmd):
                    installed = install_package_candidates(cmd, candidates, 'yum')
                    if not installed and console:
                        console.print(f'[yellow]Warning: Could not install {cmd} via yum. You may need to install it manually.[/yellow]')
        else:
            if console:
                console.print('[yellow]Warning: No supported Linux package manager found (apt, apt-get, yum). Install dependencies manually.[/yellow]')
            else:
                print('Warning: No supported Linux package manager found (apt, apt-get, yum). Install dependencies manually.')

        # Fallback for Go if package manager did not install it.
        if not command_exists('go'):
            if command_exists('curl'):
                url = 'https://go.dev/dl/go1.25.10.linux-amd64.tar.gz'
                archive = '/tmp/go.tar.gz'
                run_command(['curl', '-L', '-o', archive, url], capture_output=True)
                run_command(['sudo', 'rm', '-rf', '/usr/local/go'], capture_output=True)
                run_command(['sudo', 'tar', '-C', '/usr/local', '-xzf', archive], capture_output=True)
                if console:
                    console.print('[green]Downloaded and installed Go fallback to /usr/local/go[/green]')
            elif console:
                console.print('[yellow]Warning: Go is still missing and curl is unavailable. Install Go manually.[/yellow]')
            else:
                print('Warning: Go is still missing and curl is unavailable. Install Go manually.')

    elif system == 'Darwin':
        if command_exists('brew'):
            packages = ['python3', 'openjdk@21', 'go', 'node', 'tmux', 'postgresql', 'redis', 'prometheus', 'grafana']
            for pkg in packages:
                result, _ = run_command(['brew', 'install', pkg], capture_output=True)
                if result != 0 and console:
                    console.print(f'[yellow]Warning: Could not install {pkg} via brew.[/yellow]')
        else:
            if console:
                console.print('[yellow]Warning: Homebrew not found. Install dependencies manually.[/yellow]')
            else:
                print('Warning: Homebrew not found. Install dependencies manually.')
    else:
        if console:
            console.print('[yellow]Warning: Unsupported OS for auto-install. Install dependencies manually.[/yellow]')
        else:
            print('Warning: Unsupported OS for auto-install. Install dependencies manually.')


def bootstrap():
    bootstrap_system()
    ensure_env_files()
    steps = [
        ('Python dependencies', bootstrap_python),
        ('Frontend dependencies', bootstrap_frontend),
        ('Gmail dependencies', bootstrap_gmail),
        ('Auth dependencies', bootstrap_auth),
    ]
    if Progress is None:
        for title, task in steps:
            print(f'{title}...')
            task()
        print('Bootstrap complete.')
        return
    with Progress(SpinnerColumn(), TextColumn('{task.description}')) as progress:
        for title, task in steps:
            task_id = progress.add_task(title, start=False)
            progress.start_task(task_id)
            task()
            progress.update(task_id, completed=100)
    if console:
        console.print('[green]Bootstrap complete. Run --config to set credentials.[/green]')
    else:
        print('Bootstrap complete.')


def run_docker_infra(action):
    program = docker_compose_program()
    if program is None:
        raise RuntimeError('Docker Compose is not available on this machine.')
    args = program + [action, '-d'] + DOCKER_INFRA if action == 'up' else program + [action]
    code, _ = run_command(args, cwd=ROOT, capture_output=False)
    if code != 0:
        raise RuntimeError(f'Docker Compose {action} failed')


def tmux_has_session():
    if not command_exists('tmux'):
        return False
    result, _ = run_command(['tmux', 'has-session', '-t', 'orbit'], capture_output=True)
    return result == 0


def start_service_in_tmux(name, command, cwd):
    if not command_exists('tmux'):
        raise RuntimeError('tmux is required to launch services in a terminal session.')
    shell_command = shlex.join(command)
    if not tmux_has_session():
        args = ['tmux', 'new-session', '-d', '-s', 'orbit', '-n', name, f'cd {shlex.quote(str(cwd))} && {shell_command}']
        code, _ = run_command(args, capture_output=False)
        if code != 0:
            raise RuntimeError(f'Failed to start tmux session for {name}')
        return
    args = ['tmux', 'new-window', '-d', '-t', 'orbit', '-n', name, f'cd {shlex.quote(str(cwd))} && {shell_command}']
    code, _ = run_command(args, capture_output=False)
    if code != 0:
        raise RuntimeError(f'Failed to start tmux window for {name}')


def start_service(service):
    for port in service['ports']():
        if is_port_in_use(port):
            raise RuntimeError(f"{service['name']} cannot start because port {port} is already in use.")
    env = merged_env()
    if command_exists('tmux'):
        start_service_in_tmux(service['name'], service['command'](), service['cwd'])
    else:
        print(f"[yellow]tmux not found; starting {service['name']} in the background.[/yellow]")
        subprocess.Popen(service['command'](), cwd=str(service['cwd']), env=env)


def stop_all_services():
    if not command_exists('tmux') or not tmux_has_session():
        print('No tmux session found.')
        return
    code, _ = run_command(['tmux', 'kill-session', '-t', 'orbit'], capture_output=False)
    if code != 0:
        raise RuntimeError('Failed to stop tmux session orbit')


def show_status():
    if not command_exists('tmux') or not tmux_has_session():
        print('No tmux session detected.')
        return
    code, output = run_command(['tmux', 'list-windows', '-t', 'orbit', '-F', '#{window_index}: #{window_name}'], capture_output=True)
    if code != 0 or not output:
        print('Unable to collect tmux status.')
        return
    if Table is None:
        print(output)
        return
    table = Table(show_header=True, header_style='bold green')
    table.add_column('Window')
    for line in output.strip().splitlines():
        table.add_row(line)
    if console:
        console.print(table)
    else:
        print(output)


def open_frontend():
    env = merged_env()
    hostname = env.get('CLOUDFLARE_TUNNEL_HOSTNAME', '').strip()
    if hostname:
        url = hostname if hostname.startswith(('http://', 'https://')) else f'https://{hostname}'
    else:
        url = env.get('APP_FRONTEND_URL', 'http://localhost:5173')
    webbrowser.open(url)
    if console:
        console.print(f'[green]Opening frontend at {url}[/green]')
    else:
        print(f'Opening frontend at {url}')


def start_cloudflare():
    if not command_exists('cloudflared'):
        raise RuntimeError('cloudflared is not installed.')
    env = merged_env()
    hostname = env.get('CLOUDFLARE_TUNNEL_HOSTNAME', '').strip()
    if not hostname:
        raise RuntimeError('Set CLOUDFLARE_TUNNEL_HOSTNAME in .env or .env.local to use Cloudflare tunnel.')
    if not command_exists('tmux'):
        raise RuntimeError('tmux is required to keep the tunnel running in the background.')
    cmd = ['cloudflared', 'tunnel', '--hostname', hostname, '--url', f'http://127.0.0.1:{os.environ.get("FRONTEND_PORT", "5173")}', '--no-autoupdate']
    start_service_in_tmux('cloudflare', cmd, ROOT)
    if console:
        console.print(f'[green]Cloudflare tunnel started at https://{hostname}[/green]')
    else:
        print(f'Cloudflare tunnel started at https://{hostname}')


def build_menu():
    if Prompt is None or Table is None:
        return None
    table = Table(title='Orbit Console Manager')
    table.add_column('Option', width=4)
    table.add_column('Action')
    table.add_row('1', 'Bootstrap dependencies')
    table.add_row('2', 'Start infrastructure (Postgres + Redis + metrics)')
    table.add_row('3', 'Start all services in tmux')
    table.add_row('4', 'Stop all services')
    table.add_row('5', 'Show tmux status')
    table.add_row('6', 'Open frontend in browser')
    table.add_row('7', 'Start Cloudflare tunnel')
    table.add_row('8', 'Exit')
    return table


def interactive_menu():
    if Prompt is None:
        print('Interactive rich prompt unavailable. Use command line flags instead.')
        return
    while True:
        if console:
            console.rule('[bold cyan]Orbit Console Manager[/bold cyan]')
            console.print(build_menu())
        else:
            print('Orbit Console Manager')
            print('1) Bootstrap dependencies')
            print('2) Start infrastructure (Postgres + Redis + metrics)')
            print('3) Start all services in tmux')
            print('4) Stop all services')
            print('5) Show tmux status')
            print('6) Open frontend in browser')
            print('7) Start Cloudflare tunnel')
            print('8) Exit')
        if Prompt:
            choice = Prompt.ask('Select an option', choices=[str(i) for i in range(1, 9)])
        else:
            choice = input('Select an option [1-8]: ').strip()
        try:
            if choice == '1':
                bootstrap()
            elif choice == '2':
                run_docker_infra('up')
            elif choice == '3':
                conflicts = list_port_conflicts()
                if conflicts:
                    raise RuntimeError(f'Busy ports detected: {conflicts}')
                ensure_env_files()
                for service in SERVICE_DEFINITIONS:
                    start_service(service)
                print('All app services have been launched.')
            elif choice == '4':
                stop_all_services()
            elif choice == '5':
                show_status()
            elif choice == '6':
                open_frontend()
            elif choice == '7':
                start_cloudflare()
            else:
                break
        except Exception as error:
            if console:
                console.print(f'[red]Error:[/red] {error}')
            else:
                print('Error:', error)
        time.sleep(0.2)


def main():
    parser = argparse.ArgumentParser(description='Orbit console manager')
    parser.add_argument('--bootstrap', action='store_true', help='Install system dependencies, Python packages, and prepare environment files')
    parser.add_argument('--config', action='store_true', help='Interactive environment configuration')
    parser.add_argument('--start-infra', action='store_true', help='Start infra containers for Postgres, Redis, metrics')
    parser.add_argument('--stop-infra', action='store_true', help='Stop infra containers')
    parser.add_argument('--start', action='store_true', help='Start all app services in tmux')
    parser.add_argument('--stop', action='store_true', help='Stop all app services')
    parser.add_argument('--status', action='store_true', help='Show service status')
    parser.add_argument('--open', action='store_true', help='Open frontend URL in browser')
    parser.add_argument('--cloudflare', action='store_true', help='Start Cloudflare tunnel for the frontend')
    args = parser.parse_args()

    try:
        if args.bootstrap:
            bootstrap()
            return
        if args.config:
            config_env()
            return
        if args.start_infra:
            run_docker_infra('up')
            return
        if args.stop_infra:
            run_docker_infra('down')
            return
        if args.start:
            conflicts = list_port_conflicts()
            if conflicts:
                raise SystemExit(f'Busy ports detected: {conflicts}')
            ensure_env_files()
            for service in SERVICE_DEFINITIONS:
                start_service(service)
            return
        if args.stop:
            stop_all_services()
            return
        if args.status:
            show_status()
            return
        if args.open:
            open_frontend()
            return
        if args.cloudflare:
            start_cloudflare()
            return
        interactive_menu()
    except Exception as exc:
        if console:
            console.print(f'[red]Error:[/red] {exc}')
        else:
            print('Error:', exc)
        sys.exit(1)


if __name__ == '__main__':
    main()
