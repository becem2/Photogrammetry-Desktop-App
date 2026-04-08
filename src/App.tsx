import { useEffect, useState } from "react";
import "./App.css";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./Config/Firebase";
import LogInSignUp from "./Views/LogIn";
import Dashboard from "./Views/Dashboard";

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userDataLoaded, setUserDataLoaded] = useState(false);
  const [hasUserData, setHasUserData] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const userDoc = await getDoc(doc(db, "Users", user.uid));
        setHasUserData(userDoc.exists());
      } else {
        setHasUserData(false);
      }
      setUserDataLoaded(true);
    });

    return unsubscribe;
  }, []);

  const isAuthenticated = Boolean(currentUser && hasUserData);

  if (!userDataLoaded) {
    return null;
  }

  return isAuthenticated ? (
    <Dashboard user={currentUser} onLogout={() => signOut(auth)} />
  ) : (
    <LogInSignUp onUserDataComplete={() => setHasUserData(true)} />
  );
}

export default App;