import { useEffect, useState } from "react";
import "./App.css";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./Config/Firebase";

// Top-level shells for auth, the workspace, and the custom title bar.
import LogInSignUp from "./Views/LogInView";
import Layout from "./Views/Workspace";
import TopNavBar from "./Views/TopNabBar";

type AppearanceMode = "light" | "dark";
type AccentTheme = "emerald" | "blue" | "amber";

const accentThemeConfig: Record<AccentTheme, { primary: string; ring: string }> = {
  emerald: { primary: "#10b981", ring: "#10b981" },
  blue: { primary: "#3b82f6", ring: "#3b82f6" },
  amber: { primary: "#f59e0b", ring: "#f59e0b" },
};

// Apply the chosen theme to global CSS variables and the dark-mode class.
const applyAppearanceSettings = (mode: AppearanceMode, accentTheme: AccentTheme) => {
  document.documentElement.classList.toggle("dark", mode === "dark");

  const accentConfig = accentThemeConfig[accentTheme];
  document.documentElement.style.setProperty("--primary", accentConfig.primary);
  document.documentElement.style.setProperty("--sidebar-primary", accentConfig.primary);
  document.documentElement.style.setProperty("--ring", accentConfig.ring);
};

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userDataLoaded, setUserDataLoaded] = useState(false);
  const [hasUserData, setHasUserData] = useState(false);
  const [pendingProfileUser, setPendingProfileUser] = useState<{
    uid: string;
    email: string;
    displayName: string;
    providerId: string;
  } | null>(null);

  useEffect(() => {
    // Resolve auth and profile state before deciding which shell to render.
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "Users", user.uid));
          const hasProfile = userDoc.exists();
          setHasUserData(hasProfile);

          if (hasProfile) {
            const userData = userDoc.data() as {
              appearanceMode?: AppearanceMode;
              accentTheme?: AccentTheme;
            } | undefined;

            applyAppearanceSettings(
              userData?.appearanceMode || "light",
              userData?.accentTheme || "emerald"
            );
            setPendingProfileUser(null);
          } else {
            setPendingProfileUser({
              uid: user.uid,
              email: user.email || "",
              displayName: user.displayName || "",
              providerId: user.providerData[0]?.providerId || "password",
            });
            applyAppearanceSettings("light", "emerald");
          }
        } catch (error) {
          console.error("Failed to load user profile", error);
          setHasUserData(false);
          setPendingProfileUser({
            uid: user.uid,
            email: user.email || "",
            displayName: user.displayName || "",
            providerId: user.providerData[0]?.providerId || "password",
          });
          applyAppearanceSettings("light", "emerald");
        }
      } else {
        setHasUserData(false);
        setPendingProfileUser(null);
        applyAppearanceSettings("light", "emerald");
      }
      setUserDataLoaded(true);
    });

    return unsubscribe;
  }, []);

  const isAuthenticated = Boolean(currentUser && hasUserData);
  const isProfileCompletionRequired = Boolean(currentUser && !hasUserData);

  if (!userDataLoaded) {
    return null;
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      <TopNavBar isProfileCompletionRequired={isProfileCompletionRequired} />
      {isAuthenticated ? (
        <Layout />
      ) : (
        <LogInSignUp
          onUserDataComplete={() => {
            setHasUserData(true);
            setPendingProfileUser(null);
          }}
          pendingProfileUser={pendingProfileUser}
        />
      )}
    </div>
  );
}

export default App;