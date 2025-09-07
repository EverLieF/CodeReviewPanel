import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

// Настраиваем MSW worker для браузера
export const worker = setupWorker(...handlers);