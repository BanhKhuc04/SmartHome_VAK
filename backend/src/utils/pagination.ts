import { Request } from 'express';

export interface PaginationParams {
    page: number;
    limit: number;
    offset: number;
}

export interface PaginatedResponse<T> {
    success: true;
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
    timestamp: string;
}

export function parsePagination(req: Request, defaultLimit = 20, maxLimit = 100): PaginationParams {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(maxLimit, Math.max(1, parseInt(req.query.limit as string) || defaultLimit));
    const offset = (page - 1) * limit;
    return { page, limit, offset };
}

export function buildPaginatedResponse<T>(data: T[], total: number, params: PaginationParams): PaginatedResponse<T> {
    return {
        success: true,
        data,
        pagination: {
            page: params.page,
            limit: params.limit,
            total,
            totalPages: Math.ceil(total / params.limit),
        },
        timestamp: new Date().toISOString(),
    };
}
