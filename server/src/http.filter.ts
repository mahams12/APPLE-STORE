import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import { logError } from "./logger";

@Catch()
export class HttpFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const payload = exception instanceof HttpException ? exception.getResponse() : null;
    const raw = typeof payload === "string" ? payload : payload && typeof payload === "object" && "message" in payload ? payload.message : "Something went wrong. Please try again.";
    const message = Array.isArray(raw) ? String(raw[0]) : String(raw);
    if (status >= 500) logError("unhandled_exception", { status, detail: exception instanceof Error ? exception.message : "unknown" });
    else if (status === 401 || status === 403) logError("auth_denied", { status, message });
    response.status(status).json({ message: status >= 500 ? "Something went wrong. Please try again." : message });
  }
}
