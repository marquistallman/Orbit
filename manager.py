import subprocess
import tkinter as tk
from tkinter import messagebox
import webbrowser

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

def create_gui():
    """Creates the main GUI window."""
    root = tk.Tk()
    root.title("Orbit Service Manager")

    frame = tk.Frame(root, padx=10, pady=10)
    frame.pack(padx=10, pady=10)

    title_label = tk.Label(frame, text="Orbit Service Manager", font=("Helvetica", 16))
    title_label.pack(pady=(0, 10))

    # --- Start buttons ---
    start_all_button = tk.Button(frame, text="Start All Services", command=start_all_services, width=25)
    start_all_button.pack(pady=5)
    
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
