# Remote Localhost Access Guide (Cloudflare Tunnel)

This guide explains how to make your locally running **MMSU URERB Portal** securely accessible to a friend or collaborator in a different municipality or network using **Cloudflare Quick Tunnel** without port forwarding or paid subscriptions.

---

## 🛠️ Prerequisites & Architecture

The URERB Portal uses a modern hybrid architecture:
1. **Frontend:** React 19 + Vite running on port `5173`.
2. **Backend API:** PHP (PDO) running under XAMPP Apache on port `80`.
3. **Database:** MySQL running under XAMPP on port `3306`.
4. **Tunnel:** Cloudflare Tunnel connects to `http://localhost:5173`, which serves the full user interface and automatically forwards all `/urerb-api/*` requests to your local Apache and MySQL.

---

## 🚀 Step-by-Step Startup Instructions

### Step 1: Start XAMPP (Apache & MySQL)
1. Open the **XAMPP Control Panel** from your Windows Start Menu or taskbar.
2. Click **Start** next to **Apache** (verify Port `80, 443` turns green).
3. Click **Start** next to **MySQL** (verify Port `3306` turns green).

---

### Step 2: Start the Vite Frontend Server
If the frontend is not already running, open a terminal in this folder and start it:
```powershell
npm run dev
```
*(Verify it shows `Local: http://localhost:5173/`)*

---

### Step 3: Launch Cloudflare Quick Tunnel

#### Option A: One-Click Launcher (Easiest)
Double-click [`start-remote-access.bat`](start-remote-access.bat) in your project folder.

#### Option B: Terminal Command
Open PowerShell or Command Prompt and run:
```powershell
cloudflared tunnel --url http://localhost:5173 --http-host-header localhost
```

---

### Step 4: Obtain Your Public HTTPS URL
Look in the terminal window for a box formatted like this:
```text
+--------------------------------------------------------------------------------------------+
|  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable):  |
|  https://xxxx-xxxx-xxxx.trycloudflare.com                                                  |
+--------------------------------------------------------------------------------------------+
```

Copy the generated link (e.g., `https://xxxx-xxxx-xxxx.trycloudflare.com`) and send it to your friend or collaborator.

---

### Step 5: How to Stop Remote Access Immediately
- In the command window running `cloudflared`, press **`Ctrl + C`** or simply **close the window**.
- The public URL will immediately stop working and disconnect external access.

---

## 🧪 How to Verify & Test Remote Functionality

Share the URL with your collaborator and verify:
1. **Initial Page Load:** The MMSU URERB Portal login screen loads with all seal logos and CSS styling.
2. **Authentication / Registration:** 
   - Log in using the Secretariat account (`secretariat@mmsu.edu.ph` / `Urerb@2025!`) or register a new Researcher account.
3. **Database Access:** 
   - View the dashboard, submit a protocol draft, or check the intake queue.
4. **Session Persistence:**
   - Navigating between tabs preserves the active user session without premature logout.

---

## 🔒 Security Best Practices

> [!IMPORTANT]
> Because Cloudflare Quick Tunnel generates a publicly reachable URL, adhere to the following safety protocols:

1. **Never Expose Database Ports or phpMyAdmin:**
   - The tunnel points exclusively to your application port (`5173`).
   - Neither MySQL (`3306`) nor phpMyAdmin (`http://localhost/phpmyadmin`) are exposed to the public internet.
2. **Use Demonstration / Test Data Only:**
   - Do not enter real sensitive medical records, confidential participant identification, or private personal data during remote demos.
3. **URL Confidentiality:**
   - Anyone who obtains your active `trycloudflare.com` link can open the portal login page. Only share the link with trusted demonstration partners.
4. **Disconnect After Use:**
   - When your demonstration is complete, always terminate `cloudflared` to close the tunnel.

---

## 🔧 Troubleshooting

| Issue | Likely Cause | Solution |
| :--- | :--- | :--- |
| **"Failed to connect to backend"** | Apache is stopped in XAMPP | Open XAMPP Control Panel and ensure the **Apache** module is started on port 80. |
| **"Database connection failed"** | MySQL is stopped in XAMPP | Open XAMPP Control Panel and ensure the **MySQL** module is started on port 3306. |
| **"Blocked request: Host is not in allowedHosts"** | Missing host header flag | Ensure you launch the tunnel with `--http-host-header localhost`. |
| **Tunnel URL shows "502 Bad Gateway"** | Vite dev server is not running | Run `npm run dev` in your project folder before starting the tunnel. |
| **`cloudflared` command not recognized** | Path not loaded in current terminal | Use `& "C:\Program Files (x86)\cloudflared\cloudflared.exe"` or open a fresh terminal window. |
