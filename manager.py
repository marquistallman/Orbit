import subprocess
import tkinter as tk
from tkinter import messagebox
import webbrowser
import os
import secrets

def check_or_create_env_file():
    """Checks for a .env file and creates it with secure defaults if not found."""
    if not os.path.exists('.env'):
        messagebox.showinfo("Setup", "'.env' file not found. Creating a new one with secure defaults.")
        
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
            f.write(f"\n# OAuth2 Credentials\n")
            f.write(f"GOOGLE_CLIENT_ID=placeholder\n")
            f.write(f"GOOGLE_CLIENT_SECRET=placeholder\n")
            f.write(f"GITHUB_CLIENT_ID=placeholder\n")
            f.write(f"GITHUB_CLIENT_SECRET=placeholder\n")
            f.write(f"FACEBOOK_CLIENT_ID=placeholder\n")
            f.write(f"FACEBOOK_CLIENT_SECRET=placeholder\n")
            f.write(f"LINKEDIN_CLIENT_ID=placeholder\n")
            f.write(f"LINKEDIN_CLIENT_SECRET=placeholder\n")
        
        messagebox.showinfo("Success", "A new '.env' file has been created. Please DO NOT commit this file to version control.")
    else:
        # Fix existing .env file if it has empty OAuth credentials
        fix_empty_oauth_credentials()

def check_or_create_frontend_env():
    """Checks for frontend/.env and creates it if not found, and adds it to .gitignore."""
    frontend_dir = "frontend"
    env_path = os.path.join(frontend_dir, ".env")
    
    if os.path.exists(frontend_dir):
        if not os.path.exists(env_path):
            with open(env_path, "w") as f:
                f.write("VITE_API_URL=http://localhost:8080\n")
                f.write("VITE_IA_URL=http://localhost:5000\n")
            print(f"Created {env_path} with default values.")
        
        # Ensure ignored in root .gitignore
        add_to_gitignore("frontend/.env")
    else:
        print("Warning: frontend directory not found.")

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
            print("Fixed empty OAuth credentials in .env file.")
            
    except Exception as e:
        print(f"Warning: Could not check/fix .env file: {e}")
 
def run_command(command):
    """Runs a command and shows the status in a message box."""
    try:
        # Using shell=True for simplicity with docker-compose commands
        # In a real-world app, you might want to split the command into a list
        process = subprocess.Popen(command, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        stdout, stderr = process.communicate()
        if process.returncode == 0:
            messagebox.showinfo("Success", f"Command executed successfully:\n{command}")
        else:
            messagebox.showerror("Error", f"An error occurred:\n{stderr}")
    except FileNotFoundError:
        messagebox.showerror("Error", "Command not found. Please ensure Docker is installed and in your PATH.")
    except Exception as e:
        messagebox.showerror("Error", f"An unexpected error occurred:\n{e}")

def start_service(service_name):
    """Starts a specific service using docker-compose."""
    command = f"docker-compose up -d --build {service_name}"
    run_command(command)

def stop_service(service_name):
    """Stops a specific service using docker-compose."""
    command = f"docker-compose stop {service_name}"
    run_command(command)

def start_all_services():
    """Starts all services using docker-compose."""
    command = "docker-compose up -d --build"
    run_command(command)
    
def stop_all_services():
    """Stops all running services."""
    command = "docker-compose down"
    run_command(command)

def open_url(url):
    """Opens the given URL in the default web browser."""
    webbrowser.open(url)

def open_secrets_manager():
    """Opens a window to update secrets in .env without revealing existing values."""
    editor = tk.Toplevel()
    editor.title("Manage Environment Secrets")
    editor.geometry("600x650")

    tk.Label(editor, text="Update Secrets (Leave empty to keep current value)", font=("Helvetica", 10, "bold")).pack(pady=10)
    
    # Define sections: (Title, Fields [(Label, Key, ShowChar)], FilePath)
    sections = [
        ("Backend / Root .env", [
            ("Google Client ID", "GOOGLE_CLIENT_ID", "*"),
            ("Google Secret", "GOOGLE_CLIENT_SECRET", "*"),
            ("GitHub Client ID", "GITHUB_CLIENT_ID", "*"),
            ("GitHub Secret", "GITHUB_CLIENT_SECRET", "*"),
            ("Facebook Client ID", "FACEBOOK_CLIENT_ID", "*"),
            ("Facebook Secret", "FACEBOOK_CLIENT_SECRET", "*"),
            ("LinkedIn Client ID", "LINKEDIN_CLIENT_ID", "*"),
            ("LinkedIn Secret", "LINKEDIN_CLIENT_SECRET", "*"),
            ("JWT Secret", "JWT_SECRET", "*")
        ], ".env"),
        ("Frontend / frontend/.env", [
            ("VITE API URL (Auth)", "VITE_API_URL", ""),
            ("VITE IA URL (Agent)", "VITE_IA_URL", "")
        ], os.path.join("frontend", ".env"))
    ]
    
    entries_map = {} # Maps key -> (EntryWidget, FilePath)
    form_frame = tk.Frame(editor)
    form_frame.pack(padx=10, pady=5, fill="both", expand=True)
    
    current_row = 0
    for section_title, fields, file_path in sections:
        tk.Label(form_frame, text=section_title, font=("Helvetica", 9, "bold", "underline"), fg="#C6A15B").grid(row=current_row, column=0, columnspan=2, pady=(15, 5), sticky="w")
        current_row += 1
        
        for label, key, show_char in fields:
            tk.Label(form_frame, text=label).grid(row=current_row, column=0, sticky="e", padx=5, pady=2)
            entry = tk.Entry(form_frame, width=45, show=show_char) 
            entry.grid(row=current_row, column=1, padx=5, pady=2)
            entries_map[key] = (entry, file_path)
            current_row += 1

    def update_file(filename, updates):
        if not os.path.exists(filename): return
        
        with open(filename, 'r') as f:
            lines = f.readlines()
        
        new_lines = []
        for line in lines:
            parts = line.split('=', 1)
            if parts:
                key = parts[0].strip()
                if key in updates:
                    new_lines.append(f"{key}={updates[key]}\n")
                    del updates[key] # Mark as processed
                    continue
            new_lines.append(line)
            
        with open(filename, 'w') as f:
            f.writelines(new_lines)

    def save_changes():
        # Group updates by file
        updates_by_file = {}
        for key, (entry, file_path) in entries_map.items():
            val =QH = entry.get().strip()
            if val:
                if file_path not in updates_by_file: updates_by_file[file_path] = {}
                updates_by_file[file_path][key] = val
        
        for fpath, updates in updates_by_file.items():
            update_file(fpath, updates)
            
        messagebox.showinfo("Success", "Secrets updated successfully.")
        editor.destroy()
        
    tk.Button(editor, text="Save Updates", command=save_changes, bg="#4CAF50", fg="white").pack(pady=20)

def create_gui():
    """Creates the main GUI window."""
    root = tk.Tk()
    root.title("Orbit Service Manager")

    # Ensure .env file exists before doing anything else
    check_or_create_env_file()
    check_or_create_frontend_env()

    frame = tk.Frame(root, padx=10, pady=10)
    frame.pack(padx=10, pady=10)

    title_label = tk.Label(frame, text="Orbit Service Manager", font=("Helvetica", 16))
    title_label.pack(pady=(0, 10))

    # --- Start buttons ---
    start_all_button = tk.Button(frame, text="Start All Services", command=start_all_services, width=25)
    start_all_button.pack(pady=5)

    # --- Configuration ---
    config_button = tk.Button(frame, text="Configure Secrets (.env)", command=open_secrets_manager, width=25)
    config_button.pack(pady=5)
    
    # --- Individual Service Controls ---
    services = [("Auth Service", "auth-service"), ("IA Service", "ia-service"), ("Gmail Service", "gmail-service"), ("Frontend", "frontend")]
    
    for label, service in services:
        row_frame = tk.Frame(frame)
        row_frame.pack(pady=2)
        tk.Label(row_frame, text=label, width=12, anchor="e").pack(side=tk.LEFT, padx=5)
        tk.Button(row_frame, text="Start", command=lambda s=service: start_service(s), width=8, bg="#E8F5E9").pack(side=tk.LEFT, padx=2)
        tk.Button(row_frame, text="Stop", command=lambda s=service: stop_service(s), width=8, bg="#FFEBEE").pack(side=tk.LEFT, padx=2)
    
    # --- Access buttons ---
    tk.Label(frame, text="Access Services", font=("Helvetica", 11, "bold")).pack(pady=(15, 5))

    # Puertos estandar: Vite (5173), SpringBoot (8080), FastAPI (8000)
    btn_open_front = tk.Button(frame, text="Open Frontend (Localhost)", command=lambda: open_url("http://localhost:5173"), width=25)
    btn_open_front.pack(pady=2)

    btn_open_auth = tk.Button(frame, text="Open Auth API", command=lambda: open_url("http://localhost:8080"), width=25)
    btn_open_auth.pack(pady=2)

    btn_open_ia = tk.Button(frame, text="Open IA Docs", command=lambda: open_url("http://localhost:5000/docs"), width=25)
    btn_open_ia.pack(pady=2)

    btn_open_gmail = tk.Button(frame, text="Open Gmail API", command=lambda: open_url("http://localhost:8082"), width=25)
    btn_open_gmail.pack(pady=2)

    # --- Stop button ---
    stop_button = tk.Button(frame, text="Stop All Services", command=stop_all_services, bg="red", fg="white", width=25)
    stop_button.pack(pady=(10, 5))


    root.mainloop()

if __name__ == "__main__":
    create_gui()
