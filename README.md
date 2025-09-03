# 🎥 Screen Recorder App - Frontend

A sleek and intuitive React-based frontend for the Screen Recorder App that allows users to record their browser tab's screen with microphone audio, preview recordings, download them locally, and upload to a MERN backend for storage and management.

<!-- ![Frontend Demo](https://via.placeholder.com/800x400/4F46E5/FFFFFF?text=Screen+Recorder+Frontend) -->

## ✨ Features

### Core Features
- **Screen Recording**: Record the active browser tab with microphone audio using `navigator.mediaDevices.getDisplayMedia` and `MediaRecorder`.
- **Live Controls**: Start/Stop buttons with a real-time timer display.
- **Recording Limits**: Automatic stop at 3 minutes to prevent excessive recordings.
- **Preview & Download**: Instant preview player after recording, with a one-click download option.
- **Cloud Upload**: Seamless upload to Node/Express backend API with success/failure feedback.
- **Recordings List**: Dedicated page to view uploaded recordings with title, size, created date, and inline playback.
- **Responsive Design**: Modern UI built with Tailwind CSS, optimized for desktop and mobile.
- **Authentication Integration**: Basic login system to access personal recordings.

### Stretch Goals (Implemented)
- **Safari Support**: Feature detection with fallback messages for unsupported browsers.
- **Pause/Resume Controls**: Advanced recording controls for better user experience.
- **File Validation**: Size and duration checks before upload to ensure compatibility.
- **Lazy Loading**: Optimized video loading with IntersectionObserver for performance.

## 🛠️ Tech Stack

### Frontend
- **React** - Component-based UI library
- **TypeScript** - Type-safe JavaScript for better development experience
- **Vite** - Fast build tool and development server
- **Tailwind CSS** - Utility-first CSS framework for styling
- **React Router** - Client-side routing for navigation
- **Lucide React** - Beautiful icons for UI elements
- **ESLint** - Code linting for consistency

### Key Libraries
- **MediaRecorder API** - For screen and audio capture
- **IndexedDB** - Client-side storage for pending recordings
- **IntersectionObserver** - Lazy loading for videos

### Deployment
- **Frontend**: Vercel / Netlify
- **Backend**: Render / Railway / Heroku (separate repo)
- **Database**: MongoDB Atlas (via backend)

## 📋 Prerequisites

Before running this frontend application, ensure you have:

- **Node.js** (v18 or higher) - JavaScript runtime
- **npm** or **yarn** - Package manager
- **Git** - Version control system
- **Chrome Browser** - For full screen recording support (Safari partial)
- **Backend API** - Running instance of the Screen Recorder Backend (see backend repo)

## 🚀 Installation & Setup

### Frontend Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/screen-recorder-app-frontend.git
   cd screen-recorder-app-frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   Create a `.env` file in the root directory (optional for local dev):
   ```env
   VITE_BASE_URL=http://localhost:8000
   ```

   Replace with your backend API URL when deploying.

4. **Start the development server**
   ```bash
   npm run dev
   ```

   The app will be running at `http://localhost:5173` (default Vite port).

5. **Build for production**
   ```bash
   npm run build
   ```

## 🎯 How to Use

### Recording a Screen
1. **Navigate to Home**: Open the app in Chrome.
2. **Start Recording**: Click "Start Recording" to capture your active tab and microphone.
3. **Monitor Timer**: Watch the live timer; recording auto-stops at 3 minutes.
4. **Stop Recording**: Click "Stop" to end and preview your recording.

### Preview & Download
- After stopping, a modal appears with a video preview.
- Click "Download" to save the file locally.

### Upload to Cloud
- In the preview modal, enter a filename and click "Save to Cloud".
- If not logged in, you'll be redirected to login first.
- Success/failure messages will appear.

### View Recordings
- Click "My Recordings" to see your uploaded videos.
- Each entry shows title, size, date, and inline player.

### Authentication
- Use the "Login" button to access your account.
- Recordings are tied to authenticated users.

## 🌐 Deployment

### Frontend Deployment (Vercel - Recommended)
1. **Connect to Vercel**: Import your GitHub repo into Vercel.
2. **Configure Build Settings**:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. **Environment Variables**: Add `VITE_BASE_URL` pointing to your deployed backend API.
4. **Deploy**: Vercel will auto-deploy on pushes to main branch.

### Alternative: Netlify
1. **Connect Repository**: Link your GitHub repo to Netlify.
2. **Build Settings**:
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist`
3. **Environment Variables**: Set `VITE_BASE_URL` in Netlify dashboard.
4. **Deploy**: Netlify handles the rest!

### Backend Integration
- Ensure your backend is deployed (e.g., on Render).
- Update `VITE_BASE_URL` in your frontend deployment settings to point to the backend URL.
- Example: `https://your-backend-api.onrender.com`

## 📁 Project Structure

```
frontend/
├── public/
│   ├── ScreenRecorder_Hero_Vid.mp4  # Hero video asset
│   └── vite.svg
├── src/
│   ├── components/
│   │   ├── Floatingbar.tsx          # Recording controls
│   │   ├── LazyVideo.tsx            # Optimized video component
│   │   ├── Modal.tsx                # Preview modal
│   │   └── ProtectedRoute.tsx       # Auth guard
│   ├── contexts/
│   │   └── AuthContext.tsx          # User authentication
│   ├── pages/
│   │   ├── LandingPage.tsx          # Home with hero and features
│   │   ├── Login.tsx                # User login
│   │   ├── MyRecordings.tsx         # Recordings list
│   │   └── Register.tsx             # User registration
│   ├── utils/
│   │   ├── browserSupport.ts        # Browser compatibility
│   │   ├── recordingStorage.ts      # IndexedDB for pending recordings
│   │   └── validation.ts            # File validation
│   ├── App.tsx                      # Main app component
│   ├── index.css                    # Global styles
│   └── main.tsx                     # App entry point
├── .env                             # Environment variables
├── package.json                     # Dependencies and scripts
├── tsconfig.json                    # TypeScript config
├── vite.config.ts                   # Vite configuration
└── README.md                        # This file
```

## ⚠️ Known Limitations

- **Browser Support**: Full functionality requires Chrome for `getDisplayMedia`. Safari has partial support with fallbacks.
- **Permissions**: Users must grant screen and microphone permissions for recording.
- **File Size**: Large recordings may take time to upload; backend limits apply.
- **Mobile**: Optimized for desktop; mobile browsers have limited screen capture support.
- **Autoplay**: Videos autoplay muted due to browser policies.
- **Storage**: Pending recordings use IndexedDB; cleared after upload or login.

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

1. **Fork the Repository**: Click the fork button on GitHub.
2. **Clone Your Fork**:
   ```bash
   git clone https://github.com/your-username/screen-recorder-app-frontend.git
   cd screen-recorder-app-frontend
   ```
3. **Create a Feature Branch**:
   ```bash
   git checkout -b feature/amazing-feature
   ```
4. **Make Changes**: Implement your feature or fix.
5. **Commit and Push**:
   ```bash
   git add .
   git commit -m "Add amazing feature"
   git push origin feature/amazing-feature
   ```
6. **Open a Pull Request**: Describe your changes and submit.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with ❤️ using React and modern web technologies.
- Inspired by screen recording tools and open-source projects.
- Thanks to the React and Vite communities for amazing tools.
- Icons by [Lucide](https://lucide.dev/).

## 📞 Support

Need help or have questions?

- **GitHub Issues**: Open an issue for bugs or feature requests.
- **Documentation**: Check this README and inline code comments.
- **Community**: Join discussions in the repo.

---

**Ready to Record! 🚀**

*Built with ❤️ using React & Vite*
