import { env } from '$env/dynamic/public';
import { browser } from '$app/environment';

export interface User {
    id: string;
    username: string;
}

export const API_BASE = env.PUBLIC_API_URL || 'https://daily-tracking-api.onrender.com/api/v1';

class AuthState {
    token = $state<string | null>(browser ? localStorage.getItem('dailytrack_token') : null);
    user = $state<User | null>(browser ? (() => {
        try {
            const stored = localStorage.getItem('dailytrack_user');
            return (stored && stored !== 'undefined') ? JSON.parse(stored) : null;
        } catch {
            return null;
        }
    })() : null);

    get isAuthenticated() { return !!this.token; }

    reload() {
        if (!browser) return;
        this.token = localStorage.getItem('dailytrack_token');
        try {
            const stored = localStorage.getItem('dailytrack_user');
            this.user = (stored && stored !== 'undefined') ? JSON.parse(stored) : null;
        } catch {
            this.user = null;
        }
    }

    async login(username: string, password: string) {
        try {
            const response = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            if (!response.ok) throw new Error('Login failed');

            const data = await response.json();
            console.log('Login response data:', data);
            this.token = data.token;
            this.user = data.user;
            console.log('AuthState token after set:', this.token);

            if (browser) {
                localStorage.setItem('dailytrack_token', data.token);
                localStorage.setItem('dailytrack_user', JSON.stringify(data.user));
            }

            return true;
        } catch (error) {
            console.error('Login error:', error);
            return false;
        }
    }

    logout() {
        this.token = null;
        this.user = null;
        if (browser) {
            localStorage.removeItem('dailytrack_token');
            localStorage.removeItem('dailytrack_user');
        }
    }
}

export const authState = new AuthState();
