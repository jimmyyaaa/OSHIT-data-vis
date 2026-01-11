import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
    isAuthenticated: boolean;
    login: (token: string, rememberMe: boolean) => void;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    useEffect(() => {
        // 同时检查 localStorage (永久) 和 sessionStorage (会话)
        const isAuthLocal = localStorage.getItem('isLoggedIn') === 'true';
        const isAuthSession = sessionStorage.getItem('isLoggedIn') === 'true';

        setIsAuthenticated(isAuthLocal || isAuthSession);
        setIsLoading(false);
    }, []);

    const login = (token: string, rememberMe: boolean) => {
        const storage = rememberMe ? localStorage : sessionStorage;

        // 存储 Token 和 登录标记
        storage.setItem('isLoggedIn', 'true');
        storage.setItem('authToken', token);
        setIsAuthenticated(true);
    };

    const logout = () => {
        // 清除所有可能的存储
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('authToken');
        sessionStorage.removeItem('isLoggedIn');
        sessionStorage.removeItem('authToken');
        setIsAuthenticated(false);
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, login, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
