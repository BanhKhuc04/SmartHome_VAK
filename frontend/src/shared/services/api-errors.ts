import axios, { AxiosError } from 'axios';
import { ApiResponse } from '../types';

export type ApiErrorKind =
    | 'unauthorized'
    | 'session_expired'
    | 'rate_limited'
    | 'network'
    | 'server'
    | 'not_found'
    | 'forbidden'
    | 'unknown';

export interface NormalizedApiError {
    kind: ApiErrorKind;
    status: number | null;
    message: string;
    isNetworkError: boolean;
    isSessionExpired: boolean;
    isRateLimited: boolean;
    originalError: unknown;
}

function isNormalizedApiError(error: unknown): error is NormalizedApiError {
    return typeof error === 'object'
        && error !== null
        && 'kind' in error
        && 'message' in error
        && 'status' in error;
}

function getRequestUrl(error: AxiosError<ApiResponse>): string {
    return error.config?.url || '';
}

export function normalizeApiError(error: unknown): NormalizedApiError {
    if (isNormalizedApiError(error)) {
        return error;
    }

    if (!axios.isAxiosError<ApiResponse>(error)) {
        return {
            kind: 'unknown',
            status: null,
            message: 'Co loi khong xac dinh. Vui long thu lai.',
            isNetworkError: false,
            isSessionExpired: false,
            isRateLimited: false,
            originalError: error,
        };
    }

    if (!error.response) {
        return {
            kind: 'network',
            status: null,
            message: 'Khong ket noi duoc backend. Kiem tra API server.',
            isNetworkError: true,
            isSessionExpired: false,
            isRateLimited: false,
            originalError: error,
        };
    }

    const status = error.response.status;
    const requestUrl = getRequestUrl(error);
    const serverMessage = error.response.data?.error;

    if (status === 401) {
        if (requestUrl.includes('/auth/login')) {
            return {
                kind: 'unauthorized',
                status,
                message: 'Sai tai khoan hoac mat khau.',
                isNetworkError: false,
                isSessionExpired: false,
                isRateLimited: false,
                originalError: error,
            };
        }

        return {
            kind: 'session_expired',
            status,
            message: 'Phien dang nhap da het han. Vui long dang nhap lai.',
            isNetworkError: false,
            isSessionExpired: true,
            isRateLimited: false,
            originalError: error,
        };
    }

    if (status === 403) {
        return {
            kind: 'forbidden',
            status,
            message: serverMessage || 'Ban khong co quyen thuc hien thao tac nay.',
            isNetworkError: false,
            isSessionExpired: false,
            isRateLimited: false,
            originalError: error,
        };
    }

    if (status === 404) {
        return {
            kind: 'not_found',
            status,
            message: serverMessage || 'Khong tim thay tai nguyen yeu cau.',
            isNetworkError: false,
            isSessionExpired: false,
            isRateLimited: false,
            originalError: error,
        };
    }

    if (status === 429) {
        return {
            kind: 'rate_limited',
            status,
            message: 'Ban thu qua nhieu lan. Vui long doi mot luc roi dang nhap lai.',
            isNetworkError: false,
            isSessionExpired: false,
            isRateLimited: true,
            originalError: error,
        };
    }

    if (status >= 500) {
        return {
            kind: 'server',
            status,
            message: 'Loi server. Vui long thu lai sau.',
            isNetworkError: false,
            isSessionExpired: false,
            isRateLimited: false,
            originalError: error,
        };
    }

    return {
        kind: 'unknown',
        status,
        message: serverMessage || 'Yeu cau that bai. Vui long thu lai.',
        isNetworkError: false,
        isSessionExpired: false,
        isRateLimited: false,
        originalError: error,
    };
}

export function getApiErrorMessage(error: unknown): string {
    return normalizeApiError(error).message;
}
