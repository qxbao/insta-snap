import { Component, ComponentOptions, createVNode, render } from 'vue';
import { createLogger } from './logger';

const logger = createLogger('ErrorBoundary');

export function withErrorBoundary<T extends Component>(component: T): ComponentOptions {
  return {
    ...component,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    errorCaptured(err: unknown, instance: any, info: string) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error('Component error:', error, info);      
      if (instance.$el) {
        const fallback = createVNode('div', {
          class: 'card p-4 bg-red-50 dark:bg-red-900/20'
        }, [
          createVNode('p', { class: 'text-red-600' }, 'Something went wrong'),
          createVNode('button', {
            class: 'mt-2 px-4 py-2 theme-btn',
            onClick: () => location.reload()
          }, 'Reload')
        ]);
        
        render(fallback, instance.$el);
      }
      
      return false;
    }
  } as ComponentOptions;
}