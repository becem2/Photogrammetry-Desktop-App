import { useEffect, useState } from "react";
import "./App.css";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./Config/Firebase";

// Hiarchy Components
import LogInSignUp from "./Views/LogInView";
import Layout from "./Views/Workspace";
import TopNavBar from "./Views/TopNabBar";

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

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      <TopNavBar/>
      {isAuthenticated ? (<Layout />) : (<LogInSignUp onUserDataComplete={() => setHasUserData(true)} />)}
    </div>
  );
}

export default App;