import { createContext, useContext, useEffect, useState } from "react";
import api from "../api/axios";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("wingspan_token");
    const savedUser = localStorage.getItem("wingspan_user");
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  // Actually apply the saved preference to the page -- every color in index.css is a
  // CSS variable, and [data-theme="dark"] on <html> swaps them all at once, so this one
  // line is what makes the Profile page's Dark Mode toggle visibly do something.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", user?.darkMode ? "dark" : "light");
  }, [user?.darkMode]);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("wingspan_token", data.token);
    localStorage.setItem("wingspan_user", JSON.stringify(data));
    setUser(data);
    return data;
  };

  const signup = async (fullName, email, password) => {
    const { data } = await api.post("/auth/signup", { fullName, email, password });
    localStorage.setItem("wingspan_token", data.token);
    localStorage.setItem("wingspan_user", JSON.stringify(data));
    setUser(data);
    return data;
  };

  const logout = () => {
    localStorage.removeItem("wingspan_token");
    localStorage.removeItem("wingspan_user");
    setUser(null);
  };

  const updateUser = (updatedFields) => {
    const merged = { ...user, ...updatedFields };
    localStorage.setItem("wingspan_user", JSON.stringify(merged));
    setUser(merged);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
