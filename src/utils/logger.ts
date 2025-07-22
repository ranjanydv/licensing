import winston from 'winston';
/**
 * Simple logger utility
 */
export class Logger {
	private context: string;

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

		// Use winston for real logging
		// You may need to install winston: npm install winston

		// Create a singleton logger instance if not already created

			// Ensure a singleton winston logger instance on the Logger class
			if (!(Logger as any)._winstonLogger) {
				(Logger as any)._winstonLogger = winston.createLogger({
					level: 'info',
					format: winston.format.combine(
						winston.format.timestamp(),
						winston.format.json()
					),
					transports: [
						new winston.transports.Console()
					]
				});
			}
			const winstonLogger = (Logger as any)._winstonLogger;

			winstonLogger.log(logData);
	}
}