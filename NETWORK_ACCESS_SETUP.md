# Network Access Setup Guide

This guide explains how to access the TTX Platform from other devices on your local network.

## Quick Setup

### Step 1: Find Your Server's IP Address

**On Windows:**
```bash
ipconfig
```
Look for "IPv4 Address" under your active network adapter (usually starts with 192.168.x.x)

**On Mac/Linux:**
```bash
ifconfig
# or
ip addr show
```

Example: `192.168.1.100`

---

### Step 2: Configure Backend (Already Done!)

The backend CORS has been configured to allow all origins on your local network.

✅ Backend is listening on `0.0.0.0:5000` (all network interfaces)
✅ CORS allows all origins with credentials
✅ Socket.io allows all origins

---

### Step 3: Configure Frontend

Edit `frontend/.env` file and replace `YOUR_SERVER_IP` with your actual server IP:

```env
# Example: If your server IP is 192.168.1.100
REACT_APP_API_URL=http://192.168.1.100:5000/api
REACT_APP_SOCKET_URL=http://192.168.1.100:5000
```

---

### Step 4: Restart Both Servers

**Backend:**
```bash
cd backend
npm start
# or
node server.js
```

**Frontend:**
```bash
cd frontend
npm start
```

---

## Access URLs

### For Server Computer (localhost):
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5000`

### For Other Devices on Network:
- Frontend: `http://YOUR_SERVER_IP:3000`
- Backend: `http://YOUR_SERVER_IP:5000`

Example:
- Frontend: `http://192.168.1.100:3000`
- Backend: `http://192.168.1.100:5000`

---

## For 50+ Participants

If you need to support 50+ concurrent participants, the frontend `.env` should point to the server's network IP:

```env
REACT_APP_API_URL=http://192.168.1.100:5000/api
REACT_APP_SOCKET_URL=http://192.168.1.100:5000
```

Then each participant can access the frontend from their browser at:
```
http://192.168.1.100:3000
```

---

## Public Internet Access (Advanced)

To make the platform accessible from outside your local network:

### Option 1: Port Forwarding
1. Configure your router to forward ports 3000 and 5000 to your server
2. Use your public IP address or domain name
3. Update `.env` files with your public IP/domain

### Option 2: Reverse Proxy (Recommended)
1. Install nginx on your server
2. Configure SSL certificates (Let's Encrypt)
3. Proxy frontend (port 80/443) to port 3000
4. Proxy backend (port 80/443/api) to port 5000

### Option 3: Cloud Deployment
Deploy to:
- **Heroku** (easy, free tier available)
- **DigitalOcean** (scalable, $5/month)
- **AWS EC2** (enterprise-grade)
- **Vercel** (frontend) + **Railway** (backend)

---

## Firewall Configuration

Make sure Windows Firewall allows connections:

1. Open Windows Defender Firewall
2. Click "Allow an app through firewall"
3. Add Node.js if not already allowed
4. Make sure both Private and Public networks are checked

Or disable firewall temporarily for testing:
```bash
# Run as Administrator
netsh advfirewall set allprofiles state off
```

---

## Testing Network Access

1. From another device on the network, open browser
2. Navigate to `http://YOUR_SERVER_IP:3000`
3. Try to register/login
4. If it works, network access is configured correctly!

---

## Troubleshooting

### Cannot connect from other devices:
- ✅ Check server IP is correct
- ✅ Check backend is running on 0.0.0.0:5000
- ✅ Check Windows Firewall settings
- ✅ Check frontend .env has correct server IP
- ✅ Restart both frontend and backend after changing .env

### CORS errors:
- ✅ Backend CORS is now configured to allow all origins
- ✅ Make sure credentials: true is set (already done)

### Socket.io not connecting:
- ✅ Check REACT_APP_SOCKET_URL in frontend/.env
- ✅ Check browser console for connection errors
- ✅ Verify server is listening on 0.0.0.0:5000

---

## Security Notes

⚠️ **For Production:**
- Change JWT_SECRET in backend/.env
- Use specific CORS origins instead of allowing all
- Add rate limiting
- Use HTTPS/SSL certificates
- Add authentication for socket connections
- Implement proper session management

The current configuration allows all origins for easy local network testing.
