import 'dotenv/config';

import Fastify from 'fastify';
import { type ZodTypeProvider, serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { applicationRoutes } from './routes.js';
import { AppError } from './errors.js';

const app = Fastify({ logger: true }).withTypeProvider<ZodTypeProvider>();

app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

app.setErrorHandler((error: unknown, req, reply) => {
    if (error instanceof AppError) {
        req.log.warn({
            event: 'application.rejected',
            applicationId: (req.params as Record<string, string>).id,
            status: error.statusCode,
            body: error.body,
        });
        return reply.status(error.statusCode).send(error.body);
    }
    req.log.error({ err: error }, 'unhandled error');
    return reply.status(500).send({ error: 'internal server error' });
});

app.register(applicationRoutes);

const port = parseInt(process.env.PORT ?? '3000', 10);
app.listen({ port, host: '127.0.0.1' }, (err) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
});
