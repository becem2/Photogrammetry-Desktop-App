import { useEffect, useState } from "react";
import { Monitor, User, Shield, LogOut, Camera, Bell, FolderOpen, Palette } from "lucide-react";
import * as Tabs from "@radix-ui/react-tabs";
import { auth, db } from "../../../Config/Firebase";
import { signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import SettingSection from "./Settings/SettingSection";
import SettingRow from "./Settings/SettingRow";
import ToggleControl from "./Settings/ToggleControl";
import TextInput from "./Settings/TextInput";

// Settings tabs and the user-facing appearance presets.
type AppearanceMode = "light" | "dark";
type AccentTheme = "emerald" | "blue" | "amber";
type SettingsTab = "account" | "general" | "processing" | "appearance";

const accentThemeConfig: Record<AccentTheme, { primary: string; ring: string; color: string; label: string }> = {
  emerald: { primary: "#10b981", ring: "#10b981", color: "#10b981", label: "Emerald" },
  blue: { primary: "#3b82f6", ring: "#3b82f6", color: "#3b82f6", label: "Blue" },
  amber: { primary: "#f59e0b", ring: "#f59e0b", color: "#f59e0b", label: "Amber" },
};

const accentOptions: Array<{ key: AccentTheme; color: string; label: string }> = [
  { key: "emerald", color: accentThemeConfig.emerald.color, label: accentThemeConfig.emerald.label },
  { key: "blue", color: accentThemeConfig.blue.color, label: accentThemeConfig.blue.label },
  { key: "amber", color: accentThemeConfig.amber.color, label: accentThemeConfig.amber.label },
];

const defaultSettings = {
  defaultProjectLocation: "/Users/becem/DroneMesh",
  appearanceMode: "light" as AppearanceMode,
  accentTheme: "emerald" as AccentTheme,
  autoSaveProjects: true,
  twoFactorEnabled: false,
  emailNotifications: true,
  processingCompleteNotifications: true,
};

const applyAppearanceSettings = (mode: AppearanceMode, accentTheme: AccentTheme) => {
  // Keep the document theme variables aligned with the chosen accent.
  const accentConfig = accentThemeConfig[accentTheme];

  document.documentElement.classList.toggle("dark", mode === "dark");
  document.documentElement.style.setProperty("--primary", accentConfig.primary);
  document.documentElement.style.setProperty("--sidebar-primary", accentConfig.primary);
  document.documentElement.style.setProperty("--ring", accentConfig.ring);
};

const sanitizeAppearanceMode = (value: unknown): AppearanceMode => {
  return value === "dark" ? "dark" : "light";
};

const sanitizeAccentTheme = (value: unknown): AccentTheme => {
  return value === "blue" || value === "amber" ? value : "emerald";
};

function Settings() {
  // Load, edit, and persist user preferences for the signed-in account.
  const user = auth.currentUser;
  const [activeTab, setActiveTab] = useState<SettingsTab>("account");
  const [fullName, setFullName] = useState(user?.displayName || "");
  const [defaultProjectLocation, setDefaultProjectLocation] = useState(defaultSettings.defaultProjectLocation);
  const [appearanceMode, setAppearanceMode] = useState<AppearanceMode>(defaultSettings.appearanceMode);
  const [accentTheme, setAccentTheme] = useState<AccentTheme>(defaultSettings.accentTheme);
  const [autoSaveProjects, setAutoSaveProjects] = useState(defaultSettings.autoSaveProjects);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(defaultSettings.twoFactorEnabled);
  const [emailNotifications, setEmailNotifications] = useState(defaultSettings.emailNotifications);
  const [processingCompleteNotifications, setProcessingCompleteNotifications] = useState(
    defaultSettings.processingCompleteNotifications
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Hydrate the form from Firestore when a profile is available.
    if (!user?.uid) {
      setFullName("");
      return;
    }

    const loadUserProfile = async () => {
      try {
        const userDoc = await getDoc(doc(db, "Users", user.uid));
        const userData = userDoc.data() as {
          firstName?: string;
          lastName?: string;
          defaultProjectLocation?: string;
          appearanceMode?: unknown;
          accentTheme?: unknown;
          autoSaveProjects?: boolean;
          twoFactorEnabled?: boolean;
          emailNotifications?: boolean;
          processingCompleteNotifications?: boolean;
        } | undefined;

        const fetchedFullName = `${userData?.firstName || ""} ${userData?.lastName || ""}`.trim();

        setFullName(fetchedFullName || user?.displayName || "");
        setDefaultProjectLocation(
          userData?.defaultProjectLocation?.trim() || defaultSettings.defaultProjectLocation
        );
        setAppearanceMode(sanitizeAppearanceMode(userData?.appearanceMode));
        setAccentTheme(sanitizeAccentTheme(userData?.accentTheme));
        setAutoSaveProjects(
          typeof userData?.autoSaveProjects === "boolean"
            ? userData.autoSaveProjects
            : defaultSettings.autoSaveProjects
        );
        setTwoFactorEnabled(
          typeof userData?.twoFactorEnabled === "boolean"
            ? userData.twoFactorEnabled
            : defaultSettings.twoFactorEnabled
        );
        setEmailNotifications(
          typeof userData?.emailNotifications === "boolean"
            ? userData.emailNotifications
            : defaultSettings.emailNotifications
        );
        setProcessingCompleteNotifications(
          typeof userData?.processingCompleteNotifications === "boolean"
            ? userData.processingCompleteNotifications
            : defaultSettings.processingCompleteNotifications
        );
      } catch (error) {
        console.error("Failed to load user profile", error);
        setFullName(user?.displayName || "");
        setDefaultProjectLocation(defaultSettings.defaultProjectLocation);
        setAppearanceMode(defaultSettings.appearanceMode);
        setAccentTheme(defaultSettings.accentTheme);
        setAutoSaveProjects(defaultSettings.autoSaveProjects);
        setTwoFactorEnabled(defaultSettings.twoFactorEnabled);
        setEmailNotifications(defaultSettings.emailNotifications);
        setProcessingCompleteNotifications(defaultSettings.processingCompleteNotifications);
      }
    };

    void loadUserProfile();
  }, [user?.uid, user?.displayName]);

  const handleLogout = async () => {
    const confirmLogout = window.confirm("Are you sure you want to log out?");
    if (!confirmLogout) return;

    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
      alert("Failed to log out. Please try again.");
    }
  };

  const handleSaveSettings = async () => {
    // Persist the current form state back to the user document.
    if (!user?.uid) return;

    try {
      setIsSaving(true);
      await setDoc(
        doc(db, "Users", user.uid),
        {
          defaultProjectLocation: defaultProjectLocation.trim(),
          appearanceMode,
          accentTheme,
          autoSaveProjects,
          twoFactorEnabled,
          emailNotifications,
          processingCompleteNotifications,
        },
        { merge: true }
      );

      // Apply appearance globally only after explicit save.
      applyAppearanceSettings(appearanceMode, accentTheme);
    } catch (error) {
      console.error("Failed to save settings", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBrowseDefaultLocation = async () => {
    try {
      const selectedFolder = await window.electronAPI.selectFolder();

      if (selectedFolder) {
        setDefaultProjectLocation(selectedFolder);
      }
    } catch (error) {
      console.error("Failed to select default project location", error);
    }
  };

  const handleResetTabDefaults = () => {
    if (activeTab === "account") {
      setTwoFactorEnabled(defaultSettings.twoFactorEnabled);
      setEmailNotifications(defaultSettings.emailNotifications);
      setProcessingCompleteNotifications(defaultSettings.processingCompleteNotifications);
      return;
    }

    if (activeTab === "general") {
      setAutoSaveProjects(defaultSettings.autoSaveProjects);
      setDefaultProjectLocation(defaultSettings.defaultProjectLocation);
      return;
    }

    if (activeTab === "appearance") {
      setAppearanceMode(defaultSettings.appearanceMode);
      setAccentTheme(defaultSettings.accentTheme);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-8 py-6 border-b border-border bg-card/50">
        <h1 className="text-2xl font-bold mb-2">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure your account and application preferences
        </p>
      </div>

      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-4xl mx-auto">
          <Tabs.Root value={activeTab} onValueChange={(value) => setActiveTab(value as SettingsTab)}>
            <Tabs.List className="flex gap-2 mb-6 border-b border-border">
              <Tabs.Trigger
                value="account"
                className="px-4 py-3 text-sm transition-colors data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary -mb-px font-medium"
              >
                Account
              </Tabs.Trigger>
              <Tabs.Trigger
                value="general"
                className="px-4 py-3 text-sm transition-colors data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary -mb-px font-medium"
              >
                General
              </Tabs.Trigger>
              <Tabs.Trigger
                value="processing"
                className="px-4 py-3 text-sm transition-colors data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary -mb-px font-medium"
              >
                Processing
              </Tabs.Trigger>
              <Tabs.Trigger
                value="appearance"
                className="px-4 py-3 text-sm transition-colors data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary -mb-px font-medium"
              >
                Appearance
              </Tabs.Trigger>
            </Tabs.List>

            <Tabs.Content value="account" className="space-y-6 outline-none">
              <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
                <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  Profile Information
                </h2>

                <div className="flex items-center gap-6 mb-6">
                  <div className="w-20 h-20 bg-primary/20 text-primary border-2 border-primary/20 rounded-full flex items-center justify-center text-2xl font-bold uppercase">
                    {user?.displayName?.charAt(0) || user?.email?.charAt(0) || "U"}
                  </div>
                  <div>
                    <button className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm transition-colors flex items-center gap-2 mb-2 font-medium">
                      <Camera className="w-4 h-4" />
                      Change Photo
                    </button>
                    <p className="text-xs text-muted-foreground">
                      JPG, PNG or GIF (max. 2MB)
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium uppercase text-muted-foreground">Full Name</label>
                    <input
                      type="text"
                      value={fullName}
                      readOnly
                      placeholder="No name set"
                      className="w-full px-4 py-2 bg-input border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium uppercase text-muted-foreground">Email Address</label>
                    <input
                      type="email"
                      disabled
                      defaultValue={user?.email || ""}
                      className="w-full px-4 py-2 bg-muted/50 border border-border rounded-lg text-sm cursor-not-allowed opacity-70"
                    />
                  </div>
                </div>
              </div>

              <SettingSection icon={Shield} title="Security">
                <SettingRow
                  label="Change Password"
                  description="Update your password to keep your account secure"
                  control={
                    <button className="px-4 py-2 bg-secondary hover:bg-accent border border-border rounded-lg text-sm transition-colors font-medium">
                      Change
                    </button>
                  }
                />
                <SettingRow
                  label="Two-Factor Authentication"
                  description="Add an extra layer of security to your account"
                  control={<ToggleControl checked={twoFactorEnabled} onCheckedChange={setTwoFactorEnabled} />}
                />
              </SettingSection>

              <SettingSection icon={Bell} title="Notifications">
                <SettingRow
                  label="Email Notifications"
                  description="Receive email updates about your projects"
                  control={<ToggleControl checked={emailNotifications} onCheckedChange={setEmailNotifications} />}
                />
                <SettingRow
                  label="Processing Complete"
                  description="Notify when photogrammetry processing is complete"
                  control={
                    <ToggleControl
                      checked={processingCompleteNotifications}
                      onCheckedChange={setProcessingCompleteNotifications}
                    />
                  }
                />
              </SettingSection>

              <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-6">
                <h2 className="text-base font-semibold mb-4 text-red-500 flex items-center gap-2">
                  Danger Zone
                </h2>
                <div className="space-y-4">
                  <SettingRow
                    label="Sign Out"
                    description="Sign out from your account on this device"
                    control={
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="px-4 py-2 bg-white dark:bg-zinc-900 hover:bg-red-50 dark:hover:bg-red-950/20 border border-border hover:border-red-500/50 rounded-lg text-sm transition-all flex items-center gap-2 font-medium disabled:opacity-50"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    }
                  />
                  <SettingRow
                    label="Delete Account"
                    description="Permanently delete your account and all data. This action is irreversible."
                    control={
                      <button className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm transition-colors font-medium">
                        Delete
                      </button>
                    }
                  />
                </div>
              </div>
            </Tabs.Content>

            <Tabs.Content value="general" className="space-y-6 outline-none">
              <SettingSection icon={Monitor} title="General">
                <SettingRow
                  label="Auto-save projects"
                  description="Automatically save project changes during editing"
                  control={<ToggleControl checked={autoSaveProjects} onCheckedChange={setAutoSaveProjects} />}
                />
                <SettingRow
                  label="Default project location"
                  description="Set the default folder for new drone scans"
                  control={
                    <div className="flex items-center gap-2">
                      <TextInput
                        value={defaultProjectLocation}
                        onChange={setDefaultProjectLocation}
                      />
                      <button
                        type="button"
                        onClick={handleBrowseDefaultLocation}
                        className="px-3 py-1.5 bg-secondary hover:bg-accent border border-border rounded-lg transition-colors text-sm flex items-center gap-2"
                      >
                        <FolderOpen className="w-4 h-4" />
                        Browse
                      </button>
                    </div>
                  }
                />
              </SettingSection>
            </Tabs.Content>

            <Tabs.Content value="processing" className="space-y-6 outline-none">
              <SettingSection icon={Monitor} title="Processing">
                <p className="text-sm text-muted-foreground">
                  Processing preferences will be added in a future update.
                </p>
              </SettingSection>
            </Tabs.Content>

            <Tabs.Content value="appearance" className="space-y-6 outline-none">
              <SettingSection icon={Monitor} title="Appearance">
                <SettingRow
                  label="Appearance"
                  description="Choose your preferred mode"
                  control={
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setAppearanceMode("light")}
                        className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                          appearanceMode === "light"
                            ? "bg-primary text-white border-primary"
                            : "bg-secondary border-border hover:bg-accent"
                        }`}
                      >
                        Light
                      </button>
                      <button
                        type="button"
                        onClick={() => setAppearanceMode("dark")}
                        className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                          appearanceMode === "dark"
                            ? "bg-primary text-white border-primary"
                            : "bg-secondary border-border hover:bg-accent"
                        }`}
                      >
                        Dark
                      </button>
                    </div>
                  }
                />
              </SettingSection>

              <SettingSection icon={Palette} title="Theme">
                <SettingRow
                  label="Theme"
                  description="Pick your accent color"
                  control={
                    <div className="flex items-center gap-2">
                      {accentOptions.map((option) => (
                        <button
                          key={option.key}
                          type="button"
                          onClick={() => setAccentTheme(option.key)}
                          className={`w-9 h-9 rounded-full border-2 transition-transform hover:scale-105 ${
                            accentTheme === option.key
                              ? "border-foreground"
                              : "border-transparent"
                          }`}
                          style={{ backgroundColor: option.color }}
                          title={option.label}
                          aria-label={option.label}
                        />
                      ))}
                    </div>
                  }
                />
              </SettingSection>
            </Tabs.Content>
          </Tabs.Root>

          <div className="flex justify-end gap-3 pt-8 pb-12">
            <button
              type="button"
              onClick={handleResetTabDefaults}
              className="px-6 py-2.5 bg-secondary hover:bg-accent border border-border rounded-lg transition-colors font-medium"
            >
              Reset to Defaults
            </button>
            <button
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors font-medium shadow-md disabled:opacity-70"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;
