import winston from 'winston'

const { format, transports, createLogger} = winston;
const { combine, timestamp, label, prettyPrint } = format;

const logger = createLogger({
    level: 'info',
    format: combine(
        timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        format.errors({ stack: true }),
        format.splat(),
        format.json()
    ),
    defaultMeta: { service: 'proxy' },
    transports: [
        new transports.File({ filename: 'error.log', level: 'error' }),
        // new transports.File({ filename: 'combined.log' })
    ]
});
  
export default logger