import winston from 'winston';
/**
 * Simple logger utility
 */
export class Logger {
	private context: string;
	private static logFilePath: string | null = null;

	/**
	 * Set the log file path for this server run
	 * @param filePath Path to the log file
	 */
	static setLogFilePath(filePath: string) {
		Logger.logFilePath = filePath;
		// Reset the singleton winston logger so it uses the new file
		(Logger as any)._winstonLogger = null;
	}

	/**
	 * Create a new logger
	 * @param context Context name for the logger
	 */
	constructor(context: string) {
		this.context = context;
	}

	/**
	 * Log an informational message
	 * @param message Message to log
	 * @param meta Additional metadata
	 */
	info(message: string, meta?: Record<string, any>): void {
		this.log('info', message, meta);
	}

	/**
	 * Log a warning message
	 * @param message Message to log
	 * @param meta Additional metadata
	 */
	warn(message: string, meta?: Record<string, any>): void {
		this.log('warn', message, meta);
	}

	/**
	 * Log an error message
	 * @param message Message to log
	 * @param meta Additional metadata
	 */
	error(message: string, meta?: Record<string, any>): void {
		this.log('error', message, meta);
	}

	/**
	 * Log a debug message
	 * @param message Message to log
	 * @param meta Additional metadata
	 */
	debug(message: string, meta?: Record<string, any>): void {
		this.log('debug', message, meta);
	}

	/**
	 * Log a message with a specific level
	 * @param level Log level
	 * @param message Message to log
	 * @param meta Additional metadata
	 */
	private log(level: string, message: string, meta?: Record<string, any>): void {
		const timestamp = new Date().toISOString();
		const logData = {
			timestamp,
			level,
			context: this.context,
			message,
			...meta
		};

		// Ensure a singleton winston logger instance on the Logger class
		if (!(Logger as any)._winstonLogger) {
			// Use the base winston Transport type for the array
			const transports: winston.transport[] = [
				new winston.transports.Console()
			];
			if (Logger.logFilePath) {
				transports.push(
					new winston.transports.File({ filename: Logger.logFilePath, format: winston.format.simple() })
				);
			}
			(Logger as any)._winstonLogger = winston.createLogger({
				level: 'info',
				format: winston.format.combine(
					winston.format.timestamp(),
					winston.format.json()
				),
				transports
			});
		}
		const winstonLogger = (Logger as any)._winstonLogger;
		winstonLogger.log(logData);
	}
}