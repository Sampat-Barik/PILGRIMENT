import { createContext, useContext, useEffect, useState } from "react";
import { 
  User, 
  onAuthStateChanged,
} from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

interface AuthContextType {
  user: User | null;
  userData: any | null;
  loading: boolean;
  refreshUserData: () => Promise<void>;
  loginAsDemo: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
  refreshUserData: async () => {},
  loginAsDemo: () => {},
  logout: () => {}
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (currentUser: User) => {
    try {
      const userRef = doc(db, "users", currentUser.uid);
      const docSnap = await getDoc(userRef);
      if (docSnap.exists()) {
        setUserData(docSnap.data());
      } else {
        // First-time user setup
        const newUserData = {
          enterpriseName: "My Enterprise",
          email: currentUser.email || "",
          phone: currentUser.phoneNumber || "",
          numberOfCameras: 0,
          createdAt: serverTimestamp()
        };
        await setDoc(userRef, newUserData);
        setUserData(newUserData);
      }
    } catch (e) {
      console.error("Error fetching user data:", e);
    }
  };

  const refreshUserData = async () => {
    if (user) await fetchUserData(user);
  };

  const loginAsDemo = () => {
    const demoUser = {
      uid: "demo-user-123",
      email: "demo@pilgriment.com",
      displayName: "Demo User",
      emailVerified: true,
      isAnonymous: false,
    } as User;
    
    setUser(demoUser);
    setUserData({
      enterpriseName: "Demo Enterprise",
      email: "demo@pilgriment.com",
      phone: "+1234567890",
      numberOfCameras: 5,
      createdAt: new Date()
    });
    localStorage.setItem('demoMode', 'true');
  };

  const logout = () => {
    localStorage.removeItem('demoMode');
    auth.signOut();
    setUser(null);
    setUserData(null);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (localStorage.getItem('demoMode') === 'true') {
        loginAsDemo();
        setLoading(false);
        return;
      }

      setUser(currentUser);
      if (currentUser) {
        await fetchUserData(currentUser);
      } else {
        setUserData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, userData, loading, refreshUserData, loginAsDemo, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
