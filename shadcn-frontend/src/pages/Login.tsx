'use client';

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Lock, User, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useLocale } from '@/contexts/LocaleContext';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageToggle } from '@/components/LanguageToggle';
import { Switch } from '@/components/ui/switch';

export default function LoginPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { getTranslations } = useLocale();
    const { login } = useAuth();
    const t = getTranslations();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        // 模拟登录逻辑
        setTimeout(() => {
            login("fake-token");
            setIsLoading(false);

            // 如果有之前尝试访问的路径，登录后跳回去
            const from = (location.state as any)?.from?.pathname || '/dashboard';
            navigate(from, { replace: true });
        }, 1000);
    };

    return (
        <div className="relative min-h-screen flex items-center justify-center p-4 bg-background overflow-hidden">
            {/* 背景装饰 */}
            <div className="absolute top-0 left-0 w-full h-full -z-10 pointer-events-none opacity-50 dark:opacity-20">
                <div className="absolute top-[10%] left-[5%] w-72 h-72 bg-primary/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-[10%] right-[5%] w-96 h-96 bg-primary/10 rounded-full blur-[120px]" />
            </div>

            {/* 顶部工具栏 */}
            <div className="absolute top-4 right-4 flex items-center gap-2">
                <LanguageToggle />
                <ThemeToggle />
            </div>

            <Card className="w-full max-w-md shadow-2xl border-primary/10 backdrop-blur-sm bg-card/95">
                <CardHeader className="space-y-4 text-center">
                    <div className="flex justify-center mb-2">
                        <div className="p-3 bg-primary/10 rounded-2xl shadow-inner border border-primary/20">
                            <img
                                src="/OSHIT_LOGO_noText.png"
                                alt="OSHIT"
                                className="size-12"
                            />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <CardTitle className="text-2xl font-bold tracking-tight">
                            {t.login.title}
                        </CardTitle>
                        <CardDescription className="text-muted-foreground">
                            {t.login.subtitle}
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <label
                                htmlFor="username"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                {t.login.username}
                            </label>
                            <div className="relative">
                                <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="username"
                                    type="text"
                                    placeholder="admin"
                                    className="pl-10"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label
                                    htmlFor="password"
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                    {t.login.password}
                                </label>
                                <button
                                    type="button"
                                    className="text-xs text-primary hover:underline font-medium"
                                >
                                    {t.login.forgotPassword}
                                </button>
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    className="pl-10 pr-10"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center space-x-2 pb-2">
                            <Switch id="remember" />
                            <label
                                htmlFor="remember"
                                className="text-sm text-muted-foreground cursor-pointer"
                            >
                                {t.login.rememberMe}
                            </label>
                        </div>

                        <Button
                            type="submit"
                            className="w-full group"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <div className="flex items-center gap-2">
                                    <span className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                                    {t.common.loading}
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    {t.login.signIn}
                                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                </div>
                            )}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                    <div className="relative w-full">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-muted" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-card px-2 text-muted-foreground whitespace-nowrap">
                                Team Portal Access Only
                            </span>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground"
                        onClick={() => navigate('/')}
                    >
                        {t.login.backToHome}
                    </Button>
                </CardFooter>
            </Card>

            {/* 版权信息 */}
            <div className="absolute bottom-6 text-center text-xs text-muted-foreground">
                © {new Date().getFullYear()} OSHIT Team. All rights reserved.
            </div>
        </div>
    );
}
