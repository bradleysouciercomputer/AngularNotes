import { Injectable, signal } from '@angular/core';
import { Observable, Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly message = signal('');
  readonly actionLabel = signal('');
  private timer: ReturnType<typeof setTimeout> | null = null;
  private action = new Subject<void>();

  open(message: string, actionLabel = 'Dismiss', options: { duration?: number } = {}): { onAction: () => Observable<void> } {
    this.clearTimer();
    this.action.complete();
    const action = new Subject<void>();
    this.action = action;
    this.message.set(message);
    this.actionLabel.set(actionLabel);
    const duration = options.duration ?? 3000;
    if (duration > 0) this.timer = setTimeout(() => this.dismiss(), duration);
    return { onAction: () => action.asObservable() };
  }

  triggerAction(): void {
    this.action.next();
    this.dismiss();
  }

  dismiss(): void {
    this.clearTimer();
    this.message.set('');
    this.actionLabel.set('');
    this.action.complete();
  }

  private clearTimer(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
}
