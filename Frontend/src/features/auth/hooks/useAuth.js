import { useContext } from "react";
import { AuthContext } from "../auth.context";
import {
  login,
  register,
  logout,
} from "../services/auth.api";

export const useAuth = () => {
  const context = useContext(AuthContext);

  const {
    user,
    setUser,
    loading,
    setLoading,
  } = context;

  const handleLogin = async ({ email, password }) => {
    setLoading(true);

    try {
      const data = await login({ email, password });

      if (data?.user) {
        setUser(data.user);
      }

      return data;
    } catch (error) {
      console.error("Login Error:", error.response?.data || error.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async ({ username, email, password }) => {
    setLoading(true);

    try {
      const data = await register({ username, email, password });

      if (data?.user) {
        setUser(data.user);
      }

      return data;
    } catch (error) {
      console.error("Register Error:", error.response?.data || error.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);

    try {
      const data = await logout();
      setUser(null);
      return data;
    } catch (error) {
      console.error("Logout Error:", error.response?.data || error.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    loading,
    handleLogin,
    handleRegister,
    handleLogout,
  };
};