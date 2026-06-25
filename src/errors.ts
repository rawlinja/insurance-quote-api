export type ValidationError = {
    field?: string;
    message: string;
};

export type ErrorBody = { error: string } | { errors: ValidationError[] };

export class AppError extends Error {
    readonly statusCode: number;
    readonly body: ErrorBody;

    constructor(statusCode: number, body: ErrorBody) {
        super(getAppErrorMessage(body));
        this.name = 'AppError';
        this.statusCode = statusCode;
        this.body = body;
    }
}

function getAppErrorMessage(body: { error: string } | { errors: { message: string }[] }): string {
    if ('error' in body) return body.error;
    return body.errors.map((e) => e.message).join('; ');
}
