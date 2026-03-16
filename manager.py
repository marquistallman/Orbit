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
            f.write(f"GOOGLE_CLIENT_ID=\n")
            f.write(f"GOOGLE_CLIENT_SECRET=\n")
            f.write(f"GITHUB_CLIENT_ID=\n")
            f.write(f"GITHUB_CLIENT_SECRET=\n")
            f.write(f"FACEBOOK_CLIENT_ID=\n")
            f.write(f"FACEBOOK_CLIENT_SECRET=\n")
            f.write(f"LINKEDIN_CLIENT_ID=\n")
            f.write(f"LINKEDIN_CLIENT_SECRET=\n")
        
        messagebox.showinfo("Success", "A new '.env' file has been created. Please DO NOT commit this file to version control.")
 
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
    editor.geometry("500x400")

    tk.Label(editor, text="Update Secrets (Leave empty to keep current value)", font=("Helvetica", 10, "bold")).pack(pady=10)
    
    fields = [
        ("Google Client ID", "GOOGLE_CLIENT_ID"),
        ("Google Secret", "GOOGLE_CLIENT_SECRET"),
        ("GitHub Client ID", "GITHUB_CLIENT_ID"),
        ("GitHub Secret", "GITHUB_CLIENT_SECRET"),
        ("Facebook Client ID", "FACEBOOK_CLIENT_ID"),
        ("Facebook Secret", "FACEBOOK_CLIENT_SECRET"),
        ("LinkedIn Client ID", "LINKEDIN_CLIENT_ID"),
        ("LinkedIn Secret", "LINKEDIN_CLIENT_SECRET"),
        ("JWT Secret", "JWT_SECRET")
    ]
    
    entries = {}
    form_frame = tk.Frame(editor)
    form_frame.pack(padx=10, pady=5)
    
    for idx, (label, key) in enumerate(fields):
        tk.Label(form_frame, text=label).grid(row=idx, column=0, sticky="e", padx=5, pady=2)
        # show="*" hides the input
        entry = tk.Entry(form_frame, width=35, show="*") 
        entry.grid(row=idx, column=1, padx=5, pady=2)
        entries[key] = entry
        
    def save_changes():
        if not os.path.exists('.env'):
            messagebox.showerror("Error", ".env file not found!")
            return
            
        # Read existing file
        with open('.env', 'r') as f:
            lines = f.readlines()
            
        new_lines = []
        updates = {k: v.get() for k, v in entries.items() if v.get()}
        
        for line in lines:
            key = line.split('=')[0].strip()
            if key in updates:
                new_lines.append(f"{key}={updates[key]}\n")
                del updates[key] # Mark as processed
            else:
                new_lines.append(line)
                
        with open('.env', 'w') as f:
            f.writelines(new_lines)
            
        messagebox.showinfo("Success", "Secrets updated successfully.")
        editor.destroy()
        
    tk.Button(editor, text="Save Updates", command=save_changes, bg="#4CAF50", fg="white").pack(pady=20)

def create_gui():
    """Creates the main GUI window."""
    root = tk.Tk()
    root.title("Orbit Service Manager")

    # Ensure .env file exists before doing anything else
    check_or_create_env_file()

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
    
    start_auth_button = tk.Button(frame, text="Start Auth Service", command=lambda: start_service("auth-service"), width=25)
    start_auth_button.pack(pady=5)

    start_ia_button = tk.Button(frame, text="Start IA Service", command=lambda: start_service("ia-service"), width=25)
    start_ia_button.pack(pady=5)

    start_frontend_button = tk.Button(frame, text="Start Frontend", command=lambda: start_service("frontend"), width=25)
    start_frontend_button.pack(pady=5)
    
    # --- Access buttons ---
    tk.Label(frame, text="Access Services", font=("Helvetica", 11, "bold")).pack(pady=(15, 5))

    # Puertos estandar: Vite (5173), SpringBoot (8080), FastAPI (8000)
    btn_open_front = tk.Button(frame, text="Open Frontend (Localhost)", command=lambda: open_url("http://localhost:5173"), width=25)
    btn_open_front.pack(pady=2)

    btn_open_auth = tk.Button(frame, text="Open Auth API", command=lambda: open_url("http://localhost:8080"), width=25)
    btn_open_auth.pack(pady=2)

    btn_open_ia = tk.Button(frame, text="Open IA Docs", command=lambda: open_url("http://localhost:5000/docs"), width=25)
    btn_open_ia.pack(pady=2)

    # --- Stop button ---
    stop_button = tk.Button(frame, text="Stop All Services", command=stop_all_services, bg="red", fg="white", width=25)
    stop_button.pack(pady=(10, 5))


    root.mainloop()

if __name__ == "__main__":
    create_gui()
